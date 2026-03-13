"""Database models."""

from app.models.advisor import Advisor
from app.models.customer import Customer
from app.models.event import Event
from app.models.installment import Installment
from app.models.origin import Origin
from app.models.payment import Payment
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User

__all__ = [
    "Advisor",
    "Customer",
    "Event",
    "Installment",
    "Origin",
    "Payment",
    "Product",
    "Sale",
    "User",
]
