# QA Auth/RBAC E2E Checklist

Fecha: 2026-03-04  
Repo: `edison3`  
Branch QA: `nanai-qa-auth-rbac-e2e`

## Alcance
Validación E2E/smoke para:
- login exitoso admin/analyst
- login fallido
- acceso dashboard por rol
- acceso denegado a `/admin/users` para analyst
- logout y revocación de sesión

## Matriz de pruebas

| ID | Escenario | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| AUTH-E2E-01 | Login exitoso admin | `POST /api/auth/login` con credenciales admin válidas | HTTP 200 + cookie de sesión + usuario admin | ❌ FAIL |
| AUTH-E2E-02 | Login exitoso analyst | `POST /api/auth/login` con credenciales analyst válidas | HTTP 200 + cookie + usuario analyst | ⛔ BLOQUEADO |
| AUTH-E2E-03 | Login fallido | `POST /api/auth/login` con password inválida | HTTP 401 + `INVALID_CREDENTIALS` | ⛔ BLOQUEADO |
| AUTH-E2E-04 | Dashboard por rol | `GET /dashboard` con sesión admin/analyst | 302 a `/dashboard/admin` o `/dashboard/analyst` | ⛔ BLOQUEADO |
| AUTH-E2E-05 | Denegación analyst en `/admin/users` | `GET /admin/users` con sesión analyst | HTTP 403 | ⛔ BLOQUEADO |
| AUTH-E2E-06 | Logout + revocación sesión | `POST /api/auth/logout`, luego `GET /api/auth/me` | logout 200, luego me=401 | ⛔ BLOQUEADO |

## Evidencia de ejecución local

### 1) Smoke script implementado
Archivo: `scripts/smoke_auth.sh`

Comando ejecutado:
```bash
./scripts/smoke_auth.sh
```

Resultado observado:
```text
==> Preparing auth smoke data (bootstrap admin via env)
==> Starting app
❌ Login admin responde 200 (expected=200 got=401)
```

Interpretación:
- El primer caso crítico (AUTH-E2E-01) falla con `401` aun con bootstrap admin por env.
- No se puede avanzar al resto de escenarios porque dependen de sesión autenticada.

### 2) Señal adicional de estado técnico (tests de auth)
Comando ejecutado:
```bash
deno test lib/auth/service_test.ts
```

Resultado observado (resumen):
- Falla type-check en `lib/auth/password.ts` (`TS2322`, incompatibilidad `Uint8Array<ArrayBufferLike>` vs `BufferSource`).

## Bloqueadores

1. **Auth login no acepta credencial admin bootstrap en ejecución local**
   - Impacto: bloquea toda la validación E2E de RBAC (dashboard, forbidden, logout).
   - Evidencia: `./scripts/smoke_auth.sh` falla en AUTH-E2E-01 con `401`.

2. **Type-check roto en capa auth (`password.ts`)**
   - Impacto: reduce confianza para liberar a dev y afecta ejecución normal de tests.
   - Evidencia: `deno test lib/auth/service_test.ts` falla por `TS2322`.

## Estado final QA (fase auth/rbac)

- **Resultado general:** ❌ **FAIL**
- **Recomendación para liberar a dev:** **NO liberar** hasta resolver bloqueadores de login bootstrap y type-check de auth.
