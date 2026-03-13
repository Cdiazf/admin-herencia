from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.product import Product


DEFAULT_PRODUCTS = [
    {
        "name": "Mentor",
        "price_total": 2500,
        "initial_required": 1000,
        "installment_count": 12,
    },
    {
        "name": "Retiro",
        "price_total": 1250,
        "initial_required": 1250,
        "installment_count": 0,
    },
]

# Valores tomados de la columna B de la hoja " AGOSTO-2025".
DEFAULT_EVENTS = [
    {"name": "Mentor", "product_name": "Mentor"},
    {"name": "Mentor 11", "product_name": "Mentor"},
    {"name": "MENTOR 12", "product_name": "Mentor"},
    {"name": "MENTOR 13", "product_name": "Mentor"},
    {"name": "Mentor y Retiro", "product_name": "Mentor"},
    {"name": "Podcast", "product_name": "Mentor"},
    {"name": "Retiro", "product_name": "Retiro"},
    {"name": "Retiro Black", "product_name": "Retiro"},
]


def seed_default_products(db: Session) -> None:
    for item in DEFAULT_PRODUCTS:
        exists = db.scalar(select(Product).where(Product.name == item["name"]))
        if exists:
            exists.price_total = item["price_total"]
            exists.initial_required = item["initial_required"]
            exists.installment_count = item["installment_count"]
            continue
        db.add(Product(**item))
    db.commit()


def seed_default_events(db: Session) -> None:
    products = {
        product.name: product
        for product in db.scalars(select(Product)).all()
    }

    for item in DEFAULT_EVENTS:
        exists = db.scalar(select(Event).where(Event.name == item["name"]))
        if exists:
            continue

        product = products.get(item["product_name"])
        db.add(
            Event(
                name=item["name"],
                product_id=product.id if product else None,
            )
        )
    db.commit()
