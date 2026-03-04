# Plan Backend Auth + RBAC (ELLIS)

## Objetivo
Implementar un sistema de autenticación y autorización para ELLIS en un **monolito modular** sobre **Deno + DenoKV**, con sesiones seguras, roles `analyst` / `admin`, y auditoría trazable.

---

## 1) Diseño modular (monolito)

### Módulos propuestos
- `auth/`
  - login, logout, refresh, validación de sesión.
- `users/`
  - perfil propio, administración de usuarios (admin).
- `rbac/`
  - definición de permisos por rol y middleware de autorización.
- `audit/`
  - registro y consulta de eventos de seguridad.

### Contratos internos
- `auth` expone: `createSession`, `validateSession`, `revokeSession`.
- `rbac` expone: `can(role, action, resource)` + middlewares de guardia.
- `audit` expone: `logEvent(event)`.

Esto permite evolucionar a microservicios en el futuro sin romper límites de dominio.

---

## 2) Endpoints backend

Base sugerida: `/api/v1`

### Auth
- `POST /auth/login`
  - Input: `{ email, password }`
  - Output: `200` + cookie HttpOnly de sesión + datos mínimos de usuario.
- `POST /auth/refresh`
  - Renueva TTL/rotación de sesión activa.
- `POST /auth/logout`
  - Invalida sesión actual.
- `GET /auth/me`
  - Devuelve usuario autenticado y rol.

### Usuarios
- `GET /users/me`
  - Perfil del usuario autenticado.
- `PATCH /users/me`
  - Actualiza datos permitidos del propio usuario.
- `GET /users` *(admin)*
  - Lista usuarios con filtros/paginación.
- `POST /users` *(admin)*
  - Crea usuario con rol inicial (`analyst` o `admin`).
- `PATCH /users/:id/role` *(admin)*
  - Cambia rol de usuario.
- `PATCH /users/:id/status` *(admin)*
  - Activa/desactiva cuenta.

### Auditoría
- `GET /audit/events` *(admin)*
  - Lista eventos auditables (filtros por actor, acción, rango fecha).

---

## 3) Modelo de sesión (DenoKV)

### Estructuras KV
- `['users', userId] -> { id, email, passwordHash, role, status, createdAt, updatedAt }`
- `['usersByEmail', email] -> userId`
- `['sessions', sessionId] -> { userId, role, createdAt, expiresAt, lastSeenAt, ipHash, uaHash, revokedAt? }`
- `['userSessions', userId, sessionId] -> true` (índice para invalidación masiva por usuario)
- `['audit', ts, eventId] -> event`

### Reglas de sesión
- Session ID aleatorio criptográfico (>=128 bits).
- Cookie `HttpOnly + Secure + SameSite=Lax`.
- TTL corto (ej. 8-12h) + refresh controlado.
- Rotación opcional de `sessionId` en refresh para reducir replay.
- Revocación explícita en logout y automática por expiración.
- Comparación de huella `ipHash/uaHash` en modo tolerante (alerta/auditoría al desvío fuerte).

---

## 4) RBAC (roles y permisos)

## Roles
- `analyst`:
  - Acceso a funcionalidades operativas/analíticas del negocio.
  - Sin capacidades de administración de usuarios ni auditoría global.
- `admin`:
  - Gestión de usuarios y roles.
  - Acceso a reportes de auditoría.

### Matriz mínima de permisos
- `auth:read_self` -> analyst, admin
- `users:read_self` -> analyst, admin
- `users:update_self` -> analyst, admin
- `users:list` -> admin
- `users:create` -> admin
- `users:update_role` -> admin
- `users:update_status` -> admin
- `audit:read` -> admin

### Recomendación técnica
Declarar permisos en mapa estático versionado:
```ts
const ROLE_PERMS = {
  analyst: new Set(['auth:read_self', 'users:read_self', 'users:update_self']),
  admin: new Set([
    'auth:read_self', 'users:read_self', 'users:update_self',
    'users:list', 'users:create', 'users:update_role', 'users:update_status', 'audit:read',
  ]),
};
```

---

## 5) Middlewares requeridos

Orden recomendado de ejecución:
1. `requestIdMiddleware`
2. `securityHeadersMiddleware`
3. `rateLimitMiddleware` (especialmente en `/auth/login`)
4. `authSessionMiddleware` (lee cookie, valida sesión en KV)
5. `rbacMiddleware(requiredPermission)`
6. `auditMiddleware` (post-handler para registrar acción/resultado)

### Comportamientos clave
- Sin sesión válida -> `401 Unauthorized`.
- Con sesión válida pero sin permiso -> `403 Forbidden`.
- Todas las denegaciones relevantes se auditan.

---

## 6) Auditoría de seguridad

### Eventos mínimos a registrar
- `auth.login.success`
- `auth.login.failed`
- `auth.logout`
- `auth.session.revoked`
- `users.created`
- `users.role_changed`
- `users.status_changed`
- `rbac.access_denied`

### Payload sugerido
```json
{
  "eventId": "uuid",
  "timestamp": "ISO8601",
  "actorUserId": "u_123",
  "actorRole": "admin",
  "action": "users.role_changed",
  "targetType": "user",
  "targetId": "u_987",
  "meta": { "oldRole": "analyst", "newRole": "admin" },
  "requestId": "req_...",
  "ipHash": "...",
  "userAgentHash": "...",
  "result": "success"
}
```

### Política
- No guardar datos sensibles en claro (IPs/User-Agent en hash).
- Retención configurable (ej. 90-180 días) con limpieza programada.

---

## 7) Orden de implementación (6 pasos)

1. **Base del dominio y KV schema**
   - Definir tipos (`User`, `Session`, `AuditEvent`) y claves KV.
   - Implementar repositorios por módulo (`authRepo`, `userRepo`, `auditRepo`).

2. **Auth core + seguridad de credenciales**
   - Hash de password (Argon2/bcrypt), login/logout/me, creación y revocación de sesión.
   - Cookie segura y validación de expiración.

3. **Middleware de autenticación**
   - Resolver sesión -> `ctx.state.user`.
   - Manejo homogéneo de `401` y errores de sesión.

4. **RBAC + guards por endpoint**
   - Matriz de permisos + `rbacMiddleware`.
   - Proteger rutas admin (`/users`, `/audit/events`).

5. **Auditoría transversal**
   - Hook de auditoría para auth y acciones admin.
   - Endpoint de consulta para `admin` con filtros básicos.

6. **Hardening + pruebas**
   - Rate limit login, tests unit/integración (auth, rbac, audit), casos 401/403.
   - Checklist de seguridad y observabilidad (requestId, logs estructurados).

---

## Criterios de aceptación
- Un `analyst` no puede ejecutar endpoints administrativos.
- Un `admin` puede gestionar usuarios y consultar auditoría.
- Sesiones expiran/revocan correctamente y no exponen tokens al frontend.
- Eventos críticos quedan auditados con trazabilidad por `requestId`.
- Arquitectura mantiene separación modular dentro del monolito.