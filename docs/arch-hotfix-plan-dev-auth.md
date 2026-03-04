# Hotfix de integración auth para desbloquear QA en `dev`

Fecha: 2026-03-04  
Autor: Solutions Architect (subagent)

## 1) Estado de ramas revisadas

- `dev` (`b104fa7`): incluye merge reciente de `nanai`, pero quedó **inconsistente** en auth.
  - `routes/login.tsx` importa `AUTH_COOKIE` y `SESSION_TTL_MS` desde `lib/auth/service.ts` (símbolos no exportados) ⇒ rompe build SSR.
  - `deno.json` no trae `"unstable": ["kv"]` (sí en ramas más nuevas) ⇒ en `deno task dev` puede desactivar KV y devolver 401 en login.
- `nanai` (`853b8ad`): trae fix frontend de login (`buildSessionCookie/getSessionTtlMs` desde `lib/auth/session.ts`) y capa auth más alineada.
- `nanai-backend-auth-rbac` (`92edd88`): contiene fixes backend de runtime/typing + endurecimiento de seed de usuarios y notas de bloqueo QA.
- `nanai-frontend-landing-login-dashboard` (`1afca7a`): cambios de UI/tema y landing; no resuelve por sí sola los bloqueadores backend de QA.

## 2) Causa raíz de la desalineación

Desalineación por **merges parciales en distinto orden** entre frontend y backend:

1. En `dev` quedó una versión vieja de `routes/login.tsx` acoplada a constantes removidas de `service.ts` (regresión de integración).
2. Parte de fixes operativos de backend para QA no quedaron reflejados en `dev` (especialmente configuración KV y determinismo de credenciales seed), provocando 401 en auditoría.
3. Resultado: frontend espera contrato de sesión nuevo, backend/runtime en `dev` no siempre inicializa KV de forma consistente y QA pega contra credenciales/estado no determinístico.

## 3) Estrategia de merge segura (orden exacto, máx 8 pasos)

1. Crear rama de integración temporal desde `dev` (ej. `hotfix/dev-auth-integration`).
2. Hacer **cherry-pick o merge dirigido** de fixes backend mínimos desde `nanai-backend-auth-rbac`:
   - `deno.json` (`unstable: ["kv"]`),
   - `scripts/users.ts` (seed determinístico),
   - `lib/auth/runtime.ts`, `lib/auth/kv_provider.ts`, `lib/auth/password.ts`.
3. Traer fix de contrato frontend-auth desde `nanai` para `routes/login.tsx`, `routes/api/auth/login.ts`, `routes/api/auth/logout.ts`, `lib/auth/session.ts`, `lib/auth/service.ts`.
4. Resolver conflictos priorizando el contrato actual de sesión en `lib/auth/session.ts` (`buildSessionCookie`, `getSessionTtlMs`) y eliminando imports legacy desde `service.ts`.
5. Ejecutar validación técnica local: `deno check`, `deno test lib/auth/password_test.ts lib/auth/guards_test.ts lib/auth/types_test.ts`, `deno task build`.
6. Ejecutar preparación QA: `deno task users:seed` en entorno limpio/reutilizado para garantizar admin/analyst determinísticos.
7. Ejecutar smoke auth end-to-end (login/me/logout) por API y ruta `/login` SSR.
8. Abrir PR a `dev` con etiqueta hotfix y bloquear merge hasta green en CI + smoke QA.

## 4) Criterios de aceptación para QA re-run

- **Build/SSR**: `deno task build` pasa sin error en `routes/login.tsx`.
- **Login API**:
  - `POST /api/auth/login` con `admin@edison.local` y `analyst@edison.local` devuelve `200`.
  - credenciales inválidas devuelven `401` (comportamiento esperado).
- **Sesión**:
  - cookie de sesión se setea correctamente,
  - `GET /api/auth/me` devuelve `200` tras login,
  - `POST /api/auth/logout` invalida sesión y luego `/api/auth/me` devuelve `401`.
- **Determinismo de ambiente**: tras `deno task users:seed`, QA obtiene mismo resultado en corridas consecutivas.
- **No regresión UI**: `/login` renderiza sin crash SSR y redirige a `/dashboard` después de autenticación válida.

---

### Nota de riesgo
Para minimizar riesgo en `dev`, evitar merge completo de `nanai-frontend-landing-login-dashboard` en este hotfix; limitar alcance a contrato auth + runtime/seed necesario para desbloquear QA NO-GO.
