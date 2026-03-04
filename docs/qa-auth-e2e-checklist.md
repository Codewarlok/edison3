# QA Auth/RBAC E2E Checklist (post-fix)

- Fecha/hora ejecución: 2026-03-04 16:08:47 -03
- Rama validada: `nanai`
- Rama de evidencia QA: `nanai-qa-auth-rbac-e2e`
- Entorno: local (`http://localhost:5173`)

## Comandos ejecutados

```bash
git checkout nanai
git pull --ff-only origin nanai
deno task users:seed
scripts/smoke_auth.sh
```

## Evidencia resumida

### 1) users seed
- ✅ OK
- Salida:
  - `updated roles: admin@edison.local`
  - `updated roles: analyst@edison.local`

### 2) login admin/analyst OK
- ❌ No validable (bloqueado por error SSR/runtime, respuestas 500).

### 3) login inválido FAIL esperado
- ❌ No validable (bloqueado por error SSR/runtime, respuestas 500).

### 4) `/api/auth/me` con cookie válida OK
- ❌ No validable (bloqueado por error SSR/runtime, respuestas 500).

### 5) logout revoca sesión
- ❌ No validable (bloqueado por error SSR/runtime, respuestas 500).

### 6) acceso analyst a `/admin/users` denegado
- ❌ No validable (bloqueado por error SSR/runtime, respuestas 500).

## Bloqueador detectado

- Archivo: `lib/auth/runtime.ts`
- Error exacto:
  - `Identifier 'AuditService' has already been declared. (3:9)`
- Causa observada:
  - Import duplicado de `AuditService`.
- Impacto:
  - Fresh/Vite SSR cae durante evaluación de módulos.
  - La app queda en 500 para endpoints/rutas auth-rbac.

## Artefacto reproducible

Se ajustó/normalizó el smoke script en:
- `scripts/smoke_auth.sh`

Resultado actual:
- **FAIL** por bloqueador de compilación/runtime en `lib/auth/runtime.ts`.

## Veredicto QA

- **FAIL**
- Bloqueadores remanentes:
  1. Corregir duplicado de `AuditService` en `lib/auth/runtime.ts`.
  2. Re-ejecutar `scripts/smoke_auth.sh` para validar matriz auth/rbac completa.
