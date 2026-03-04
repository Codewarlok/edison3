# QA Dev Re-Audit Report (post-hotfix)

- **Fecha:** 2026-03-04 (America/Santiago)
- **Branch auditada:** `dev` @ `192912d`
- **QA branch de entrega:** `nanai-qa-auth-rbac-e2e`
- **Veredicto final:** **NO-GO**

## 1) Preparación

- Checkout y actualización de `dev` ejecutada con éxito (`git pull --rebase origin dev` -> fast-forward a `192912d`).
- Seed de usuarios ejecutado:
  - `admin@edison.local / admin123`
  - `analyst@edison.local / analyst123`

## 2) Matriz mínima auth/RBAC

Base URL validada: `http://localhost:5173`

| Caso | Esperado | Resultado | Evidencia |
|---|---:|---:|---|
| Login admin | 200 | ✅ 200 | `POST /api/auth/login` |
| Login analyst | 200 | ✅ 200 | `POST /api/auth/login` |
| Login inválido | 401 | ✅ 401 | `POST /api/auth/login` (password incorrecta) |
| `me` con cookie válida | 200 | ✅ 200 | `GET /api/auth/me` con cookie admin |
| Logout | 200 | ✅ 200 | `POST /api/auth/logout` |
| `me` post-logout | 401 | ✅ 401 | `GET /api/auth/me` tras logout |
| Admin `/admin/users` permitido (sin redirect a login) | 200/no login redirect | ❌ **500** | `GET /admin/users` con cookie admin -> `Internal server error` |
| Analyst `/admin/users` denegado | redirect/forbidden | ✅ 302 | `Location: /forbidden?required=admin` |

### Hallazgo crítico en `/admin/users` (admin)

Error en runtime:

- `Error: No arguments passed to: ctx.render()`
- Origen: `routes/admin/users.tsx` en handler `GET`, se llama `ctx.render()` sin props.

Impacto:

- Usuario admin autenticado no puede acceder a pantalla `/admin/users`.
- Incumple criterio de aceptación RBAC de acceso permitido a admin.

## 3) Theme toggle (persistencia al recargar)

### Estado de validación

- **Implementación observada en código:**
  - `islands/ThemeToggle.tsx` guarda preferencia en `localStorage` (`edison-theme`) y actualiza `data-theme`.
  - `routes/_app.tsx` incluye script de bootstrap que reaplica tema guardado al cargar.
- **Validación manual UI real:** **parcial/no completada plenamente en esta corrida**.
  - El browser tool de OpenClaw no estuvo disponible en esta sesión.
  - Se validó la lógica de persistencia por revisión directa de código, pero falta evidencia visual interactiva (click + reload en navegador controlado por herramienta).

## 4) Checks razonables (lint/test auth)

- `deno test lib/auth/*_test.ts` -> ✅ **7 passed / 0 failed**
- Lint focalizado (`deno lint ...`) -> ❌ falla existente:
  - `lib/auth/runtime.ts`: regla `require-await` en `createAuditEvent` (método `async` sin `await`).

## 5) Bloqueadores remanentes

1. **CRÍTICO (GO blocker):** `/admin/users` retorna 500 para admin autenticado (`ctx.render()` sin argumentos).
2. **Calidad (no funcional auth core, pero pendiente):** lint falla por `require-await` en `lib/auth/runtime.ts`.
3. **Evidencia UI incompleta en esta ejecución:** falta prueba manual interactiva capturada del theme toggle (click + reload) por indisponibilidad de browser tool.

## 6) Conclusión

- Auth API core (login/me/logout) quedó **estable** en esta corrida.
- RBAC para analyst en `/admin/users` (denegación) quedó **correcto**.
- Acceso admin a `/admin/users` está **roto (500)**.

# **VEREDICTO: NO-GO**
