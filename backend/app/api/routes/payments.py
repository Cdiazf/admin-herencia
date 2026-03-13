from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.payment import Payment
from app.models.sale import Sale
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentUpdate
from app.services.sales import (
    apply_payment_to_sale,
    calculate_remaining_balance,
    rebalance_balance_payments,
)


router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentResponse])
def list_payments(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Payment]:
    return db.scalars(select(Payment).order_by(Payment.paid_at.desc())).all()


@router.post("", response_model=PaymentResponse)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Payment:
    sale = db.scalar(
        select(Sale)
        .options(selectinload(Sale.installments), selectinload(Sale.payments))
        .where(Sale.id == payload.sale_id)
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    applies_to = payload.applies_to.strip().lower()
    installment = None

    if payload.amount > calculate_remaining_balance(sale):
        raise HTTPException(status_code=400, detail="El pago supera el saldo pendiente")

    if applies_to == "installment":
        if payload.installment_number is None:
            raise HTTPException(status_code=400, detail="Falta el numero de cuota")
        installment = next(
            (item for item in sale.installments if item.number == payload.installment_number),
            None,
        )
        if not installment:
            raise HTTPException(status_code=404, detail="Cuota no encontrada")
    payment = Payment(
        sale_id=sale.id,
        installment_id=installment.id if installment else None,
        applies_to=applies_to,
        amount=round(payload.amount, 2),
        currency=payload.currency,
        payment_method=payload.payment_method,
        receipt=payload.receipt,
        notes=payload.notes.strip(),
        paid_at=payload.paid_at or datetime.utcnow(),
    )
    sale.payments.append(payment)
    db.flush()

    if applies_to == "balance":
        rebalance_balance_payments(sale)
    else:
        apply_payment_to_sale(sale, payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: int,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Payment:
    payment = db.scalar(select(Payment).where(Payment.id == payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if payment.applies_to != "balance":
        raise HTTPException(status_code=400, detail="Solo se pueden editar pagos de cobranza")

    sale = db.scalar(
        select(Sale)
        .options(selectinload(Sale.installments), selectinload(Sale.payments))
        .where(Sale.id == payment.sale_id)
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    editable_limit = round(payment.amount + calculate_remaining_balance(sale), 2)
    if payload.amount > editable_limit:
        raise HTTPException(status_code=400, detail="El pago supera el saldo pendiente")

    payment.amount = round(payload.amount, 2)
    payment.payment_method = payload.payment_method
    payment.paid_at = payload.paid_at
    payment.notes = payload.notes or ""
    rebalance_balance_payments(sale)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/{payment_id}")
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> dict[str, str]:
    payment = db.scalar(select(Payment).where(Payment.id == payment_id))
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    sale = db.scalar(
        select(Sale)
        .options(selectinload(Sale.installments), selectinload(Sale.payments))
        .where(Sale.id == payment.sale_id)
    )
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if payment.applies_to == "balance":
        raise HTTPException(
            status_code=400,
            detail="No se puede revertir automaticamente un pago de saldo distribuido",
        )

    if payment.applies_to == "initial":
        remaining_initial_after_delete = round(max(sale.initial_paid - payment.amount, 0), 2)
        has_installment_payments = any(
            item.id != payment.id and item.applies_to == "installment"
            for item in sale.payments
        )
        if remaining_initial_after_delete < sale.initial_required and has_installment_payments:
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar esa inicial porque ya existen pagos de cuotas",
            )

    apply_payment_to_sale(sale, payment, reverse=True)
    db.delete(payment)
    db.commit()
    return {"message": "Pago eliminado"}
