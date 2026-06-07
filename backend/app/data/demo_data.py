"""
Demo data for Fint Likvid demo mode.

All date-bearing values are factory functions so dates are always relative to
date.today() when called — the demo stays perpetually current no matter when
it's loaded.
"""
import calendar
from datetime import date, timedelta


def _add_months(d: date, n: int) -> date:
    total = d.month - 1 + n
    year = d.year + total // 12
    month = total % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _last_day(d: date) -> date:
    return d.replace(day=calendar.monthrange(d.year, d.month)[1])


# ── Wint API cache payloads ────────────────────────────────────────────────────

def build_demo_invoices() -> list[dict]:
    """Outgoing invoices we've sent to customers. LeftToPay > 0 = unpaid."""
    t = date.today()
    return [
        {
            "Id": 1001,
            "SerialNumber": "2026-042",
            "OcrText": "10010042",
            "Status": "1",
            "PostingDate": str(t - timedelta(days=30)),
            "DueDate": str(t + timedelta(days=15)),
            "TotalAmount": "18750.00",
            "TotalTax": "3750.00",
            "LeftToPay": "18750.00",
            "IsTaxInvoice": False,
            "CustomerName": "Kaffebolaget Syd AB",
        },
        {
            "Id": 1002,
            "SerialNumber": "2026-043",
            "OcrText": "10010043",
            "Status": "1",
            "PostingDate": str(t - timedelta(days=20)),
            "DueDate": str(t + timedelta(days=25)),
            "TotalAmount": "37500.00",
            "TotalTax": "7500.00",
            "LeftToPay": "37500.00",
            "IsTaxInvoice": False,
            "CustomerName": "Digitalsverige & Partners",
        },
        {
            "Id": 1000,
            "SerialNumber": "2026-038",
            "OcrText": "10010038",
            "Status": "3",
            "PostingDate": str(t - timedelta(days=75)),
            "DueDate": str(t - timedelta(days=45)),
            "TotalAmount": "25000.00",
            "TotalTax": "5000.00",
            "LeftToPay": "0.00",
            "IsTaxInvoice": False,
            "CustomerName": "Kaffebolaget Syd AB",
        },
    ]


def build_demo_incoming_invoices() -> list[dict]:
    """Supplier invoices we pay. PaymentDate set = already paid."""
    t = date.today()
    m1 = _add_months(t, -1)   # one month ago
    m2 = _add_months(t, -2)   # two months ago
    m3 = _add_months(t, -3)   # three months ago
    return [
        # Telefonbolaget — paid last month
        {
            "Id": 2001,
            "SupplierName": "Telefonbolaget",
            "InvoiceDate": str(m1 - timedelta(days=5)),
            "DueDate": str(m1 + timedelta(days=25)),
            "PaymentDate": str(m1 + timedelta(days=20)),
            "Amount": "895.00",
            "Tax": "179.00",
            "AmountExcludingTax": "716.00",
            "IsTaxInvoice": False,
        },
        # Telefonbolaget — due next month (unpaid)
        {
            "Id": 2002,
            "SupplierName": "Telefonbolaget",
            "InvoiceDate": str(t - timedelta(days=3)),
            "DueDate": str(t + timedelta(days=27)),
            "PaymentDate": None,
            "Amount": "895.00",
            "Tax": "179.00",
            "AmountExcludingTax": "716.00",
            "IsTaxInvoice": False,
        },
        # Kontorsplaneten AB — paid last month
        {
            "Id": 2003,
            "SupplierName": "Kontorsplaneten AB",
            "InvoiceDate": str(m1 - timedelta(days=3)),
            "DueDate": str(m1 + timedelta(days=27)),
            "PaymentDate": str(m1 + timedelta(days=25)),
            "Amount": "12500.00",
            "Tax": "2500.00",
            "AmountExcludingTax": "10000.00",
            "IsTaxInvoice": False,
        },
        # Kontorsplaneten AB — due next month (unpaid)
        {
            "Id": 2004,
            "SupplierName": "Kontorsplaneten AB",
            "InvoiceDate": str(t - timedelta(days=2)),
            "DueDate": str(t + timedelta(days=28)),
            "PaymentDate": None,
            "Amount": "12500.00",
            "Tax": "2500.00",
            "AmountExcludingTax": "10000.00",
            "IsTaxInvoice": False,
        },
        # Försäkringar och Förskingring AB — paid 2 months ago (quarterly, VAT-exempt)
        {
            "Id": 2005,
            "SupplierName": "Försäkringar och Förskingring AB",
            "InvoiceDate": str(m2 - timedelta(days=5)),
            "DueDate": str(m2 + timedelta(days=25)),
            "PaymentDate": str(m2 + timedelta(days=22)),
            "Amount": "4800.00",
            "Tax": "0.00",
            "AmountExcludingTax": "4800.00",
            "IsTaxInvoice": False,
        },
        # El & Belysning i Norr AB — paid last quarter
        {
            "Id": 2006,
            "SupplierName": "El & Belysning i Norr AB",
            "InvoiceDate": str(m3 - timedelta(days=10)),
            "DueDate": str(m3 + timedelta(days=20)),
            "PaymentDate": str(m3 + timedelta(days=18)),
            "Amount": "2340.00",
            "Tax": "468.00",
            "AmountExcludingTax": "1872.00",
            "IsTaxInvoice": False,
        },
    ]


def build_demo_account_balance() -> dict:
    return {"Balance": "287450.00"}


# ── Settings — static data (no date dependency) ────────────────────────────────

DEMO_SALARY = {
    "net_monthly_amount": "45000.00",
    "effective_from": "2026-01-01",
}

DEMO_TAX_SOCIAL = {
    "net_monthly_amount": "21600.00",
    "effective_from": "2026-01-01",
}

DEMO_RECURRING = [
    {
        "supplier_name": "Telefonbolaget",
        "interval_months": 1,
        "override_total": "895.00",
        "override_vat": "179.00",
        "match_amount": None,
        "enabled": True,
    },
    {
        "supplier_name": "Kontorsplaneten AB",
        "interval_months": 1,
        "override_total": "12500.00",
        "override_vat": "2500.00",
        "match_amount": None,
        "enabled": True,
    },
    {
        "supplier_name": "Försäkringar och Förskingring AB",
        "interval_months": 3,
        "override_total": None,
        "override_vat": None,
        "match_amount": "4800.00",
        "enabled": True,
    },
]

DEMO_INVOICE_CUSTOMER = {
    "name": "Kaffebolaget Syd AB",
    "hourly_rate": "1500.00",
    "payment_delay_days": 30,
    "invoice_day_rule": "last_day",
}


def build_demo_future_invoice_plans() -> list[dict]:
    """3 upcoming months of planned invoices for Kaffebolaget Syd AB."""
    t = date.today()
    plans = []
    for i in range(1, 4):
        pm_first = _add_months(t.replace(day=1), i)
        inv_date = _last_day(pm_first)
        plans.append({
            "plan_month": str(pm_first),
            "billable_hours": "120.00",
            "hourly_rate": "1500.00",
            "invoice_date": str(inv_date),
            "payment_delay_days": 30,
            "customer_name": "Kaffebolaget Syd AB",
            "day_fractions": None,
        })
    return plans


def build_demo_one_off_expenses() -> list[dict]:
    t = date.today()
    return [
        {
            "label": "Nytt skrivbord till kontoret",
            "amount": "8500.00",
            "planned_date": str(t + timedelta(days=45)),
        }
    ]


def build_demo_periodic_expenses() -> list[dict]:
    t = date.today()
    # Start on the 15th of this month (or next if we've passed it)
    if t.day <= 15:
        start = t.replace(day=15)
    else:
        start = _add_months(t, 1).replace(day=15)
    return [
        {
            "label": "Bokföringstjänsten",
            "amount": "1200.00",
            "recurrence_type": "monthly",
            "interval_days": None,
            "day_of_month": 15,
            "start_date": str(start),
            "end_date": None,
        }
    ]
