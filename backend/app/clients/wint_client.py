import time
from datetime import date, timedelta

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schemas.wint import AccountBalance, IncomingInvoice, Invoice


class WintClient:
    def __init__(self, username: str, password: str, base_url: str, timeout: int, bank_account: str) -> None:
        self._auth = (username, password)
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._bank_account = bank_account

    def _get(self, path: str) -> dict | list:
        url = f"{self._base_url}{path}"
        for attempt in range(2):
            try:
                resp = httpx.get(url, auth=self._auth, timeout=self._timeout)
            except httpx.RequestError as exc:
                raise HTTPException(502, f"Wint API unreachable: {exc}") from exc

            if resp.status_code < 500:
                break
            if attempt == 0:
                time.sleep(1)

        if not resp.is_success:
            raise HTTPException(502, f"Wint API returned {resp.status_code}: {resp.text[:200]}")

        return resp.json()

    @staticmethod
    def _items(data: dict | list) -> list:
        if isinstance(data, list):
            return data
        return data.get("Items") or []

    def get_invoices(self) -> list[Invoice]:
        from_date = (date.today() - timedelta(days=730)).isoformat()
        data = self._get(f"/api/Invoice?DueDateFrom={from_date}&NumPerPage=500&IsAutoPaginating=true")
        invoices = [Invoice.model_validate(item) for item in self._items(data)]
        return [inv for inv in invoices if not inv.IsTaxInvoice]

    def get_incoming_invoices(self) -> list[IncomingInvoice]:
        from_date = (date.today() - timedelta(days=730)).isoformat()
        data = self._get(
            f"/api/IncomingInvoice?PaymentDateFrom={from_date}&NumPerPage=500&IsAutoPaginating=true"
        )
        invoices = [IncomingInvoice.model_validate(item) for item in self._items(data)]
        return [
            inv for inv in invoices
            if not inv.IsTaxInvoice
            and (inv.SupplierName is None or "skatteverket" not in inv.SupplierName.lower())
        ]

    def get_account_balance(self) -> AccountBalance:
        data = self._get(f"/api/Account/AccountBalance/{self._bank_account}")
        if isinstance(data, list):
            data = data[0] if data else {}
        return AccountBalance.model_validate(data)


def get_wint_client(db: Session) -> WintClient:
    from app.services.bootstrap import get_credentials
    from app.services.app_config_service import get_wint_settings
    username, password = get_credentials()
    cfg = get_wint_settings(db)
    return WintClient(
        username=username,
        password=password,
        base_url=cfg.base_url,
        timeout=cfg.timeout,
        bank_account=cfg.bank_account,
    )
