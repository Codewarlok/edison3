# QA Dev Audit Report

Fecha: 2026-03-04 (America/Santiago)  
Rama auditada: `dev`  
Base de trabajo: `/home/dio/.openclaw/workspace/tmp/edison3`

## 1) Estado general por bloque

- **Auth (login admin/analyst, inválido, me cookie, logout revoca): FAIL**
- **RBAC (analyst sin /admin/users, admin con acceso): FAIL**
- **UI (theme toggle claro/oscuro persiste al recargar): FAIL (no validable por tooling en esta corrida)**
- **Checks técnicos base: PARTIAL PASS**
  - `deno lint` (scope razonable): PASS
  - `deno test` auth relevantes: PASS
  - smoke script: N/A (no existe script de smoke en repo)

## 2) Evidencia (comandos y resultados)

### 2.1 Preparación de rama

```bash
git checkout dev && git pull --ff-only origin dev
```

Resultado:
- `Already on 'dev'`
- `Already up to date.`

### 2.2 Semilla/usuarios para prueba

```bash
deno task users:seed
```

Resultado:
- `updated roles: admin@edison.local`
- `updated roles: analyst@edison.local`

Se detectó que `users:seed` actualiza roles pero no password. Para asegurar credenciales QA:

```bash
deno task users:delete -- --email=admin@edison.local
deno task users:create -- --email=admin@edison.local --name=Administrador --password=admin123 --roles=admin
deno task users:delete -- --email=analyst@edison.local
deno task users:create -- --email=analyst@edison.local --name=Analista --password=analyst123 --roles=analyst
```

Resultado: usuarios recreados correctamente.

### 2.3 Auditoría funcional (vía servidor `deno task dev`)

Servidor:
```bash
deno task dev
# VITE v7.x ready at http://localhost:5173
```

Pruebas HTTP:

```bash
curl POST /api/auth/login (inválido)
curl POST /api/auth/login (admin)
curl GET  /api/auth/me (con cookie)
curl GET  /admin/users (admin)
curl POST /api/auth/logout
curl GET  /api/auth/me (post logout)
curl POST /api/auth/login (analyst)
curl GET  /admin/users (analyst)
```

Status observados:
- `invalid_login=401`
- `admin_login=401`
- `me_admin=401`
- `admin_users=302`
- `logout=200`
- `me_after_logout=401`
- `analyst_login=401`
- `analyst_users=302` (`location=/login`)

Conclusión funcional:
- No fue posible validar login exitoso para admin/analyst en runtime `vite dev`.
- En consecuencia no se pudo validar en forma positiva `me` autenticado ni acceso admin a `/admin/users`.

### 2.4 Hallazgo técnico crítico asociado

```bash
deno task build
```

Falla de build SSR:
- Archivo: `routes/login.tsx`
- Error: `"AUTH_COOKIE" is not exported by "lib/auth/service.ts"`

Impacto:
- Impide build productivo SSR (`deno task build` falla), por lo que el estado de integración en `dev` no está listo para liberar sin corrección.

### 2.5 Checks técnicos base

#### Lint (scope razonable)

```bash
deno lint lib/auth routes/api/auth routes/admin/users.tsx routes/_middleware.ts routes/login.tsx
```

Resultado: `Checked 20 files` (PASS)

#### Tests auth relevantes

```bash
deno test --unstable-kv lib/auth/guards_test.ts lib/auth/types_test.ts
```

Resultado:
- `5 passed | 0 failed` (PASS)

#### Smoke script

Búsqueda:
```bash
rg -n "smoke" -S .
```

Resultado: sin coincidencias (N/A)

## 3) Bloqueadores

### Críticos
1. **Build roto en SSR** por import inválido en `routes/login.tsx` (`AUTH_COOKIE` no exportado desde `lib/auth/service.ts`).
2. **Flujo funcional auth/RBAC no validable en positivo** bajo runtime actual de auditoría (`deno task dev`), con login siempre 401.

### No críticos
1. No hay script smoke explícito para validación rápida post-merge.
2. Dependencia de credenciales históricas en KV (seed actualiza roles, no password) dificulta reproducibilidad QA si no se recrean usuarios.

## 4) Recomendación QA

## **NO-GO**

Motivo: existe bloqueador crítico de build SSR y no se pudo certificar funcionalmente auth/RBAC en condición de éxito end-to-end sobre rama `dev`.

## 5) Siguiente paso sugerido para destrabar

1. Corregir import en `routes/login.tsx` (usar fuente correcta para cookie/TTL o remover dependencia obsoleta).
2. Re-ejecutar `deno task build` hasta PASS.
3. Levantar runtime que ejecute rutas Fresh + API auth en entorno Deno completo y repetir matriz mínima auth/RBAC.
4. Agregar smoke script básico para auth/RBAC/UI theme persistence.
