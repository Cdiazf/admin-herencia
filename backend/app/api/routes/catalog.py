from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.advisor import Advisor
from app.models.event import Event
from app.models.origin import Origin
from app.models.product import Product
from app.models.user import User
from app.schemas.catalog import (
    AdvisorCreate,
    AdvisorResponse,
    EventCreate,
    EventResponse,
    OriginCreate,
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
