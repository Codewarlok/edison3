# Auth/RBAC blockers fix notes (QA)

Fecha: 2026-03-04
Branch: `nanai-backend-auth-rbac`

## Bloqueador 1: login admin devolvía 401 en smoke E2E

### Causa raíz
1. En entorno de `deno task dev`, `Deno.openKv` quedaba deshabilitado por falta de config `unstable` para KV. Eso activaba `DevDisabledAuthProvider` y `authService.login()` retornaba `null` (401) para cualquier usuario.
2. El seed `users:seed` no garantizaba credenciales determinísticas cuando ya existían usuarios (solo hacía skip). En smoke sobre KV reutilizado esto podía dejar hashes/credenciales previas y provocar fallos de login.

### Fix aplicado
- `deno.json`
  - agregado: `"unstable": ["kv"]`
  - agregado en `compilerOptions.lib`: `"deno.unstable"`
- `scripts/users.ts`
  - `seed-defaults` ahora recrea usuarios default (delete + create) para asegurar password/hash/roles consistentes en cada corrida.
  - alineación de roles válidos (`admin|analyst`) con `UserRole` actual.
- `lib/auth/runtime.ts`, `lib/auth/provider.ts`, `lib/auth/kv_provider.ts`
  - restaurado soporte de auditoría (`auditService` + `createAuditEvent`) para que `/api/auth/login` y `/api/auth/logout` no fallen al auditar.

### Evidencia
- `deno task users:seed` -> recrea admin/analyst/visit correctamente.
- Flujo API reproducible:
  - `POST /api/auth/login` => `HTTP/1.1 200 OK`
  - `GET /api/auth/me` (con cookie) => `HTTP/1.1 200 OK`
  - `POST /api/auth/logout` => `HTTP/1.1 200 OK`
  - `GET /api/auth/me` (post logout) => `HTTP/1.1 401 Unauthorized`

## Bloqueador 2: TS2322 en `lib/auth/password.ts`

### Causa raíz
- `crypto.subtle.deriveBits` recibía `salt` con tipo `Uint8Array<ArrayBufferLike>`, incompatible con `BufferSource` esperado en el type-check de TS (`TS2322`).

### Fix aplicado
- `lib/auth/password.ts`
  - `pbkdf2()` ahora recibe `salt: BufferSource`.
  - normalización del salt en verify: `new Uint8Array(fromBase64Url(...))`.
  - `verifyPassword()` ahora respeta el `iterations` del hash almacenado (antes ignoraba ese campo y usaba constante fija), corrigiendo compatibilidad de verificación entre versiones.
- agregado test de regresión: `lib/auth/password_test.ts`.

### Evidencia
- `deno check lib/auth/password.ts` => PASS.
- `deno test lib/auth/password_test.ts lib/auth/guards_test.ts lib/auth/types_test.ts` => `7 passed, 0 failed`.

## Bloqueador 3 (crítico QA): runtime crash `Identifier 'AuditService' has already been declared`

### Causa raíz
- Merge parcial en `lib/auth/runtime.ts` dejó imports/métodos duplicados:
  - `import { AuditService }` declarado dos veces.
  - `createAuditEvent()` duplicado en `DevDisabledAuthProvider`.
- Merge conflict en `lib/auth/kv_provider.ts` y `lib/auth/password.ts` mantenía código duplicado/inconsistente y podía reintroducir errores de build/runtime.

### Fix aplicado
- `lib/auth/runtime.ts`
  - removida declaración duplicada de `AuditService`.
  - consolidado `createAuditEvent()` en una sola implementación no-op para modo sin KV.
- `lib/auth/kv_provider.ts`
  - resuelto merge conflict y eliminada implementación duplicada de `createAuditEvent()`.
  - se mantiene ruta única de auditoría via `AuditEventsRepository`.
- `lib/auth/password.ts`
  - resuelto merge conflict conservando `iterations` dinámico y `salt` tipado correctamente.

### Evidencia
- `deno check main.ts` => PASS.
- `deno task dev` inicia sin crash (sin `Identifier 'AuditService' has already been declared`).
- Smoke HTTP:
  - `POST /api/auth/login` => `200 OK`
  - `GET /api/auth/me` => `200 OK`
  - `POST /api/auth/logout` => `200 OK`

## Bloqueador 4 (hotfix): contrato import/API roto en login SSR (`AUTH_COOKIE`/`SESSION_TTL_MS`)

### Causa raíz
- `routes/login.tsx` importaba `AUTH_COOKIE` y `SESSION_TTL_MS` desde `lib/auth/service.ts`.
- Ese contrato ya no existe en `service.ts` (helpers de sesión viven en `lib/auth/session.ts`).
- Impacto en QA: `deno task build` fallaba en SSR con `"AUTH_COOKIE" is not exported by "lib/auth/service.ts"`.

### Fix aplicado
- `routes/login.tsx`
  - reemplazado import roto por `buildSessionCookie` + `getSessionTtlMs` desde `lib/auth/session.ts`.
  - unificado contrato de cookie con el endpoint API (`/api/auth/login`).
  - `Secure` condicionado por protocolo (`ctx.url.protocol === "https:"`).

### Evidencia reproducible
- `deno task build` => PASS (client + SSR).
- `deno task users:seed` => `updated roles: admin@edison.local` y `updated roles: analyst@edison.local`.
- Smoke HTTP:
  - `POST /api/auth/login` (admin) => `200`
  - `GET /api/auth/me` (cookie admin) => `200`
  - `POST /api/auth/logout` => `200`
  - `GET /api/auth/me` (post logout) => `401`
  - `POST /api/auth/login` (analyst) => `200`
  - `GET /api/auth/me` (cookie analyst) => `200`
- `deno check routes/login.tsx routes/api/auth/login.ts routes/api/auth/logout.ts routes/api/auth/me.ts` => PASS.

## Bloqueador 5 (hotfix NO-GO dev): `/admin/users` devolvía 500 + lint `require-await`

### Causa raíz
1. `routes/admin/users.tsx` ejecutaba `ctx.render()` sin elemento JSX válido. En Fresh 2 esto lanza `Non-JSX element passed to: ctx.render()` y rompe `/admin/users` con 500.
2. `lib/auth/runtime.ts` tenía `createAuditEvent` como `async` sin `await`, gatillando regla lint `require-await`.

### Fix aplicado
- `routes/admin/users.tsx`
  - se alineó con el patrón de rutas SSR del proyecto (`routes/dashboard/admin.tsx`).
  - `GET` ahora hace `ctx.render(<AdminUsersPage ... />)` para evitar el 500.
  - se movió la página a `function AdminUsersPage(...)` (declaración hoisted) para que esté disponible al renderizar desde el handler.
- `lib/auth/runtime.ts`
  - `createAuditEvent` en `DevDisabledAuthProvider` dejó de ser `async`.
  - implementación no-op explícita: `return Promise.resolve();`.

### Evidencia
- `deno lint routes/admin/users.tsx lib/auth/runtime.ts` => PASS.
- `deno test lib/auth/password_test.ts lib/auth/guards_test.ts lib/auth/types_test.ts` => `7 passed, 0 failed`.
- Smoke admin SSR:
  - `POST /api/auth/login` (admin) => `200`.
  - `GET /admin/users` con cookie admin => `200` (sin 500).
