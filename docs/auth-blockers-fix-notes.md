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
