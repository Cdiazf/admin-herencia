from datetime import datetime

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    installment_id: Mapped[int | None] = mapped_column(ForeignKey("installments.id"), nullable=True)
    applies_to: Mapped[str] = mapped_column(String(30), default="initial")
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    payment_method: Mapped[str] = mapped_column(String(50), default="transferencia")
    receipt: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str] = mapped_column(String(500), default="")
    paid_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    sale: Mapped["Sale"] = relationship(back_populates="payments")
    installment: Mapped["Installment | None"] = relationship(back_populates="payments")

