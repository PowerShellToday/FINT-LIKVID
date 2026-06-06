import logging
from datetime import date, timedelta

import httpx

logger = logging.getLogger(__name__)

_holiday_cache: dict[int, set[date]] = {}
_holiday_names_cache: dict[int, dict[date, str]] = {}


def get_se_holidays(year: int) -> set[date]:
    if year not in _holiday_cache:
        try:
            r = httpx.get(
                f"https://date.nager.at/api/v3/publicholidays/{year}/SE",
                timeout=5,
            )
            if r.is_success:
                data = r.json()
                _holiday_cache[year] = {date.fromisoformat(h["date"]) for h in data}
                _holiday_names_cache[year] = {
                    date.fromisoformat(h["date"]): h.get("localName") or h.get("name", "")
                    for h in data
                }
            else:
                logger.warning("Holiday API returned %s for year %d", r.status_code, year)
                _holiday_cache[year] = set()
                _holiday_names_cache[year] = {}
        except Exception as exc:
            logger.warning("Could not fetch SE holidays for %d: %s", year, exc)
            _holiday_cache[year] = set()
            _holiday_names_cache[year] = {}
    return _holiday_cache[year]


def get_se_holiday_names(year: int) -> dict[date, str]:
    get_se_holidays(year)  # ensures both caches are populated
    return _holiday_names_cache.get(year, {})


def _is_working_day(d: date) -> bool:
    if d.weekday() >= 5:  # Saturday or Sunday
        return False
    holidays = get_se_holidays(d.year)
    return d not in holidays


def compute_invoice_date(plan_month: date, rule: str) -> date:
    year, month = plan_month.year, plan_month.month

    if rule in ("last_day", "last_working_day"):
        # Last day of plan_month
        if month == 12:
            last = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last = date(year, month + 1, 1) - timedelta(days=1)

        if rule == "last_day":
            return last

        # Walk backwards to find last working day
        d = last
        while not _is_working_day(d):
            d -= timedelta(days=1)
        return d

    elif rule in ("first_day_next_month", "first_working_day_next_month"):
        if month == 12:
            first = date(year + 1, 1, 1)
        else:
            first = date(year, month + 1, 1)

        if rule == "first_day_next_month":
            return first

        # Walk forwards to find first working day
        d = first
        while not _is_working_day(d):
            d += timedelta(days=1)
        return d

    # Fallback: last calendar day
    if month == 12:
        return date(year + 1, 1, 1) - timedelta(days=1)
    return date(year, month + 1, 1) - timedelta(days=1)
