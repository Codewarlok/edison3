# Security Auth Hardening (fase release)

Fecha: 2026-03-04 Rama: `nanai-security-auth-hardening`

## Objetivo

Aplicar hardening mínimo y de bajo riesgo sobre autenticación para preparación
de release.

## Checklist (before/after)

### Before

- [x] Cookie de sesión seteada en rutas con flags inconsistentes y sin política
      por entorno.
- [x] Sin rate limiting de login.
- [x] Sin lockout progresivo por fallos.
- [x] Sin lineamientos explícitos de CSRF para mutaciones
      (`POST`/`PUT`/`PATCH`/`DELETE`).

### After

- [x] Cookie de sesión centralizada en `lib/auth/session.ts` con flags por
      entorno:
  - `HttpOnly`, `Path=/`, `Max-Age`, `SameSite` configurable.
  - `Secure` por entorno (`DENO_ENV=production`) u override con
    `EDISON_COOKIE_SECURE`.
- [x] Rate limiting básico de login (por email, en memoria del proceso) en
      `AuthService`.
- [x] Lockout progresivo simple tras múltiples fallos (backoff exponencial con
      tope).
- [x] Rutas de login/logout migradas a helpers de cookie centralizados.
- [x] Tests agregados para lockout y rate limiting en
      `lib/auth/service_test.ts`.

## Cambios aplicados

### 1) Cookie flags por entorno

Archivo: `lib/auth/session.ts`

- Se agregó política de cookies con:
  - `shouldUseSecureCookie()`:
    - default `true` si `DENO_ENV=production`
    - override por `EDISON_COOKIE_SECURE=true|false`
  - `getCookieSameSite()`:
    - default `Lax`
    - override por `EDISON_COOKIE_SAMESITE=Lax|Strict|None`
- `buildSessionCookie()` y `clearSessionCookie()` ahora usan la política
  central.

Rutas actualizadas:

- `routes/login.tsx`
- `routes/api/auth/login.ts`
- `routes/api/auth/logout.ts`
- `routes/_middleware.ts` (usa `AUTH_COOKIE` + parser común desde `session.ts`)

### 2) Rate limiting login básico

Archivo: `lib/auth/service.ts`

- Se implementó control simple en memoria por email normalizado:
  - Ventana: `EDISON_LOGIN_RATE_LIMIT_WINDOW_MS` (default: 10 min)
  - Máx intentos: `EDISON_LOGIN_RATE_LIMIT_MAX_ATTEMPTS` (default: 10)
- Si se excede, se aplica bloqueo temporal corto.

### 3) Lockout progresivo simple

Archivo: `lib/auth/service.ts`

- Desde umbral de fallos, lockout exponencial con tope:
  - Umbral: `EDISON_LOGIN_LOCKOUT_THRESHOLD` (default: 5)
  - Base: `EDISON_LOGIN_LOCKOUT_BASE_MS` (default: 60s)
  - Máximo: `EDISON_LOGIN_LOCKOUT_MAX_MS` (default: 15 min)
- En login exitoso se limpia el estado de protección del email.

### 4) Recomendaciones CSRF para mutaciones

Estado: **recomendado, no aplicado todavía** para minimizar riesgo de regresión
pre-release.

Recomendación mínima inmediata:

1. Exigir validación de `Origin`/`Referer` en todas las rutas mutantes
   autenticadas.
2. Mantener `SameSite=Lax` como baseline, evaluar `Strict` si UX lo permite.
3. Para APIs consumidas por front propio, agregar token CSRF de doble envío
   (cookie + header) en:
   - `/api/auth/logout`
   - `/api/admin/users` y cualquier mutación futura.
4. Asegurar que endpoints `GET` no ejecuten cambios de estado.

## Riesgos actuales (residuales)

1. **Rate limit/lockout en memoria local**
   - No sobrevive restart.
   - No es compartido entre réplicas.
   - En producción multi-instancia: mover a almacenamiento compartido
     (KV/Redis).
2. **Protección por email, no por IP/device fingerprint**
   - Útil contra brute force básico, pero evadible con rotación de cuentas.
3. **CSRF en mutaciones autenticadas**
   - Aunque `SameSite` ayuda, falta enforcement de token/origin en backend.

## Pendientes para producción

- [ ] Migrar rate limiting/lockout a almacenamiento distribuido (Deno KV/Redis)
      con TTL.
- [ ] Añadir métricas y alertas de intentos fallidos/lockouts.
- [ ] Implementar middleware CSRF para mutaciones y tests e2e.
- [ ] Revisar endurecimiento adicional de cookies:
  - `__Host-` prefix (si aplica)
  - `SameSite=Strict` en panel interno.
- [ ] Definir respuesta diferenciada para lockout/rate limit (actualmente se
      responde genérico para no filtrar señal).
