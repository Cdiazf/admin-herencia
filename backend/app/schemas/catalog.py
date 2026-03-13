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
