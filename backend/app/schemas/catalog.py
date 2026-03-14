from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price_total: float
    initial_required: float
    installment_count: int


class AdvisorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class AdvisorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class OriginCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class OriginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    product_id: int | None = None


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    product_id: int | None


class OriginExpenseCreate(BaseModel):
    origin_id: int
    concept: str = Field(min_length=1, max_length=160)
    amount: float = Field(gt=0)
    expense_date: date
    notes: str = Field(default="", max_length=500)


class OriginExpenseUpdate(BaseModel):
    concept: str = Field(min_length=1, max_length=160)
    amount: float = Field(gt=0)
    expense_date: date
    notes: str = Field(default="", max_length=500)


class OriginExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    origin_id: int
    concept: str
    amount: float
    expense_date: date
    notes: str
