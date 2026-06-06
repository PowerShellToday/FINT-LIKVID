from datetime import date

import pytest

from app.services.vat import vat_due_date, vat_quarter_end


@pytest.mark.parametrize("posting_date,expected_quarter_end", [
    (date(2025, 1, 1),  date(2025, 3, 31)),   # Q1 start
    (date(2025, 3, 31), date(2025, 3, 31)),   # Q1 end
    (date(2025, 4, 1),  date(2025, 6, 30)),   # Q2 start
    (date(2025, 6, 30), date(2025, 6, 30)),   # Q2 end
    (date(2025, 7, 1),  date(2025, 9, 30)),   # Q3 start
    (date(2025, 9, 30), date(2025, 9, 30)),   # Q3 end
    (date(2025, 10, 1), date(2025, 12, 31)),  # Q4 start
    (date(2025, 12, 31), date(2025, 12, 31)), # Q4 end
])
def test_vat_quarter_end(posting_date, expected_quarter_end):
    assert vat_quarter_end(posting_date) == expected_quarter_end


@pytest.mark.parametrize("posting_date,expected_due", [
    # Q1 (Jan–Mar) → due May 12
    (date(2025, 1, 15), date(2025, 5, 12)),
    (date(2025, 3, 31), date(2025, 5, 12)),
    # Q2 (Apr–Jun) → due Aug 17 (August exception)
    (date(2025, 4, 1),  date(2025, 8, 17)),
    (date(2025, 6, 30), date(2025, 8, 17)),
    # Q3 (Jul–Sep) → due Nov 12
    (date(2025, 7, 1),  date(2025, 11, 12)),
    (date(2025, 9, 30), date(2025, 11, 12)),
    # Q4 (Oct–Dec) → due Feb 12 next year
    (date(2025, 10, 1),  date(2026, 2, 12)),
    (date(2025, 12, 31), date(2026, 2, 12)),
])
def test_vat_due_date(posting_date, expected_due):
    assert vat_due_date(posting_date) == expected_due


def test_august_exception():
    """Q2 invoices must always land on Aug 17, not Aug 12."""
    result = vat_due_date(date(2025, 5, 15))
    assert result == date(2025, 8, 17)
    assert result.day == 17
