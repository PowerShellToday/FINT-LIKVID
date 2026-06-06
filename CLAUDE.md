# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fint Likvid** is a self-hosted cash flow forecasting web app for [Wint (Superkollagen)](https://www.wint.se) accounting customers. It shows actual and forecasted cash flows for the next 6–24 months, integrating with the Wint REST API. Targets Swedish finance/operations teams with Swedish tax timing rules (VAT, salary, social fees).

**Design intent:** a single Docker Compose command brings up the entire stack. A setup wizard collects credentials on first run. No manual database setup, no manual migration steps.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 19 + TypeScript + shadcn/ui (Tailwind v4) |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL 16 |
| Migrations | Alembic (auto-runs on startup) |
| Reverse proxy | nginx (serves frontend + proxies `/api/`) |
| Encryption | Python `cryptography` — Fernet symmetric encryption |
| Scheduling | APScheduler (background cache refresh) |
| Auth | Basic Auth to Wint API; optional password protection for the app itself |

## Development Commands

### Full stack

```bash
cp .env.example .env           # fill in POSTGRES_PASSWORD and Wint credentials
docker compose up --build
# App at http://localhost — setup wizard on first run
```

### Iterative backend development

```bash
# Start only the DB
docker compose up db -d

# Generate encryption key (one time)
python -c "from cryptography.fernet import Fernet; import json; open('data/config.json','w').write(json.dumps({'encryption_key': Fernet.generate_key().decode()}))"

# Run backend locally
cd backend
POSTGRES_HOST=localhost POSTGRES_PORT=5432 \
POSTGRES_DB=wintstatus POSTGRES_USER=wintstatus POSTGRES_PASSWORD=<your-pw> \
CONFIG_PATH=../data/config.json APP_ENV=development \
uvicorn app.main:app --reload --port 8000
```

### Frontend development

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, /api/ proxied to localhost:8000
```

### Tests

```bash
cd backend
python -m pytest tests/                          # all tests
python -m pytest tests/test_vat.py              # single file
python -m pytest tests/test_vat.py::test_vat_due_date  # single test
```

### Rebuild backend after Python changes

```bash
docker compose up -d --build backend
```

### New Alembic migration after changing a model

```bash
cd backend
alembic revision --autogenerate -m "describe_the_change"
# Review the generated file in alembic/versions/ before committing
```

## Architecture

### Startup & credential bootstrap

`backend/app/main.py` lifespan runs Alembic migrations, then checks `app_config_service.is_setup_complete()`. If setup is complete and not in demo mode, `bootstrap.py` loads Wint credentials from the DB (decrypted with the Fernet key). If demo mode is active, `demo_service.py` seeds the cache tables with date-relative fixture data instead of calling the live API.

On first-ever startup: `entrypoint.sh` generates `./data/config.json` with a fresh Fernet key, then the setup wizard (POST `/api/setup/...`) guides credential collection. **Back up `./data/config.json`** — losing it means DB credentials cannot be decrypted.

### Data caching

`cache_service.py` fetches from the Wint API and stores responses in PostgreSQL (`invoices`, `incoming_invoices`, `account_balance`). Cache refreshes on startup and every `CACHE_REFRESH_INTERVAL_HOURS` via APScheduler. `POST /api/cache/refresh` triggers a manual refresh. The forecast engine reads exclusively from this cache — returns `503` if the cache is empty.

### Forecast engine

`backend/app/services/forecast.py` — builds the forecast from cached data.

**Swedish pay date rules:**
- Salary: 25th of each month (`_salary_pay_day()`)
- Tax & social fees: 12th of each month, 17th in August (`_tax_pay_day()`)
- VAT: 12th of the 2nd month after quarter ends, 17th in August (`vat.py`)
  - Q1 (Jan–Mar) → May 12 | Q2 (Apr–Jun) → Aug 17 | Q3 (Jul–Sep) → Nov 12 | Q4 (Oct–Dec) → Feb 12 next year

**VAT timing:** based on `PostingDate` (outgoing) and `InvoiceDate` (incoming) — NOT `DueDate`.

**Recurring invoice forecasting** (`recurring.py`):
- Projected from `PaymentDate` (fallback: `DueDate` → `InvoiceDate`) of the last matching actual invoice
- 1–12 month recurrence intervals, 24-month horizon
- Only projects dates 14+ days in the future

**Future invoice planning:**
- `amount = hours × hourly_rate × 1.25` (25% VAT included)
- `payment_date = invoice_date + payment_delay_days`
- Invoice date rules (`last_day`, `last_working_day`, `first_day_next_month`, `first_working_day_next_month`) use `holiday_service.py`, which fetches Swedish public holidays from the `date.nager.at` API (in-memory cache per year, falls back to empty set on failure)

**Periodic expenses** (section 7a in `forecast.py`):
- Two modes: `"days"` (every N days from `start_date`) and `"monthly"` (fixed day-of-month each month)
- Optional `end_date` — occurrences beyond it are excluded

**Manual balance override:**
- Singleton row `ManualBalanceOverride` (id=1) in the DB
- Cache service preserves the override unless the Wint API returns a *different* balance value
- `ForecastResponse` includes `balance_source: "api" | "manual"` and `balance_updated_at`

### CORS

`allow_credentials` must be `False` when using `allow_origins=["*"]`. In `APP_ENV=development`, explicit origins `["http://localhost:5173", "http://127.0.0.1:5173"]` are used with credentials allowed.

## API Integration — Wint API

**MANDATORY: Only call GET endpoints. Never call approve/reject/create/update/delete operations.**

- Public spec: `Wint_API_Doc/swagger.json`
- Auth: Basic Auth on every request
- The live API returns integers for fields declared as strings in the spec (e.g. `SerialNumber`, `Status`) and datetime strings for date fields. Pydantic validators in `backend/app/schemas/wint.py` handle coercion via `coerce_str` and `coerce_date` field validators.

## Frontend Patterns

### Decimal parsing

Pydantic `Decimal` fields serialize to JSON strings. Always parse with `parseFloat()` in TypeScript, never coerce directly to `number`.

### Timezone safety (Sweden, UTC+2)

`new Date("2026-05-01T00:00:00").toISOString()` gives `"2026-04-30T22:00:00Z"` — off by one day.

**Always use UTC methods for date arithmetic:**

```typescript
// CORRECT
const [y, m, day] = dateStr.split("-").map(Number);
const d = new Date(Date.UTC(y, m - 1, day));
d.setUTCDate(d.getUTCDate() + 1);
return d.toISOString().slice(0, 10);

// CORRECT — today's local date
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
```

### API client

`src/api/client.ts` — `apiFetch<T>` is the single entry point for all HTTP calls. It handles 204 No Content (DELETE returns `undefined`, not `res.json()`).

### State management

- TanStack Query for server state. Query key factory: `src/utils/queryKeys.ts`
- `ForecastContext` — `{ months, setMonths }` — global forecast horizon, default from `VITE_DEFAULT_FORECAST_MONTHS`
- `ConfigContext` — app config from `/api/config`

### Tailwind v4

- Uses `@import "tailwindcss"` and `@plugin "tailwindcss-animate"` in `index.css` — no `tailwind.config.js`
- `@tailwindcss/vite` plugin in `vite.config.ts`
- shadcn components in `src/components/ui/` — add new ones with `npx shadcn@latest add <component>`
- shadcn imports from `radix-ui` monorepo package (not individual `@radix-ui/react-*` packages)

## Environment Variables

All variables are documented in `.env.example`. Key ones:

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | **Required.** Docker Compose refuses to start without it. |
| `WINT_API_USERNAME` / `WINT_API_PASSWORD` | Wint Basic Auth credentials. Only needed on first bootstrap. |
| `ENCRYPTION_KEY` | Fernet key. Auto-generated to `./data/config.json` on first run. |
| `WINT_BOOTSTRAP_ON_STARTUP` | `true` = read Wint credentials from env → encrypt → store in DB. `false` = read from DB. |
| `APP_ENV` | `development` enables CORS for `localhost:5173`. `production` = strict CORS. |
| `CACHE_REFRESH_INTERVAL_HOURS` | How often APScheduler refreshes the Wint API cache (default: 6). |
| `VITE_*` | Frontend-only Vite vars, embedded in the JS bundle at build time. |

## Operations Reference

```bash
# Reset or disable app password
docker exec <backend-container> python -m app.cli reset-auth --password newpassword
docker exec <backend-container> python -m app.cli reset-auth --disable

# Trigger manual cache refresh
curl -X POST http://localhost/api/cache/refresh

# Wipe everything and start fresh (loses all data)
docker compose down -v
rm data/config.json
docker compose up --build
```

## Docker Services

| Service | Image | Exposed port |
|---|---|---|
| `db` | `postgres:16` | Internal only |
| `backend` | Built from `backend/Dockerfile` | Internal only (port 8000) |
| `web` | Built from `frontend/Dockerfile.prod` | `80` → container `80` |
