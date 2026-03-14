from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OriginExpense(Base):
    __tablename__ = "origin_expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    origin_id: Mapped[int] = mapped_column(ForeignKey("origins.id"), index=True)
    concept: Mapped[str] = mapped_column(String(160))
    amount: Mapped[float] = mapped_column(Float)
    expense_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(String(500), default="")

    origin: Mapped["Origin"] = relationship(back_populates="expenses")
