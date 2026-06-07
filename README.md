# FINT Likvid — **Fi**nansiell **N**etto**T**jänst

Self-hosted cash flow forecasting for [Wint (Superkollagen)](https://www.wint.se) customers. Shows actual and forecasted liquidity for the next 6–24 months, with daily resolution and a running balance graph.

## ⚠️ Security warning

This app has not been security-audited, penetration tested, or hardened in any meaningful way. It was built to run on a trusted local network — think "home lab" or "office NAS that your colleagues can barely find anyway."

**Do not expose this to the internet.** It handles your Wint API credentials and gives a pretty clear picture of your company's financial situation. Neither of those things should be a gift to the public internet.

The optional password protection is better than nothing, but it is not a substitute for network-level isolation. If you are asking yourself "could I just put this behind a reverse proxy with a self-signed cert?" — you could, but please don't. Put it on a VPN instead. Or just run it on your laptop with Docker Desktop and call it a day — no network exposure at all.

In short: run it on your local network, keep it off the internet, and we're all fine.

## Quick start

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Option A — pre-built images (no git clone needed)

Create a `docker-compose.yml` anywhere on your machine:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: wintstatus
      POSTGRES_PASSWORD: wintstatus_internal
      POSTGRES_DB: wintstatus
      TZ: Europe/Stockholm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    image: ghcr.io/powershelltoday/fint-likvid-backend:latest
    environment:
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      POSTGRES_DB: wintstatus
      POSTGRES_USER: wintstatus
      POSTGRES_PASSWORD: wintstatus_internal
      APP_ENV: production
      TZ: Europe/Stockholm
    volumes:
      - ./data:/app/data
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  web:
    image: ghcr.io/powershelltoday/fint-likvid-web:latest
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

Then start it:

> **Note:** The `./data` directory must exist before starting the stack — Docker will not create it for you and will refuse to start if it's missing.

```bash
mkdir -p ./data
docker compose up -d
```

Open **<http://localhost>** — a setup wizard guides you through configuration.

> **Port 80 already in use?** Change `"80:80"` to `"8080:80"` in the `ports:` section of the `web` service, then open <http://localhost:8080> instead.

To update to the latest release:

```bash
docker compose pull
docker compose up -d
```

### Option B — build from source

```bash
git clone https://github.com/PowerShellToday/FINT-LIKVID.git
cd FINT-LIKVID
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

**Pre-built images (Option A):**

```bash
docker compose pull
docker compose up -d
```

**Built from source (Option B):**

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
