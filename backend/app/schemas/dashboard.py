from datetime import date

from pydantic import BaseModel


class CollectionKpiResponse(BaseModel):
    active_accounts_count: int
    total_portfolio_balance: float
    due_this_month_amount: float
    due_this_month_accounts: int
    collected_this_month_amount: float
    overdue_amount: float
    overdue_accounts: int
    upcoming_7_days_accounts: int
    upcoming_7_days_amount: float
    upcoming_15_days_accounts: int
    upcoming_15_days_amount: float
    next_payment_date: date | None
    next_payment_people_count: int


class CollectionAlertResponse(BaseModel):
    sale_id: int
    customer_name: str
    phone: str
    event_name: str | None
    product_name: str
    next_due_date: date
    pending_amount: float
    remaining_balance: float
    overdue_amount: float
    days_until_due: int


class CollectionDashboardResponse(BaseModel):
    kpis: CollectionKpiResponse
    overdue_alerts: list[CollectionAlertResponse]
    upcoming_7_days: list[CollectionAlertResponse]
    upcoming_15_days: list[CollectionAlertResponse]


class InitialKpiResponse(BaseModel):
    pending_accounts_count: int
    total_initial_pending_amount: float
    partial_initial_accounts_count: int
    partial_initial_amount: float
    no_initial_payment_accounts_count: int
    no_initial_payment_amount: float
    collected_initial_this_month_amount: float
    collected_initial_total_amount: float
    average_initial_ticket: float
    highest_initial_pending_amount: float


class InitialAlertResponse(BaseModel):
    sale_id: int
    customer_name: str
    phone: str
    advisor_name: str
    event_name: str | None
    product_name: str
    initial_required: float
    initial_paid: float
    remaining_initial: float
    progress_percent: float


class InitialDashboardResponse(BaseModel):
    kpis: InitialKpiResponse
    partial_accounts: list[InitialAlertResponse]
    no_payment_accounts: list[InitialAlertResponse]
    highest_pending_accounts: list[InitialAlertResponse]
