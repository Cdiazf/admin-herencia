from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    advisor_id: Mapped[int] = mapped_column(ForeignKey("advisors.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), nullable=True)
    origin: Mapped[str] = mapped_column(String(100), default="")
    agreed_amount: Mapped[float] = mapped_column(Float)
    discount: Mapped[float] = mapped_column(Float, default=0)
    initial_required: Mapped[float] = mapped_column(Float)
    initial_paid: Mapped[float] = mapped_column(Float, default=0)
    remaining_initial: Mapped[float] = mapped_column(Float, default=0)
    installment_count: Mapped[int] = mapped_column(Integer, default=12)
    monthly_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(50), default="pendiente_inicial")
    comments: Mapped[str] = mapped_column(String(500), default="")

    customer: Mapped["Customer"] = relationship(back_populates="sales")
    advisor: Mapped["Advisor"] = relationship(back_populates="sales")
    product: Mapped["Product"] = relationship(back_populates="sales")
    event: Mapped["Event | None"] = relationship(back_populates="sales")
    installments: Mapped[list["Installment"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="Installment.number",
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
        order_by="Payment.paid_at",
    )

