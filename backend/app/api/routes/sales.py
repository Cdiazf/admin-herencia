from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.advisor import Advisor
from app.models.customer import Customer
from app.models.event import Event
from app.models.payment import Payment
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse, SaleUpdate
from app.services.sales import calculate_remaining_balance, calculate_total_paid, rebuild_installments


router = APIRouter(prefix="/sales", tags=["sales"])


def _serialize_sale(sale: Sale) -> SaleResponse:
    customer_name = " ".join(part for part in [sale.customer.first_name, sale.customer.last_name] if part).strip()
    return SaleResponse(
        id=sale.id,
        first_name=sale.customer.first_name,
        last_name=sale.customer.last_name,
        customer_name=customer_name,
        phone=sale.customer.phone,
        email=sale.customer.email,
        advisor_name=sale.advisor.name,
        product_name=sale.product.name,
        event_name=sale.event.name if sale.event else None,
        origin=sale.origin,
        agreed_amount=sale.agreed_amount,
        discount=sale.discount,
        initial_required=sale.initial_required,
        initial_paid=sale.initial_paid,
        remaining_initial=sale.remaining_initial,
        installment_count=sale.installment_count,
        monthly_amount=sale.monthly_amount,
        total_paid=calculate_total_paid(sale),
        remaining_balance=calculate_remaining_balance(sale),
        status=sale.status,
        comments=sale.comments,
        installments=sale.installments,
    )


def _get_or_create_customer(db: Session, payload: SaleCreate) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.phone == payload.phone))
    if customer:
        customer.first_name = payload.first_name
        customer.last_name = payload.last_name
        customer.email = payload.email
        return customer

    customer = Customer(
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        email=payload.email,
    )
    db.add(customer)
    db.flush()
    return customer


def _get_or_create_advisor(db: Session, name: str) -> Advisor:
    advisor = db.scalar(select(Advisor).where(Advisor.name == name))
    if advisor:
        return advisor

    advisor = Advisor(name=name)
    db.add(advisor)
    db.flush()
    return advisor


def _get_or_create_product(db: Session, payload: SaleCreate) -> Product:
    product = db.scalar(select(Product).where(Product.name == payload.product_name))
    if product:
        return product

    product = Product(
        name=payload.product_name,
        price_total=payload.product_price_total,
        initial_required=payload.initial_required,
        installment_count=payload.installment_count,
    )
    db.add(product)
    db.flush()
    return product


def _get_or_create_event(db: Session, name: str | None, product_id: int) -> Event | None:
    if not name:
        return None

    event = db.scalar(select(Event).where(Event.name == name))
    if event:
        return event

    event = Event(name=name, product_id=product_id)
    db.add(event)
    db.flush()
    return event


def _load_sale(db: Session, sale_id: int) -> Sale | None:
    return db.scalar(
        select(Sale)
        .options(
            selectinload(Sale.customer),
            selectinload(Sale.advisor),
            selectinload(Sale.product),
            selectinload(Sale.event),
            selectinload(Sale.installments),
            selectinload(Sale.payments),
        )
        .where(Sale.id == sale_id)
    )


def _save_sale_from_payload(db: Session, sale: Sale | None, payload: SaleCreate | SaleUpdate) -> Sale:
    customer = _get_or_create_customer(db, payload)
    advisor = _get_or_create_advisor(db, payload.advisor_name.strip())
    product = _get_or_create_product(db, payload)
    event = _get_or_create_event(db, payload.event_name, product.id)

    discount = round(payload.discount, 2)
    base_price = round(product.price_total, 2)
    agreed_amount = round(max(base_price - discount, 0), 2)
    initial_required = round(product.initial_required, 2)
    installment_count = product.installment_count

    if product.name.lower() == "retiro":
        initial_required = agreed_amount
        installment_count = 0

    initial_paid = round(min(payload.initial_paid, initial_required), 2)

    if sale is None:
        sale = Sale(
            customer_id=customer.id,
            advisor_id=advisor.id,
            product_id=product.id,
            event_id=event.id if event else None,
            origin=payload.origin.strip(),
            agreed_amount=agreed_amount,
            discount=discount,
            initial_required=initial_required,
            initial_paid=initial_paid,
            remaining_initial=max(initial_required - initial_paid, 0),
            installment_count=installment_count,
            monthly_amount=0,
            status="pendiente_inicial",
            comments=payload.comments.strip(),
        )
        db.add(sale)
        db.flush()
        rebuild_installments(sale)
        return sale

    if sale.payments:
        raise HTTPException(
            status_code=400,
            detail="No se puede editar una venta que ya tiene pagos registrados",
        )

    sale.customer_id = customer.id
    sale.advisor_id = advisor.id
    sale.product_id = product.id
    sale.event_id = event.id if event else None
    sale.origin = payload.origin.strip()
    sale.agreed_amount = agreed_amount
    sale.discount = discount
    sale.initial_required = initial_required
    sale.initial_paid = initial_paid
    sale.installment_count = installment_count
    sale.comments = payload.comments.strip()

    rebuild_installments(sale)
    return sale


@router.get("", response_model=list[SaleResponse])
def list_sales(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[SaleResponse]:
    sales = db.scalars(
        select(Sale)
        .options(
            selectinload(Sale.customer),
            selectinload(Sale.advisor),
            selectinload(Sale.product),
            selectinload(Sale.event),
            selectinload(Sale.installments),
        )
        .order_by(Sale.id.desc())
    ).all()
    return [_serialize_sale(sale) for sale in sales]


@router.post("", response_model=SaleResponse)
def create_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = _save_sale_from_payload(db, None, payload)
    db.commit()

    saved_sale = _load_sale(db, sale.id)
    return _serialize_sale(saved_sale)


@router.put("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    payload: SaleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = _load_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    sale = _save_sale_from_payload(db, sale, payload)
    db.commit()
    saved_sale = _load_sale(db, sale.id)
    return _serialize_sale(saved_sale)


@router.post("/{sale_id}/mark-not-interested", response_model=SaleResponse)
def mark_sale_not_interested(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SaleResponse:
    sale = _load_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.initial_paid <= 0 or sale.remaining_initial <= 0:
        raise HTTPException(
            status_code=400,
            detail="Solo se puede marcar como no interesado si hay pago parcial de inicial",
        )

    sale.status = "no_interesado"
    db.commit()
    saved_sale = _load_sale(db, sale.id)
    return _serialize_sale(saved_sale)


@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> dict[str, str]:
    sale = _load_sale(db, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if sale.payments:
        raise HTTPException(status_code=400, detail="No se puede eliminar una venta con pagos registrados")

    db.delete(sale)
    db.commit()
    return {"message": "Venta eliminada"}
