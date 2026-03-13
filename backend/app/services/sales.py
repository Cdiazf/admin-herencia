from datetime import date
import re

from app.models.installment import Installment
from app.models.payment import Payment
from app.models.sale import Sale


def build_default_schedule(total_balance: float, installments: int) -> list[float]:
    if installments <= 0 or total_balance <= 0:
        return []

    base_amount = round(total_balance / installments, 2)
    amounts = [base_amount for _ in range(installments)]
    delta = round(total_balance - sum(amounts), 2)
    if amounts:
        amounts[-1] = round(amounts[-1] + delta, 2)
    return amounts


def build_schedule_dates(start_date: date, installments: int) -> list[date]:
    due_dates: list[date] = []
    month = start_date.month
    year = start_date.year

    for _ in range(installments):
        month += 1
        if month > 12:
            month = 1
            year += 1

        due_day = min(start_date.day, 28)
        due_dates.append(date(year, month, due_day))

    return due_dates


def build_installments(sale: Sale, start_date: date | None = None) -> list[Installment]:
    if sale.installment_count <= 0:
        return []

    schedule = build_default_schedule(
        total_balance=max(sale.agreed_amount - sale.initial_paid, 0),
        installments=sale.installment_count,
    )
    if not schedule:
        return []

    start_date = start_date or date.today()
    due_dates = build_schedule_dates(start_date, len(schedule))
    installments: list[Installment] = []

    for index, (amount, due_date) in enumerate(zip(schedule, due_dates, strict=False), start=1):
        installments.append(
            Installment(
                number=index,
                due_date=due_date,
                scheduled_amount=amount,
                paid_amount=0,
                status="pendiente",
            )
        )

    return installments


def refresh_sale_status(sale: Sale) -> None:
    sale.remaining_initial = round(max(sale.initial_required - sale.initial_paid, 0), 2)

    if sale.initial_paid >= sale.agreed_amount:
        sale.status = "pagado_total"
        return

    if sale.remaining_initial > 0:
        sale.status = "pendiente_inicial"
        return

    pending_installments = [item for item in sale.installments if item.status != "pagado"]
    sale.status = "en_cobranza" if pending_installments else "pagado_total"
    if sale.installments:
        sale.monthly_amount = sale.installments[0].scheduled_amount


def calculate_total_paid(sale: Sale) -> float:
    return round(sale.initial_paid + sum(item.paid_amount for item in sale.installments), 2)


def calculate_remaining_balance(sale: Sale) -> float:
    return round(max(sale.agreed_amount - calculate_total_paid(sale), 0), 2)


def extract_initial_allocated_amount(payment: Payment) -> float:
    return round(
        sum(amount for kind, _, amount in parse_balance_allocations(payment.notes) if kind == "initial"),
        2,
    )


def infer_installment_start_date(sale: Sale) -> date:
    if not sale.payments:
        return date.today()

    base_initial_paid = round(
        max(
            sale.initial_paid
            - sum(payment.amount for payment in sale.payments if payment.applies_to == "initial")
            - sum(extract_initial_allocated_amount(payment) for payment in sale.payments if payment.applies_to == "balance"),
            0,
        ),
        2,
    )

    if base_initial_paid >= sale.initial_required:
        return sale.payments[0].paid_at.date()

    running_initial = base_initial_paid
    for payment in sorted(sale.payments, key=lambda item: (item.paid_at, item.id or 0)):
        if payment.applies_to == "initial":
            running_initial = round(running_initial + payment.amount, 2)
        elif payment.applies_to == "balance":
            running_initial = round(running_initial + extract_initial_allocated_amount(payment), 2)

        if running_initial >= sale.initial_required:
            return payment.paid_at.date()

    return sale.payments[0].paid_at.date()


def realign_installment_schedule(sale: Sale, start_date: date | None = None) -> None:
    if not sale.installments:
        refresh_sale_status(sale)
        return

    start_date = start_date or infer_installment_start_date(sale)
    schedule = build_default_schedule(
        total_balance=max(sale.agreed_amount - sale.initial_paid, 0),
        installments=sale.installment_count,
    )
    due_dates = build_schedule_dates(start_date, len(schedule))

    for installment, amount, due_date in zip(sale.installments, schedule, due_dates, strict=False):
        installment.scheduled_amount = amount
        installment.due_date = due_date
        if installment.paid_amount == 0:
            installment.status = "pendiente"
        elif installment.paid_amount >= installment.scheduled_amount:
            installment.status = "pagado"
        else:
            installment.status = "parcial"

    refresh_sale_status(sale)


def rebuild_installments(sale: Sale, start_date: date | None = None) -> None:
    sale.installments.clear()

    if sale.initial_paid >= sale.initial_required and sale.initial_paid < sale.agreed_amount:
        sale.installments.extend(build_installments(sale, start_date=start_date))

    refresh_sale_status(sale)


def apply_payment_to_sale(sale: Sale, payment: Payment, reverse: bool = False) -> None:
    direction = -1 if reverse else 1

    if payment.applies_to == "balance":
        raise ValueError("Use apply_balance_payment for payments of type balance")

    if payment.applies_to == "installment" and payment.installment_id is not None:
        installment = next((item for item in sale.installments if item.id == payment.installment_id), None)
        if installment:
            installment.paid_amount = round(max(installment.paid_amount + (payment.amount * direction), 0), 2)
            if installment.paid_amount == 0:
                installment.status = "pendiente"
            elif installment.paid_amount >= installment.scheduled_amount:
                installment.status = "pagado"
            else:
                installment.status = "parcial"
    else:
        sale.initial_paid = round(max(sale.initial_paid + (payment.amount * direction), 0), 2)
        if sale.initial_paid >= sale.initial_required and not sale.installments and sale.initial_paid < sale.agreed_amount:
            sale.installments.extend(build_installments(sale, start_date=payment.paid_at.date()))
        if reverse and sale.initial_paid < sale.initial_required:
            sale.installments.clear()

    refresh_sale_status(sale)


def apply_balance_payment(sale: Sale, amount: float, paid_at: date | None = None) -> list[str]:
    remaining_to_apply = round(amount, 2)
    allocations: list[str] = []

    if remaining_to_apply <= 0:
        return allocations

    pending_initial = round(max(sale.initial_required - sale.initial_paid, 0), 2)
    if pending_initial > 0:
        initial_chunk = min(remaining_to_apply, pending_initial)
        sale.initial_paid = round(sale.initial_paid + initial_chunk, 2)
        remaining_to_apply = round(remaining_to_apply - initial_chunk, 2)
        if initial_chunk > 0:
            allocations.append(f"Inicial (${initial_chunk:.2f})")

        if sale.initial_paid >= sale.initial_required and not sale.installments and sale.initial_paid < sale.agreed_amount:
            sale.installments.extend(build_installments(sale, start_date=paid_at))

    for installment in sale.installments:
        if remaining_to_apply <= 0:
            break

        pending_installment = round(max(installment.scheduled_amount - installment.paid_amount, 0), 2)
        if pending_installment <= 0:
            installment.status = "pagado"
            continue

        chunk = min(remaining_to_apply, pending_installment)
        installment.paid_amount = round(installment.paid_amount + chunk, 2)
        remaining_to_apply = round(remaining_to_apply - chunk, 2)
        if chunk > 0:
            allocations.append(f"Cuota {installment.number} (${chunk:.2f})")

        if installment.paid_amount == 0:
            installment.status = "pendiente"
        elif installment.paid_amount >= installment.scheduled_amount:
            installment.status = "pagado"
        else:
            installment.status = "parcial"

    refresh_sale_status(sale)
    return allocations


def build_payment_note(allocation_note: str, user_note: str) -> str:
    user_note = user_note.strip()
    if user_note:
        return f"Aplicado a: {allocation_note} | Comentario: {user_note}"
    return f"Aplicado a: {allocation_note}"


def split_payment_note(note: str) -> tuple[str, str]:
    if not note.startswith("Aplicado a: "):
        return "", note

    body = note.replace("Aplicado a: ", "", 1)
    if " | Comentario: " in body:
        allocation_text, user_note = body.split(" | Comentario: ", 1)
        return allocation_text.strip(), user_note.strip()

    legacy_match = re.match(r"^(.*\))\. (.*)$", body)
    if legacy_match:
        return legacy_match.group(1).strip(), legacy_match.group(2).strip()

    return body.strip(), ""


def parse_balance_allocations(note: str) -> list[tuple[str, int | None, float]]:
    allocation_text, _ = split_payment_note(note)
    if not allocation_text:
        return []

    allocations: list[tuple[str, int | None, float]] = []
    for part in allocation_text.split(", "):
        initial_match = re.match(r"^Inicial \(\$(\d+(?:\.\d+)?)\)$", part)
        if initial_match:
            allocations.append(("initial", None, float(initial_match.group(1))))
            continue

        installment_match = re.match(r"^Cuota (\d+) \(\$(\d+(?:\.\d+)?)\)$", part)
        if installment_match:
            allocations.append(("installment", int(installment_match.group(1)), float(installment_match.group(2))))

    return allocations


def reverse_balance_payment(sale: Sale, payment: Payment) -> bool:
    allocations = parse_balance_allocations(payment.notes)
    if not allocations:
        return False

    for kind, number, amount in allocations:
        if kind == "initial":
            sale.initial_paid = round(max(sale.initial_paid - amount, 0), 2)
            continue

        installment = next((item for item in sale.installments if item.number == number), None)
        if installment:
            installment.paid_amount = round(max(installment.paid_amount - amount, 0), 2)
            if installment.paid_amount == 0:
                installment.status = "pendiente"
            elif installment.paid_amount >= installment.scheduled_amount:
                installment.status = "pagado"
            else:
                installment.status = "parcial"

    if sale.initial_paid < sale.initial_required and sale.installments and all(item.paid_amount == 0 for item in sale.installments):
        sale.installments.clear()

    refresh_sale_status(sale)
    return True


def rebalance_balance_payments(sale: Sale) -> None:
    balance_payments = sorted(
        [payment for payment in sale.payments if payment.applies_to == "balance"],
        key=lambda payment: (payment.paid_at, payment.id or 0),
    )

    for payment in balance_payments:
        if parse_balance_allocations(payment.notes):
            reversed_ok = reverse_balance_payment(sale, payment)
            if not reversed_ok:
                raise ValueError("No se pudo revertir un pago de cobranza para recalcularlo")

    for payment in balance_payments:
        _, user_note = split_payment_note(payment.notes)
        allocations = apply_balance_payment(sale, payment.amount, payment.paid_at.date())
        allocation_note = ", ".join(allocations) if allocations else "Sin asignacion"
        payment.notes = build_payment_note(allocation_note, user_note)
