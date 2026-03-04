# Edison3 — Plan de equipo para Sistema de Usuarios ELLIS

Base branch: `nanai` (desde `dev`)
Estrategia: monolito modular (Fresh + Deno + DenoKV)

## Ramas por agente
- `nanai/backend-auth-rbac`
- `nanai/frontend-landing-login-dashboard`
- `nanai/dba-user-model-audit`
- `nanai/qa-auth-rbac-e2e`
- `nanai/security-auth-hardening`

## Scope funcional
1. Landing pública Nanaisoft (SaaS BI + consultoría)
2. Login ELLIS
3. Dashboard privado
4. RBAC inicial:
   - analyst: operar licitaciones y cambios de estado
   - admin: + gestión de usuarios (crear/suspender/bloquear/listar actividad)

## Workstreams
### WS-A Backend/Auth
- Login/logout/me
- Sesiones y middleware RBAC
- Endpoints admin para gestión de usuarios

### WS-B Frontend
- Landing pública
- Login
- Dashboard por rol
- Vista admin usuarios

### WS-C Data/DBA
- Modelo `users`, `sessions`, `audit_events`
- Seed inicial para local dev
- Migración limpia desde auth PocketBase -> DenoKV

### WS-D QA/Security
- Matriz de pruebas por rol
- Casos de abuso (rate limit, lockout, sesión inválida)
- Checklist de hardening mínimo

## Definition of Done (DoD)
- Auth funcional con RBAC analyst/admin
- Admin puede crear/suspender/bloquear usuarios
- Analyst no accede a endpoints/vistas admin
- Auditoría de acciones críticas
- E2E verde en login + operaciones por rol
