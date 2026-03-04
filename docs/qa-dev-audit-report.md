# QA Dev Audit Report — Auth/RBAC

- Fecha/hora ejecución: 2026-03-04 19:08:45 -0300
- Rama objetivo solicitada: `dev`
- Rama auditada: `dev` (HEAD local `192912d`), con `origin/dev` actualizado (`b27d42e`).
- Rama de evidencia QA (commit/push): `nanai-qa-auth-rbac-e2e`
- Entorno: local (`http://localhost:5173`)

## 1) Preparación de rama

```bash
git fetch origin
git checkout dev
git pull --ff-only origin dev
```

Resultado:
- `Already up to date.`

## 2) Auditoría funcional mínima

Comandos base ejecutados:

```bash
deno task users:seed
nohup deno task dev

# checks HTTP con curl
POST /api/auth/login (admin)
POST /api/auth/login (analyst)
POST /api/auth/login (inválido)
GET  /api/auth/me (cookie válida)
GET  /admin/users (admin)
GET  /admin/users (analyst)
POST /api/auth/logout
GET  /api/auth/me (post-logout)
```

Resultados observados:

- ✅ `login admin` = **200**
- ✅ `login analyst` = **200**
- ✅ `login inválido` = **401**
- ✅ `me con cookie válida` = **200**
- ✅ `logout` = **200**
- ✅ `me post-logout` = **401**
- ❌ `admin acceso a /admin/users permitido` = **500** (esperado permitido/200)
- ✅ `analyst acceso a /admin/users denegado` = **302** (denegado)

### Evidencia de error bloqueante `/admin/users` con admin

Respuesta HTTP:
- `HTTP/1.1 500 Internal Server Error`

Log runtime relevante:

```text
Error: No arguments passed to: ctx.render()
    at Context.render (.../@fresh/core/2.2.0/src/context.ts:152:13)
    at GET (/home/dio/.openclaw/workspace/tmp/edison3/routes/admin/routes/admin/users.tsx:9:16)
```

## 3) Build SSR + checks base

### SSR build

```bash
deno task build
```

Resultado:
- ✅ Build client + SSR completado correctamente.

### Lint

```bash
deno lint .
```

Resultado:
- ❌ Falla lint (`require-await`) en `lib/auth/runtime.ts:46`:
  - `Async method 'createAuditEvent' has no 'await' expression`

### Tests auth relevantes

```bash
deno test lib/auth/password_test.ts lib/auth/types_test.ts lib/auth/guards_test.ts
```

Resultado:
- ✅ `7 passed | 0 failed`

## 4) Veredicto final

## **NO-GO**

Razones:
1. Criterio funcional obligatorio incumplido: **admin no puede acceder correctamente a `/admin/users`** (500 interno).
2. Check base incumplido: **lint falla** en `lib/auth/runtime.ts`.

## 5) Recomendaciones inmediatas

1. Corregir handler `GET` en `routes/admin/routes/admin/users.tsx` (uso de `ctx.render()` sin argumentos válidos).
2. Corregir lint `require-await` en `lib/auth/runtime.ts` (`createAuditEvent`).
3. Re-ejecutar esta misma matriz QA en `dev` tras el fix para emitir nuevo dictamen GO/NO-GO.
