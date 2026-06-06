# CLAUDE.md — Fint Likvid

This file provides comprehensive guidance for AI coding agents, contributors, and future maintainers working in this repository.

## Project Overview

**Fint Likvid** (FINT = Finansiell Nettotjänst) is a self-hosted cash flow forecasting web app for [Wint (Superkollagen)](https://www.wint.se) accounting customers. It shows actual and forecasted cash flows for the next 6–24 months, integrating with the Wint REST API. Targets Swedish finance/operations teams with Swedish tax timing rules (VAT, salary, social fees).

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

## Folder Structure

```
v1/
├── .env.example               # Environment variable template — copy to .env
├── .gitignore
├── .dockerignore
├── docker-compose.yml         # Orchestrates db + backend + web (nginx)
├── CLAUDE.md                  # This file
├── README.md                  # End-user quick start
│
├── backend/
│   ├── Dockerfile             # Python 3.11-slim, runs entrypoint.sh
│   ├── entrypoint.sh          # Generates encryption key if absent, runs migrations, starts uvicorn
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/          # 9 migration files (0001–0009)
│   └── app/
│       ├── main.py            # FastAPI app, router registration, startup events
│       ├── config.py          # Pydantic Settings — reads from .env / environment
│       ├── config_file.py     # Reads/writes ./data/config.json (encryption key)
│       ├── database.py        # SQLAlchemy engine + session factory
│       ├── cli.py             # CLI: reset-auth command
│       ├── clients/           # wint_client.py — HTTP client for Wint API
│       ├── crud/              # Database CRUD helpers (settings, app_config)
│       ├── data/              # demo_data.py — seeded demo fixtures
│       ├── middleware/        # auth.py — optional Basic Auth middleware for the app
│       ├── models/            # SQLAlchemy ORM models
│       ├── routers/           # FastAPI route modules (one file per domain)
│       ├── schemas/           # Pydantic request/response schemas
│       └── services/          # Business logic (forecast, VAT, recurring, etc.)
│
├── frontend/
│   ├── Dockerfile.prod        # Multi-stage: Node build → nginx runtime
│   ├── nginx.conf             # Serves dist/ + proxies /api/ to backend:8000
│   ├── index.html
│   ├── vite.config.ts         # API proxy for dev (localhost:8000)
│   ├── components.json        # shadcn/ui config
│   ├── public/                # favicon.svg, icons.svg
│   └── src/
│       ├── api/               # client.ts (apiFetch), types.ts, auth.ts, setup.ts
│       ├── components/        # chart/, dashboard/, calendar/, settings/, feedback/, ui/
│       ├── context/           # ConfigContext, ForecastContext, ThemeContext
│       ├── layouts/           # AppLayout.tsx
│       ├── lib/               # utils.ts (shadcn helpers)
│       ├── pages/             # One file per route
│       └── utils/             # forecastTransform.ts, queryKeys.ts
│
└── Wint_API_Doc/
    ├── README.md
    └── swagger.json           # Public Wint API OpenAPI spec
```

## Development Workflow

### Full stack (recommended)

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

### Rebuild backend after Python changes

```bash
docker compose up -d --build backend
```

### Run backend tests

```bash
cd backend
python -m pytest tests/
```

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

## Architecture

### Credential Bootstrap Flow

On first startup:
1. `entrypoint.sh` generates `./data/config.json` with a fresh Fernet key if it does not exist.
2. `bootstrap.py` reads `WINT_API_USERNAME`/`WINT_API_PASSWORD` from the environment, encrypts them with the Fernet key, and stores the ciphertext in PostgreSQL.
3. On subsequent startups, credentials are read from the DB and decrypted — the environment variables are no longer required.

**Back up `./data/config.json`.** Losing it means stored credentials cannot be decrypted. Recovery: wipe the DB volume and re-run the setup wizard.

### Data Caching

`cache_service.py` fetches from the Wint API and stores responses in PostgreSQL:
- `GET /Invoices` — outgoing invoices
- `GET /IncomingInvoices` — supplier invoices
- `GET /AccountBalance` — current balance

Cache refreshes on startup and every `CACHE_REFRESH_INTERVAL_HOURS` via APScheduler. `POST /api/cache/refresh` triggers a manual refresh. The forecast engine reads exclusively from this cache — returns `503` if the cache is empty.

### Forecast Engine

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

## Security Model

| Secret | How it's protected |
|---|---|
| Wint API credentials | Encrypted with Fernet before storing in PostgreSQL. Never stored plaintext. |
| Encryption key | Stored in `./data/config.json` (outside the DB), generated at first startup. |
| PostgreSQL password | Provided via `POSTGRES_PASSWORD` env var. Never hardcoded. |
| App password (optional) | Bcrypt-hashed, stored in PostgreSQL. |

**What is NOT in this repository:**
- Real API credentials
- Real encryption keys
- Real PostgreSQL passwords
- Internal development notes or prompts
- Internal Wint API specs (only the public spec is included)

## Docker & Deployment

### Service roles

| Service | Image | Exposed port |
|---|---|---|
| `db` | `postgres:16` | Internal only |
| `backend` | Built from `backend/Dockerfile` | Internal only (port 8000) |
| `web` | Built from `frontend/Dockerfile.prod` | `80` → container `80` |

### Production deployment checklist

1. Set `POSTGRES_PASSWORD` to a strong random value in `.env`
2. Set `APP_ENV=production` in `.env`
3. Set up the app password in the setup wizard or via `docker exec ... python -m app.cli reset-auth`
4. Back up `./data/config.json` and the `postgres_data` Docker volume
5. Restrict port 80 behind a firewall or reverse proxy if the server is internet-facing
6. Consider running nginx with TLS termination in front of the `web` container

### GitHub Actions / GHCR (planned, not yet implemented)

Future CI/CD goals:
- Build and push backend image to GitHub Container Registry (`ghcr.io/<org>/fint-likvid-backend`)
- Build and push frontend image to `ghcr.io/<org>/fint-likvid-web`
- Tag images as `latest` on push to `main`, and with version tags on releases
- Run backend tests (`pytest`) as a CI gate before publishing

When implementing, use `docker/build-push-action` with `GITHUB_TOKEN` for GHCR auth. No external secrets needed for public images.

## Database Migrations

Alembic migrations run automatically in `entrypoint.sh` before the server starts. No manual `alembic upgrade head` is needed in normal operation.

To create a new migration after changing a model:

```bash
cd backend
alembic revision --autogenerate -m "describe_the_change"
# Review the generated file in alembic/versions/ before committing
```

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
