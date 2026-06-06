import calendar
from datetime import date
from decimal import Decimal


def vat_quarter_end(posting_date: date) -> date:
    """Return the last day of the VAT quarter containing posting_date."""
    quarter_end_month = ((posting_date.month - 1) // 3 + 1) * 3
    last_day = calendar.monthrange(posting_date.year, quarter_end_month)[1]
    return date(posting_date.year, quarter_end_month, last_day)


def vat_due_date(posting_date: date) -> date:
    """Return the VAT payment due date for an invoice with the given posting date.

    Rule: 12th of the 2nd month after the quarter ends.
    Exception: if that month is August, use the 17th.

    Q1 (Jan–Mar) → quarter ends Mar 31 → due May 12
    Q2 (Apr–Jun) → quarter ends Jun 30 → due Aug 17 (August exception)
    Q3 (Jul–Sep) → quarter ends Sep 30 → due Nov 12
    Q4 (Oct–Dec) → quarter ends Dec 31 → due Feb 12 next year
    """
    quarter_end = vat_quarter_end(posting_date)
    due_month = quarter_end.month + 2
    due_year = quarter_end.year
    if due_month > 12:
        due_month -= 12
        due_year += 1
    due_day = 17 if due_month == 8 else 12
    return date(due_year, due_month, due_day)


def net_vat_by_due_date(
    outgoing_vat_total: Decimal,
    incoming_vat_total: Decimal,
    posting_date: date,
) -> tuple[date, Decimal]:
    """Return (due_date, net_vat_amount) where negative means cash outflow (we pay)."""
    due = vat_due_date(posting_date)
    # Outgoing VAT collected from customers is money we owe → outflow (negative)
    # Incoming VAT paid to suppliers reduces what we owe → offsets outgoing
    net = incoming_vat_total - outgoing_vat_total
    return due, net
