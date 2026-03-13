from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class InstallmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: int
    due_date: date
    scheduled_amount: float
    paid_amount: float
    status: str


class SaleCreate(BaseModel):
    first_name: str
    last_name: str = ""
    phone: str
    email: EmailStr | None = None
    advisor_name: str
    product_name: str = "Mentor"
    product_price_total: float = 2500
    initial_required: float = 1000
    installment_count: int = Field(default=12, ge=0, le=48)
    event_name: str | None = None
    origin: str = ""
    agreed_amount: float | None = None
    discount: float = 0
    initial_paid: float = Field(default=0, ge=0)
    comments: str = ""


class SaleUpdate(SaleCreate):
    pass


class SaleResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    customer_name: str
    phone: str
    email: str | None
    advisor_name: str
    product_name: str
    event_name: str | None
    origin: str
    agreed_amount: float
    discount: float
    initial_required: float
    initial_paid: float
    remaining_initial: float
    installment_count: int
    monthly_amount: float
    total_paid: float
    remaining_balance: float
    status: str
    comments: str
    installments: list[InstallmentResponse]
