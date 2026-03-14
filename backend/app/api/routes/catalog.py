from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.advisor import Advisor
from app.models.event import Event
from app.models.origin import Origin
from app.models.origin_expense import OriginExpense
from app.models.product import Product
from app.models.user import User
from app.schemas.catalog import (
    AdvisorCreate,
    AdvisorResponse,
    EventCreate,
    EventResponse,
    OriginCreate,
    OriginExpenseCreate,
    OriginExpenseResponse,
    OriginExpenseUpdate,
    OriginResponse,
    ProductResponse,
)


router = APIRouter(tags=["catalog"])


@router.get("/products", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Product]:
    return db.scalars(select(Product).order_by(Product.name.asc())).all()


@router.get("/advisors", response_model=list[AdvisorResponse])
def list_advisors(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Advisor]:
    return db.scalars(select(Advisor).order_by(Advisor.name.asc())).all()


@router.post("/advisors", response_model=AdvisorResponse)
def create_advisor(
    payload: AdvisorCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> Advisor:
    existing = db.scalar(select(Advisor).where(Advisor.name == payload.name.strip()))
    if existing:
        raise HTTPException(status_code=400, detail="Ese vendedor ya existe")

    advisor = Advisor(name=payload.name.strip())
    db.add(advisor)
    db.commit()
    db.refresh(advisor)
    return advisor


@router.get("/origins", response_model=list[OriginResponse])
def list_origins(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Origin]:
    return db.scalars(select(Origin).order_by(Origin.name.asc())).all()


@router.post("/origins", response_model=OriginResponse)
def create_origin(
    payload: OriginCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> Origin:
    existing = db.scalar(select(Origin).where(Origin.name == payload.name.strip()))
    if existing:
        raise HTTPException(status_code=400, detail="Ese origen ya existe")

    origin = Origin(name=payload.name.strip())
    db.add(origin)
    db.commit()
    db.refresh(origin)
    return origin


@router.get("/events", response_model=list[EventResponse])
def list_events(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[Event]:
    return db.scalars(select(Event).order_by(Event.name.asc())).all()


@router.post("/events", response_model=EventResponse)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> Event:
    product = None
    if payload.product_id is not None:
        product = db.scalar(select(Product).where(Product.id == payload.product_id))
        if not product:
            raise HTTPException(status_code=404, detail="Producto no encontrado")

    existing = db.scalar(select(Event).where(Event.name == payload.name.strip()))
    if existing:
        raise HTTPException(status_code=400, detail="Ese evento ya existe")

    event = Event(
        name=payload.name.strip(),
        product_id=product.id if product else None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/origin-expenses", response_model=list[OriginExpenseResponse])
def list_origin_expenses(
    origin_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[OriginExpense]:
    query = select(OriginExpense).order_by(OriginExpense.expense_date.desc(), OriginExpense.id.desc())
    if origin_id is not None:
        query = query.where(OriginExpense.origin_id == origin_id)
    return db.scalars(query).all()


@router.post("/origin-expenses", response_model=OriginExpenseResponse)
def create_origin_expense(
    payload: OriginExpenseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> OriginExpense:
    origin = db.scalar(select(Origin).where(Origin.id == payload.origin_id))
    if not origin:
        raise HTTPException(status_code=404, detail="Conferencia no encontrada")

    expense = OriginExpense(
        origin_id=payload.origin_id,
        concept=payload.concept.strip(),
        amount=round(payload.amount, 2),
        expense_date=payload.expense_date,
        notes=payload.notes.strip(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/origin-expenses/{expense_id}", response_model=OriginExpenseResponse)
def update_origin_expense(
    expense_id: int,
    payload: OriginExpenseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> OriginExpense:
    expense = db.scalar(select(OriginExpense).where(OriginExpense.id == expense_id))
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    expense.concept = payload.concept.strip()
    expense.amount = round(payload.amount, 2)
    expense.expense_date = payload.expense_date
    expense.notes = payload.notes.strip()
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/origin-expenses/{expense_id}")
def delete_origin_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
) -> dict[str, str]:
    expense = db.scalar(select(OriginExpense).where(OriginExpense.id == expense_id))
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    db.delete(expense)
    db.commit()
    return {"message": "Gasto eliminado"}
