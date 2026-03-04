# Edison3 — Plan DBA de modelo de usuarios ELLIS en DenoKV

## Objetivo

Definir un modelo de datos simple y trazable para `users`, `sessions` y
`audit_events` en DenoKV, con:

- claves/índices lógicos explícitos,
- estrategia de seed local reproducible,
- migración limpia desde auth existente en PocketBase.

---

## 1) Modelo de datos propuesto

## 1.1 `users`

Entidad principal de identidad y estado operativo del usuario.

```ts
export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: string; // UUID/ULID interno
  email: string; // normalizado (lowercase, trim)
  emailVerified: boolean;
  name: string;
  roles: UserRole[]; // mínimo 1 rol

  passwordHash: string; // argon2id recomendado
  passwordAlgo: "argon2id";
  passwordUpdatedAt: string; // ISO8601

  status: "active" | "suspended" | "blocked" | "deleted";
  failedLoginCount: number;
  lockedUntil?: string; // ISO8601 opcional

  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  lastLoginAt?: string; // ISO8601 opcional

  source: "local" | "pocketbase-migrated";
  legacy?: {
    pocketbaseUserId?: string;
    migratedAt?: string;
  };
}
```

### Reglas de integridad (aplicación)

- `email` único global (case-insensitive; almacenar ya normalizado).
- No permitir `roles: []`.
- `status=deleted` = borrado lógico (sin remover auditoría histórica).
- No guardar contraseñas en texto plano, solo hash.

---

## 1.2 `sessions`

Sesiones autenticadas por token opaco hasheado (no guardar token en claro).

```ts
export interface Session {
  id: string; // sessionId (UUID/ULID)
  userId: string;
  tokenHash: string; // SHA-256/512 del token opaco

  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  expiresAt: string; // ISO8601
  revokedAt?: string; // ISO8601

  ip?: string;
  userAgent?: string;

  reason?: "login" | "refresh" | "admin_revoke" | "logout";
}
```

### Reglas

- Una sesión revocada o expirada no debe validar.
- Rotación de sesión en eventos sensibles (cambio de contraseña/rol).
- TTL funcional controlado por `expiresAt` + job de limpieza.

---

## 1.3 `audit_events`

Bitácora inmutable para trazabilidad de seguridad y operaciones admin.

```ts
export interface AuditEvent {
  id: string; // ULID recomendado (orden temporal)
  ts: string; // ISO8601

  actorUserId?: string; // null para sistema
  actorType: "user" | "system";

  action:
    | "auth.login.success"
    | "auth.login.failed"
    | "auth.logout"
    | "auth.session.revoked"
    | "user.created"
    | "user.updated"
    | "user.roles.updated"
    | "user.status.updated"
    | "user.password.reset"
    | "migration.user.imported";

  targetType?: "user" | "session" | "system";
  targetId?: string;

  result: "success" | "failure";
  reason?: string;

  ip?: string;
  userAgent?: string;

  metadata?: Record<string, unknown>; // diff mínimo/sanitizado
}
```

### Reglas

- Inmutable (solo append).
- Nunca almacenar secretos (token, password, hash completo si no es necesario).
- Retención definida por compliance interna (p. ej. 12 meses online + archivo).

---

## 2) Claves e índices lógicos en DenoKV

> Nota: DenoKV no tiene "índices secundarios" como SQL; se modelan como claves
> auxiliares.

## 2.1 `users`

### Registro principal

- `['users', userId] -> User`

### Índices

- `['users_by_email', email] -> userId`
- `['users_by_status', status, userId] -> 1`
- `['users_by_role', role, userId] -> 1` (una clave por rol)
- `['users_by_created_at', createdAt, userId] -> 1` (para paginación temporal)

### Operación atómica crítica

Creación de usuario con unicidad de email:

- `kv.atomic().check({ key:['users_by_email', email], versionstamp:null })`
- `set(['users', userId], user)`
- `set(['users_by_email', email], userId)`
- `set([...índices derivados...])`

---

## 2.2 `sessions`

### Registro principal

- `['sessions', sessionId] -> Session`

### Índices

- `['sessions_by_token_hash', tokenHash] -> sessionId` (lookup en middleware
  auth)
- `['sessions_by_user', userId, sessionId] -> expiresAt` (listar/revocar por
  usuario)
- `['sessions_by_expiry', expiresAt, sessionId] -> 1` (garbage collector)
- opcional activo: `['active_session_by_user', userId, sessionId] -> 1`

### Operaciones críticas

- Login: inserta sesión + índices en transacción atómica.
- Logout/revoke: marca `revokedAt` y elimina índice activo si existe.

---

## 2.3 `audit_events`

### Registro principal

- `['audit_events', eventId] -> AuditEvent`

### Índices

- `['audit_by_ts', ts, eventId] -> 1`
- `['audit_by_actor', actorUserId, ts, eventId] -> 1`
- `['audit_by_target', targetType, targetId, ts, eventId] -> 1`
- `['audit_by_action', action, ts, eventId] -> 1`

Esto permite queries típicas de seguridad/admin sin escaneo completo.

---

## 3) Estrategia de seed local

## 3.1 Objetivo del seed

- Levantar entorno dev con usuarios base ELLIS,
- datos mínimos para probar RBAC, sesiones y auditoría,
- ejecución idempotente y segura.

## 3.2 Datos sugeridos

- `admin@edison.local` → `admin`
- `analyst@edison.local` → `analyst`
- `visit@edison.local` → `viewer`

Con estados `active`, `emailVerified=true`, y password hasheada.

## 3.3 Script y flujo

Proponer `scripts/users_seed.ts` con modo:

- `--reset` (solo local): limpia prefijos `users/*`, `sessions/*`, `audit_*`.
- `--upsert`: crea/actualiza usuarios semilla sin duplicar.
- genera eventos `audit` de tipo `user.created` o `user.updated`.

Orden recomendado:

1. Validar que corre en entorno local (`ENV=development`).
2. Aplicar creación/upsert de users en atomic batches.
3. Validar índices (`users_by_email`, `users_by_role`).
4. Imprimir resumen final.

## 3.4 Buenas prácticas

- Contraseñas semilla solo para local, nunca en prod.
- Parametrizar credenciales por variables de entorno.
- Incluir `deno task users:seed` en `deno.json`.

---

## 4) Plan de migración limpia desde PocketBase auth

## 4.1 Criterios de “limpia”

- Sin downtime perceptible para login estándar.
- Sin pérdida de usuarios activos ni historial crítico.
- Reversible durante ventana de transición.

## 4.2 Supuestos prácticos

- PocketBase actual tiene usuarios auth con `id`, `email`, `name`, `verified`,
  `created`, `updated`, estado/flags.
- Password hash puede no ser portable/reutilizable en el nuevo verificador.

## 4.3 Estrategia recomendada (2 fases)

### Fase A — Importación base (sin corte)

1. Exportar usuarios PocketBase (JSON/CSV/API).
2. Transformar a esquema `User` DenoKV:
   - mapear IDs legacy a `legacy.pocketbaseUserId`,
   - normalizar email,
   - asignar roles iniciales por regla de negocio,
   - `source='pocketbase-migrated'`.
3. Cargar en DenoKV con upsert por email (atomic check).
4. Crear `audit_events` con `migration.user.imported`.
5. Reporte de reconciliación: total exportado vs importado vs rechazado.

### Fase B — Cutover de autenticación

1. Cambiar app para autenticar contra DenoKV (feature flag).
2. Password strategy:
   - Opción segura recomendada: forzar reset de contraseña en primer login
     post-migración.
   - Alternativa: migración perezosa si algoritmo PB es verificable (solo si se
     implementa verificador confiable).
3. Mantener PocketBase en solo lectura por ventana corta de verificación.
4. Monitorear métricas: login success/fail rate, lockouts, creación de sesiones.
5. Cierre: desactivar auth PB y conservar respaldo exportado cifrado.

## 4.4 Rollback plan

- Mientras dure ventana de corte:
  - feature flag permite volver a PB auth,
  - datos nuevos en DenoKV se preservan para reintento posterior,
  - auditoría registra `auth.session.revoked` y eventos de rollback si aplica.

## 4.5 Checklist de migración

- [ ] Script de export PB validado
- [ ] Script de import DenoKV idempotente
- [ ] Reconciliación de conteos y muestreo de usuarios
- [ ] Política de reset de password definida
- [ ] Feature flag de cutover probado
- [ ] Plan de rollback ensayado
- [ ] Auditoría y logging activo

---

## 5) Riesgos y mitigaciones

- **Colisión/case en email** → normalización estricta + índice único por email
  normalizado.
- **Sesiones huérfanas** → job de limpieza por `sessions_by_expiry`.
- **Sobrecarga de auditoría** → metadata mínima + políticas de retención.
- **Fallo en migración de password** → flujo de reset obligatorio controlado.

---

## 6) Entregables técnicos mínimos

1. Módulo `lib/auth/repo_users.ts` con operaciones CRUD + índices.
2. Módulo `lib/auth/repo_sessions.ts` con create/validate/revoke.
3. Módulo `lib/audit/repo_audit.ts` append-only + filtros básicos.
4. `scripts/users_seed.ts` idempotente.
5. `scripts/migrate_pocketbase_users.ts` + reporte de reconciliación.

Con esto se cubre base sólida para auth ELLIS en DenoKV, RBAC inicial y
trazabilidad operativa.

---

## 7) Implementación aplicada en `nanai-dba-user-model-audit`

### Módulos creados

- `lib/auth/kv_keyspace.ts`: definición única de prefijos y helpers de clave.
- `lib/auth/repo_users.ts`: repositorio de usuarios + índices lógicos (`email`,
  `role`) con operaciones atómicas.
- `lib/auth/repo_sessions.ts`: repositorio de sesiones + índices (`by_user`,
  `by_expiry`) y borrado por usuario.
- `lib/audit/types.ts`: tipos de eventos de auditoría.
- `lib/audit/repo_audit_events.ts`: append-only de auditoría + índices de
  lectura (`by_ts`, `by_actor`, `by_target`).

### Integración

- `lib/auth/kv_provider.ts` ahora usa repositorios y registra eventos de
  auditoría en acciones críticas:
  - `user.created`
  - `user.roles.updated`
  - `user.deleted`
  - `auth.login.success`
  - `auth.logout`

### Índices lógicos implementados

- Usuarios:
  - `['edison','auth','users', userId] -> AuthUser`
  - `['edison','auth','users_by_email', email] -> userId` (unicidad por
    `check versionstamp:null`)
  - `['edison','auth','users_by_role', role, userId] -> 1`
- Sesiones:
  - `['edison','auth','sessions', sessionId] -> SessionRecord`
  - `['edison','auth','sessions_by_user', userId, sessionId] -> expiresAt`
  - `['edison','auth','sessions_by_expiry', expiresAt, sessionId] -> 1`
- Auditoría:
  - `['edison','auth','audit_events', eventId] -> AuditEvent`
  - `['edison','auth','audit_by_ts', ts, eventId] -> 1`
  - `['edison','auth','audit_by_actor', actorUserId, ts, eventId] -> 1`
  - `['edison','auth','audit_by_target', targetType, targetId, ts, eventId] -> 1`

### Seed local idempotente

- Script: `scripts/users_seed.ts`
- Crea/actualiza dos usuarios demo:
  - `admin@edison.local` (`admin`)
  - `analyst@edison.local` (`analyst`)

### Plantilla de migración PocketBase

- Script: `scripts/migrate_pocketbase_auth.ts`
- Recibe JSON de auth exportado y opera en `dry-run` por defecto.
- Solo crea usuarios faltantes; no elimina ni modifica registros existentes.
