# CTO Execution Plan — Hotfix DEV (`/admin/users` + lint)

**Fecha:** 2026-03-04  
**Branch objetivo:** `nanai-cto-incident-plan` (base `dev`)  
**Prioridad:** Crítica (NO-GO QA)

## 1) Responsables por célula

- **Backend (owner de ejecución):**
  - Ajuste de handler en `routes/admin/users.tsx`.
  - Ajuste de método `createAuditEvent` en `lib/auth/runtime.ts`.
  - Evidencia técnica (diff + verificación local).

- **Frontend (soporte/validación):**
  - Smoke visual de `/admin/users` (render correcto sin error 500).
  - Confirmación de que estructura de página no se altera.

- **DevOps (control de promoción):**
  - Verificación de gates (lint OK).
  - Preparación de rollback por reversión de commit.
  - Seguimiento de estado de branch para integración.

## 2) Orden de ejecución

1. Crear/usar branch `nanai-cto-incident-plan` desde `dev`.
2. Aplicar fix backend de `/admin/users` (`ctx.render({})`).
3. Aplicar fix lint en `lib/auth/runtime.ts` (`createAuditEvent` sin async innecesario).
4. Ejecutar `deno lint .` y registrar resultado.
5. QA smoke en `/admin/users` con usuario admin (esperado 200).
6. Commit + push con evidencia para revisión.

## 3) Criterios de aceptación QA

### Funcional
- [ ] `GET /admin/users` autenticado como `admin` responde 200.
- [ ] La página renderiza título/tabla sin error runtime.

### Calidad técnica
- [ ] `deno lint .` finaliza sin errores.
- [ ] No se introducen cambios fuera del alcance del incidente.

### Trazabilidad
- [ ] Reporte ejecutivo disponible en `docs/cto-incident-report-dev-auth-admin-users.md`.
- [ ] Plan operativo disponible en este documento.
- [ ] Cambios versionados en branch `nanai-cto-incident-plan`.

## 4) Rollback

**Estrategia primaria:** reversión de commit de hotfix.

Pasos:
1. Identificar commit de hotfix en `nanai-cto-incident-plan`.
2. Ejecutar `git revert <sha_hotfix>`.
3. Re-ejecutar `deno lint .` y smoke mínimo.
4. Push de revert y notificación a QA/Release.

**Criterio de activación de rollback:**
- Reaparición de 500 en `/admin/users`,
- o regresión en lint/CI asociada al hotfix,
- o impacto lateral en auth runtime.

## 5) Asignación activa

- **Célula ejecutando hotfix:** **Backend** (implementación completada en esta rama).
- **Célula siguiente:** **QA + Frontend** para validación funcional/visual.
- **DevOps:** listo para control de gate y eventual promoción.