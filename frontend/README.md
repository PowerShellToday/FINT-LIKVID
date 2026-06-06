# Wint Liquidity — Frontend

React + TypeScript + Vite frontend for the Wint Liquidity Visualizer.

## Dev server

```bash
# From this directory (frontend/)
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

Requires `frontend/.env` — copy from `.env.example`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_DEFAULT_FORECAST_MONTHS=6
VITE_MAX_FORECAST_MONTHS=24
VITE_CURRENCY=SEK
```

## Stack

- Vite 8 + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite` — no config file, uses `@import "tailwindcss"` in `index.css`)
- shadcn/ui (New York style, zinc base, imports from `radix-ui` monorepo package)
- `tailwindcss-animate` for Sheet/dialog animations
- Recharts for the liquidity graph
- TanStack Query for server state

## Key patterns

**API calls** — all go through `apiFetch<T>` in `src/api/client.ts`. DELETE endpoints return 204 No Content — the function handles this by checking `res.status === 204` before calling `res.json()`.

**Forecast data** — `bucketByDay()` in `src/utils/forecastTransform.ts` converts flat `ForecastEntry[]` into per-day buckets with a running balance. Filters to today-forward only. Chart uses daily resolution with month labels on the 1st of each month.

**Pydantic Decimal fields** — the backend serializes `Decimal` as JSON strings. Always parse with `parseFloat()`, never assume they are numbers.

**Timezone safety** — never use `new Date(...).toISOString().slice(0,10)` for local date strings in Sweden (UTC+2). Use `Date.UTC()` and `setUTCDate()` for arithmetic; build today's string from `now.getFullYear()` / `getMonth()` / `getDate()`.

**VAT on planned invoices** — `FutureInvoices.tsx` multiplies `hours × rate × 1.25` everywhere (preview, list display, and the backend does the same).
