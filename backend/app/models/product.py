from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    price_total: Mapped[float] = mapped_column(Float, default=2500)
    initial_required: Mapped[float] = mapped_column(Float, default=1000)
    installment_count: Mapped[int] = mapped_column(Integer, default=12)

    events: Mapped[list["Event"]] = relationship(back_populates="product")
    sales: Mapped[list["Sale"]] = relationship(back_populates="product")

