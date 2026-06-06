# Auth Route Protection Guide

This document summarizes the current API protection behavior and recommended production hardening for auth exemptions.

## Current behavior

Auth is enforced by middleware with these exempt prefixes:

- /api/setup
- /api/config
- /api/auth
- /health

If auth is disabled, all routes are open.
If auth is enabled, all non-exempt routes require a valid session cookie.

## Current route map

### Unprotected routes when auth is enabled

- GET /health
- GET /api/config
- GET /api/auth/status
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/setup/status
- POST /api/setup/complete
- POST /api/setup/demo
- POST /api/setup/reset

### Protected routes when auth is enabled

- GET /api/forecast
- GET /api/invoices
- GET /api/incoming-invoices
- GET /api/account-balance
- POST /api/cache/refresh
- GET /api/cache/status
- GET /api/app-settings
- PUT /api/app-settings
- PUT /api/app-settings/credentials
- POST /api/app-settings/test-connection
- PUT /api/app-settings/auth
- GET /api/data/export
- POST /api/data/import
- All /api/settings/* endpoints:
  - salary
  - tax-social
  - recurring-invoices
  - invoice-customers
  - future-invoices
  - one-off-expenses
  - defaults
  - balance-override
  - periodic-expenses

## Recommended production exemption strategy

### Option A (recommended)

Keep always-exempt routes minimal:

- /health
- /api/auth/login
- /api/auth/status
- /api/auth/logout

Allow setup routes only while setup is incomplete:

- /api/setup/status
- /api/setup/complete
- /api/setup/demo

Do not keep /api/setup/reset publicly exempt after setup is complete.

### Option B (stricter)

After setup is complete, only keep:

- /health
- /api/auth/login

Require session for everything else, including:

- /api/auth/status
- /api/auth/logout
- /api/config

This is stricter but can require frontend boot flow updates.

## Pros and cons

### Keep broad setup exemptions (current)

Pros:

- Simple first-run and recovery UX.
- No frontend changes needed.

Cons:

- Sensitive maintenance actions remain publicly reachable.
- /api/setup/reset can be called without login.
- Higher risk if the service is exposed outside trusted local network.

### Conditional setup exemptions (Option A)

Pros:

- Preserves setup wizard UX when needed.
- Significantly reduces attack surface after setup.
- Minimal frontend impact.

Cons:

- Middleware logic becomes state-dependent (needs setup-complete check).
- Slightly more testing complexity.

### Strict auth-only exemptions (Option B)

Pros:

- Smallest attack surface.
- Easiest security reasoning in production.

Cons:

- Likely frontend changes for startup flow.
- Operational actions become less convenient without authenticated session.

## Additional hardening suggestions

- Remove or disable setup reset endpoint in production, and keep reset as CLI-only admin action.
- Keep backend and db without host port bindings (already done).
- Keep nginx as the only exposed service.
- Add rate limiting on /api/auth/login.
- Add audit logging for setup, auth, and reset-related actions.

## Practical next step (when ready)

Implement Option A by making setup exemptions conditional on setup-complete status, and require session auth for setup reset once setup has completed.
