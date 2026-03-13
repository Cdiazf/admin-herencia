from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    sale_id: int
    applies_to: str = Field(default="initial")
    installment_number: int | None = None
    amount: float = Field(gt=0)
    currency: str = "USD"
    payment_method: str = "transferencia"
    receipt: str | None = None
    notes: str = ""
    paid_at: datetime | None = None


class PaymentUpdate(BaseModel):
    amount: float = Field(gt=0)
    payment_method: str = "transferencia"
    notes: str = ""
    paid_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_id: int
    installment_id: int | None
    applies_to: str
    amount: float
    currency: str
    payment_method: str
    receipt: str | None
    notes: str
    paid_at: datetime
