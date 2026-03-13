from datetime import date

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.models.sale import Sale
from app.schemas.dashboard import (
    CollectionAlertResponse,
    CollectionDashboardResponse,
    CollectionKpiResponse,
    InitialAlertResponse,
    InitialDashboardResponse,
    InitialKpiResponse,
)
from app.services.sales import calculate_remaining_balance


def _round(amount: float) -> float:
    return round(amount, 2)


def _build_customer_name(sale: Sale) -> str:
    return " ".join(part for part in [sale.customer.first_name, sale.customer.last_name] if part).strip()


def _is_collection_sale(sale: Sale) -> bool:
    return (
        sale.remaining_initial <= 0
        and calculate_remaining_balance(sale) > 0
        and sale.status != "no_interesado"
        and bool(sale.installments)
    )


def _get_pending_installments(sale: Sale) -> list:
    return [
        item
        for item in sale.installments
        if _round(max(item.scheduled_amount - item.paid_amount, 0)) > 0
    ]


def _build_alert(sale: Sale, today: date) -> CollectionAlertResponse | None:
    pending_installments = sorted(_get_pending_installments(sale), key=lambda item: (item.due_date, item.number))
    if not pending_installments:
        return None

    next_installment = pending_installments[0]
    overdue_amount = _round(
        sum(
            max(item.scheduled_amount - item.paid_amount, 0)
            for item in pending_installments
            if item.due_date < today
        )
    )
    pending_amount = _round(max(next_installment.scheduled_amount - next_installment.paid_amount, 0))

    return CollectionAlertResponse(
        sale_id=sale.id,
        customer_name=_build_customer_name(sale),
        phone=sale.customer.phone,
        event_name=sale.event.name if sale.event else None,
        product_name=sale.product.name,
        next_due_date=next_installment.due_date,
        pending_amount=pending_amount,
        remaining_balance=_round(calculate_remaining_balance(sale)),
        overdue_amount=overdue_amount,
        days_until_due=(next_installment.due_date - today).days,
    )


def get_collection_dashboard(db: Session) -> CollectionDashboardResponse:
    today = date.today()
    sales = db.scalars(
        select(Sale)
        .options(
            selectinload(Sale.customer),
            selectinload(Sale.product),
            selectinload(Sale.event),
            selectinload(Sale.installments),
            selectinload(Sale.payments),
        )
        .order_by(Sale.id.desc())
    ).all()

    collection_sales = [sale for sale in sales if _is_collection_sale(sale)]
    alerts = [alert for sale in collection_sales if (alert := _build_alert(sale, today))]

    overdue_alerts = sorted(
        [alert for alert in alerts if alert.overdue_amount > 0],
        key=lambda alert: (alert.next_due_date, -alert.overdue_amount),
    )
    upcoming_7_days = sorted(
        [alert for alert in alerts if 0 <= alert.days_until_due <= 7],
        key=lambda alert: (alert.next_due_date, alert.customer_name.lower()),
    )
    upcoming_15_days = sorted(
        [alert for alert in alerts if 0 <= alert.days_until_due <= 15],
        key=lambda alert: (alert.next_due_date, alert.customer_name.lower()),
    )

    due_this_month_sales = set()
    due_this_month_amount = 0.0
    for sale in collection_sales:
        for installment in _get_pending_installments(sale):
            if installment.due_date.year == today.year and installment.due_date.month == today.month:
                due_this_month_sales.add(sale.id)
                due_this_month_amount += max(installment.scheduled_amount - installment.paid_amount, 0)

    collected_this_month_amount = _round(
        sum(
            payment.amount
            for sale in collection_sales
            for payment in sale.payments
            if payment.applies_to == "balance"
            and payment.paid_at.year == today.year
            and payment.paid_at.month == today.month
        )
    )

    next_payment_date = min((alert.next_due_date for alert in alerts), default=None)
    next_payment_people_count = sum(1 for alert in alerts if alert.next_due_date == next_payment_date) if next_payment_date else 0

    kpis = CollectionKpiResponse(
        active_accounts_count=len(collection_sales),
        total_portfolio_balance=_round(sum(calculate_remaining_balance(sale) for sale in collection_sales)),
        due_this_month_amount=_round(due_this_month_amount),
        due_this_month_accounts=len(due_this_month_sales),
        collected_this_month_amount=collected_this_month_amount,
        overdue_amount=_round(sum(alert.overdue_amount for alert in overdue_alerts)),
        overdue_accounts=len(overdue_alerts),
        upcoming_7_days_accounts=len(upcoming_7_days),
        upcoming_7_days_amount=_round(sum(alert.pending_amount for alert in upcoming_7_days)),
        upcoming_15_days_accounts=len(upcoming_15_days),
        upcoming_15_days_amount=_round(sum(alert.pending_amount for alert in upcoming_15_days)),
        next_payment_date=next_payment_date,
        next_payment_people_count=next_payment_people_count,
    )

    return CollectionDashboardResponse(
        kpis=kpis,
        overdue_alerts=overdue_alerts[:8],
        upcoming_7_days=upcoming_7_days[:8],
        upcoming_15_days=upcoming_15_days[:8],
    )


def get_initial_dashboard(db: Session) -> InitialDashboardResponse:
    today = date.today()
    sales = db.scalars(
        select(Sale)
        .options(
            selectinload(Sale.customer),
            selectinload(Sale.advisor),
            selectinload(Sale.product),
            selectinload(Sale.event),
            selectinload(Sale.payments),
        )
        .order_by(Sale.id.desc())
    ).all()

    initial_sales = [
        sale
        for sale in sales
        if sale.remaining_initial > 0 and sale.status != "no_interesado"
    ]

    def build_initial_alert(sale: Sale) -> InitialAlertResponse:
        progress_percent = round((sale.initial_paid / sale.initial_required) * 100, 2) if sale.initial_required else 0
        return InitialAlertResponse(
            sale_id=sale.id,
            customer_name=_build_customer_name(sale),
            phone=sale.customer.phone,
            advisor_name=sale.advisor.name,
            event_name=sale.event.name if sale.event else None,
            product_name=sale.product.name,
            initial_required=_round(sale.initial_required),
            initial_paid=_round(sale.initial_paid),
            remaining_initial=_round(sale.remaining_initial),
            progress_percent=progress_percent,
        )

    partial_accounts = [build_initial_alert(sale) for sale in initial_sales if sale.initial_paid > 0]
    no_payment_accounts = [build_initial_alert(sale) for sale in initial_sales if sale.initial_paid <= 0]
    highest_pending_accounts = sorted(
        [build_initial_alert(sale) for sale in initial_sales],
        key=lambda item: (-item.remaining_initial, item.customer_name.lower()),
    )

    collected_initial_this_month_amount = _round(
        sum(
            payment.amount
            for sale in sales
            for payment in sale.payments
            if payment.applies_to == "initial"
            and payment.paid_at.year == today.year
            and payment.paid_at.month == today.month
        )
    )

    collected_initial_total_amount = _round(sum(sale.initial_paid for sale in sales))
    pending_amounts = [_round(sale.remaining_initial) for sale in initial_sales]
    kpis = InitialKpiResponse(
        pending_accounts_count=len(initial_sales),
        total_initial_pending_amount=_round(sum(pending_amounts)),
        partial_initial_accounts_count=len(partial_accounts),
        partial_initial_amount=_round(sum(item.remaining_initial for item in partial_accounts)),
        no_initial_payment_accounts_count=len(no_payment_accounts),
        no_initial_payment_amount=_round(sum(item.remaining_initial for item in no_payment_accounts)),
        collected_initial_this_month_amount=collected_initial_this_month_amount,
        collected_initial_total_amount=collected_initial_total_amount,
        average_initial_ticket=_round(collected_initial_total_amount / len(sales)) if sales else 0,
        highest_initial_pending_amount=max(pending_amounts, default=0),
    )

    return InitialDashboardResponse(
        kpis=kpis,
        partial_accounts=sorted(partial_accounts, key=lambda item: (-item.progress_percent, item.customer_name.lower()))[:8],
        no_payment_accounts=sorted(no_payment_accounts, key=lambda item: item.customer_name.lower())[:8],
        highest_pending_accounts=highest_pending_accounts[:8],
    )
