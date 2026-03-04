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

---

## Post-backend-fix (validación enfocada)

- Fecha/hora ejecución: 2026-03-04 16:29 -03
- Rama base backend aplicada: `origin/nanai-backend-auth-rbac`
- Entorno: local (`http://localhost:5173`)

### Comandos ejecutados

```bash
git checkout nanai-qa-auth-rbac-e2e
git fetch origin
git merge --no-edit origin/nanai-backend-auth-rbac
deno task users:seed
nohup deno task dev > /tmp/edison3-dev.log 2>&1 &

# Checks HTTP (curl)
POST /api/auth/login (admin)
GET  /api/auth/me   (cookie válida)
POST /api/auth/logout
GET  /api/auth/me   (cookie revocada)
POST /api/auth/login (password inválida)
```

### Evidencia runtime

- ✅ Runtime inicia correctamente.
- ✅ No aparece error `AuditService has already been declared` en `/tmp/edison3-dev.log`.
- Señal de arranque observada:
  - `VITE v7.2.2 ready`
  - `Local: http://localhost:5173/`

### Evidencia HTTP (status)

- `POST /api/auth/login` (admin@edison.local / milanesadepollo) → **200**
- `GET /api/auth/me` (cookie válida) → **200**
- `POST /api/auth/logout` (cookie válida) → **200**
- `GET /api/auth/me` (tras logout, misma cookie) → **401**
- `POST /api/auth/login` (password inválida) → **401**

### Veredicto post-fix

- **PASS** para alcance solicitado (runtime + login/me/logout + inválido=401).
- Bloqueadores restantes en este alcance: **ninguno**.
- Nota QA: `scripts/smoke_auth.sh` aún usa credenciales antiguas (`admin123/analyst123`) y puede reportar FAIL falso negativo; conviene alinear script con seeds actuales (`milanesadepollo`/`milanesa`).
