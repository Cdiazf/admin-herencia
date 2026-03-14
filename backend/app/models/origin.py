from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Origin(Base):
    __tablename__ = "origins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    expenses: Mapped[list["OriginExpense"]] = relationship(
        back_populates="origin",
        cascade="all, delete-orphan",
        order_by="OriginExpense.expense_date.desc()",
    )
