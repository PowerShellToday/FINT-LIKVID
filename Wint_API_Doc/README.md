# WINT API

## Environment and safety

This API points to a production environment.

Authentication uses Basic Auth.
Load username and password from the `.env` file.
Use `.env.example` in the repository root as the template.

- `WINT_API_USERNAME`
- `WINT_API_PASSWORD`

## Bootstrap credential flow

Recommended behavior:

- On first startup, read `WINT_API_USERNAME` and `WINT_API_PASSWORD` from `.env`.
- Encrypt and store them in the database using `ENCRYPTION_KEY`.
- On later startups, read credentials from the encrypted DB record.
- After successful bootstrap, credentials in `.env` are optional.

Related variables:

- `WINT_BOOTSTRAP_ON_STARTUP`
- `WINT_BOOTSTRAP_REQUIRE_EMPTY_DB`
- `ENCRYPTION_KEY`

## Environment variables

Set these in the repository root `.env` file:

- Required for API access:
	- `WINT_API_BASE_URL`
	- `WINT_API_USERNAME` (only when bootstrap is enabled)
	- `WINT_API_PASSWORD` (only when bootstrap is enabled)
- Optional for internal API:
	- `WINT_API_INTERNAL_BASE_URL`
	- `WINT_USE_INTERNAL_API`
- Optional runtime:
	- `WINT_API_TIMEOUT_SECONDS`
	- `WINT_BOOTSTRAP_ON_STARTUP`
	- `WINT_BOOTSTRAP_REQUIRE_EMPTY_DB`
	- `ENCRYPTION_KEY`

Compatibility note:

- Some older configs may use `WINT_USERNAME` and `WINT_PASSWORD`.
- Prefer `WINT_API_USERNAME` and `WINT_API_PASSWORD` for new code.

Use these rules at all times:

- Prefer `GET` endpoints.
- Do not approve, reject, create, update, or delete anything.
- Do not call any endpoint that changes system state unless explicitly requested.

## Public API documentation (preferred)

- Online: https://superkollapi.wint.se/swagger/v1/swagger.json
- Local copy in this folder: [swagger.json](./swagger.json)

Use the public API spec first.

## Internal API documentation (use only when needed)

- Online: https://superkollapi.wint.se/swagger/Internal/swagger.json
- Local copy in this folder: [swagger_internal.json](./swagger_internal.json)

According to Wint, internal endpoints are for internal use and may change or be removed.

Only use internal endpoints when a required field is not available in the public API.
