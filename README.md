# Fresh project

Your new Fresh project is ready to go. You can follow the Fresh "Getting
Started" guide here: https://fresh.deno.dev/docs/getting-started

### Usage

Make sure to install Deno:
https://docs.deno.com/runtime/getting_started/installation

Then start the project in development mode:

```
deno task dev
```

This will watch the project directory and restart as necessary.

## Auth/RBAC backend (ELLIS)

Endpoints mínimos:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Variables de entorno:

- `EDISON_ADMIN_EMAIL`
- `EDISON_ADMIN_PASSWORD`
- `EDISON_ADMIN_NAME` (opcional)
- `EDISON_SESSION_TTL_MS` (opcional, default 12h)
