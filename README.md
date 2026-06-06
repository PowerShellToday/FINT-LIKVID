# Wint Liquidity Visualizer

Self-hosted cash flow forecasting for [Wint (Superkollagen)](https://www.wint.se) customers. Shows actual and forecasted liquidity for the next 6–24 months, with daily resolution and a running balance graph.

## Quick start

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone <repo-url>
cd WintStatus-v2
docker compose up --build
```

Open **<http://localhost>** — a setup wizard guides you through configuration. No `.env` file needed.

> If port 80 is in use, change `"80:80"` to `"8080:80"` in `docker-compose.yml` and open <http://localhost:8080>.

## First-run setup wizard

On first startup the app is in setup mode. The wizard collects:

1. **Wint API credentials** — username and password from your Wint account, plus the BAS account number for your bank balance (default: `1930`)
2. **App settings** — cache refresh interval, forecast horizon, currency
3. **Password protection** — optional; protects the app from others on your network

After completing the wizard the app loads normally on every subsequent start.

## Data persistence

| What | Where |
|---|---|
| Encryption key | `./data/config.json` (auto-generated on first run) |
| All app settings & credentials | PostgreSQL (Docker volume `postgres_data`) |
| Wint API cache | PostgreSQL, refreshed every N hours |

**Back up `./data/config.json`** — losing it means stored Wint credentials can no longer be decrypted and you will need to re-run the setup wizard (after wiping the DB volume).

## Operations

### Reset or disable the password

```bash
# Set a specific password
docker exec wintstatus-v2-backend-1 python -m app.cli reset-auth --password yourpassword

# Generate a random password (printed to terminal)
docker exec wintstatus-v2-backend-1 python -m app.cli reset-auth

# Disable password protection entirely
docker exec wintstatus-v2-backend-1 python -m app.cli reset-auth --disable
```

The username can be anything — only the password is checked.

### Force a cache refresh

Use the refresh button in the app, or:

```bash
curl -X POST http://localhost/api/cache/refresh
```

### Wipe everything and start fresh

```bash
docker compose down -v     # removes containers + postgres volume
rm data/config.json        # removes encryption key
docker compose up --build  # setup wizard appears again
```

## Updating

```bash
git pull
docker compose up --build
```

Alembic migrations run automatically on startup — no manual DB steps needed.

## Development

```bash
# Start only the database
docker compose up db -d

# Generate a local encryption key (one time)
python -c "from cryptography.fernet import Fernet; import json; open('data/config.json','w').write(json.dumps({'encryption_key': Fernet.generate_key().decode()}))"

# Backend — from backend/
POSTGRES_HOST=localhost POSTGRES_PORT=5432 \
POSTGRES_USER=wintstatus POSTGRES_PASSWORD=<your-password-from-.env> \
POSTGRES_DB=wintstatus CONFIG_PATH=../data/config.json APP_ENV=development \
uvicorn app.main:app --reload --port 8000

# Frontend — from frontend/ (separate terminal)
npm run dev   # http://localhost:5173, proxies /api/ to backend
```

## Architecture

```text
frontend/   Vite + React + TypeScript + shadcn/ui  (built into nginx for prod)
backend/    Python + FastAPI                        (port 8000, internal)
            PostgreSQL 16                           (internal only)
nginx       Serves frontend + proxies /api/         (port 80, exposed)
```

The backend caches Wint API responses in PostgreSQL and rebuilds the forecast on each `/api/forecast` request from that cache.

## Business logic notes

**Pay dates:** Salary on the 25th, tax & social on the 12th (17th in August), VAT on the 12th of the 2nd month after each quarter ends (17th in August).

**Recurring invoices** — projected from the most recent actual `PaymentDate` (fallback: `DueDate` → `InvoiceDate`). Only dates 14+ days ahead are included.

**Future invoices (planned)** — amount = `hours × hourly_rate × 1.25` (25% VAT). Payment date = `invoice_date + payment_delay_days`.
