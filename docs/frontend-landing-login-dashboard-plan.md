# Plan Frontend: Landing + Login + Dashboard por Rol (Nanaisoft/Edison)

## 1) Objetivo
Diseñar e implementar una experiencia frontend coherente para:
- **Landing pública de Nanaisoft** (valor de producto + acceso a login).
- **Login seguro** con feedback claro.
- **Dashboard por rol** (`admin`, `analyst`, `viewer`) con navegación y permisos consistentes.
- **UX de administración de usuarios** para rol admin.
- **Guardas de ruta** y **estados de error** transversales.

Este plan toma como base la estructura actual de Fresh en el repo (`routes/index.tsx`, `routes/login.tsx`, `routes/dashboard*`, `routes/_middleware.ts`, `lib/auth/guards.ts`, `routes/api/admin/users.ts`).

---

## 2) Estado actual resumido
- Ya existe:
  - Landing base en `/` con CTA a login/dashboard.
  - Login por formulario en `/login` con redirección y mensaje por query param.
  - Router `/dashboard` que redirige por rol.
  - Vistas separadas por rol en:
    - `/dashboard/admin`
    - `/dashboard/analyst`
    - `/dashboard/visit` (viewer)
  - Middleware de auth global y guards (`requireAuth`, `requireRole`, `requirePermission`).
  - API para usuarios admin en `GET/POST /api/admin/users`.
- Falta reforzar:
  - Sistema visual común (layout, navegación, estados vacíos/error/loading).
  - Manejo UX de errores 401/403/500/timeout.
  - Flujo completo de administración de usuarios (listado, alta, feedback, validaciones).
  - Guardas más predecibles (mejor redirección/forbidden UX en página dedicada).

---

## 3) Arquitectura UX propuesta

## 3.1 Layouts y navegación
- **Layout público** (`/` y `/login`): header simple con branding Nanaisoft.
- **Layout privado dashboard**: sidebar/topbar con:
  - Perfil de usuario logueado.
  - Rol activo.
  - Botón logout.
  - Menú contextual por permisos.
- **Principio de navegación**: no mostrar ítems que el usuario no puede usar.

## 3.2 Estrategia de autorización en frontend
- Mantener guard en servidor (middleware + handlers) como fuente de verdad.
- En UI:
  - Render condicional por permisos para CTA/botones.
  - Mensajes claros cuando no hay acceso (en lugar de pantalla en blanco).
- Ruta de fallback recomendada:
  - Si autenticado sin permiso -> `/dashboard/forbidden` (en vez de `Response("Forbidden")` plano).

## 3.3 Estados transversales de interfaz
Definir componentes reutilizables:
- `LoadingState`
- `EmptyState`
- `ErrorState` (con reintento)
- `ForbiddenState`
- `InlineAlert` (éxito/error/info)

---

## 4) Plan por feature

## 4.1 Landing Nanaisoft (`/`)
**Objetivo UX**: comunicar propuesta de valor de Edison y convertir a login/demo.

**Contenido mínimo**:
- Hero (qué resuelve Edison).
- Bloques: beneficios, capacidades analíticas, confianza.
- CTA principal: “Iniciar sesión”.
- CTA secundaria (opcional): “Solicitar demo” (placeholder si backend no existe).

**Criterios**:
- Accesibilidad básica (contraste, headings correctos, focus visible).
- Responsive mobile-first.
- Si hay sesión activa: CTA directo a `/dashboard`.

## 4.2 Login (`/login`)
**Objetivo UX**: acceso rápido, seguro y con errores entendibles.

**Mejoras**:
- Validaciones de frontend (email válido, campos obligatorios, longitud mínima password si aplica).
- Estados del botón submit: normal/loading/disabled.
- Mensajes de error por tipo:
  - credenciales inválidas,
  - campos faltantes,
  - error de red/servidor.
- Opcional: show/hide password y recordar sesión (si política lo permite).

**Criterios**:
- Evitar doble envío.
- Mantener foco en primer campo con error.
- Si ya está autenticado, redirigir o CTA claro a dashboard.

## 4.3 Dashboard por rol (`/dashboard/*`)
**Objetivo UX**: cada rol ve lo necesario para su operación.

### Admin (`/dashboard/admin`)
- KPI/resumen rápido de gestión.
- Acceso a módulo “Usuarios”.
- Acciones de administración visibles y trazables.

### Analyst (`/dashboard/analyst`)
- Acceso a panel analítico (resúmenes, filtros, reportes).
- UI enfocada en lectura y exploración.

### Viewer (`/dashboard/visit`)
- Vista de solo lectura simplificada.
- Sin controles de escritura.

**Criterios comunes**:
- Consistencia visual entre roles.
- Breadcrumb/título de sección.
- Estados loading/empty/error en cada bloque.

## 4.4 UX de administración de usuarios (Admin)
**Objetivo UX**: crear y visualizar usuarios sin ambigüedad.

**Flujo mínimo V1**:
1. Listar usuarios (`GET /api/admin/users`).
2. Crear usuario (`POST /api/admin/users`) con formulario:
   - email,
   - displayName,
   - password temporal,
   - roles (`admin`, `analyst`, `viewer`).
3. Confirmación visual de éxito + refresco de listado.
4. Manejo de errores de validación/API.

**Componentes sugeridos**:
- `UsersTable`
- `CreateUserForm`
- `RoleBadge`
- `PermissionGate` (wrapper UI por permiso)

**Reglas UX**:
- Mostrar acciones solo si `users.write`.
- Mensajes de error accionables (ej: “el email ya existe”).
- Confirmar intención en acciones sensibles futuras (delete/reset password).

---

## 5) Guardas de ruta y control de acceso

## 5.1 Middleware global
Mantener `routes/_middleware.ts` para:
- Resolver sesión por cookie.
- Popular `ctx.state.auth`.
- Redirigir anónimos a `/login` en rutas privadas.

Ajustes recomendados:
- Verificar whitelist de rutas públicas (incluir potenciales assets adicionales).
- Estandarizar respuesta para API privadas: JSON 401/403 en vez de redirect HTML cuando corresponda.

## 5.2 Guards por página
Usar `requireRole` / `requirePermission` por ruta privada.
Mejora sugerida:
- Reemplazar `Response("Forbidden", 403)` por redirect/render a pantalla 403 amigable.

## 5.3 Matriz de acceso (propuesta)
- `/dashboard/admin` -> `role: admin`
- `/dashboard/analyst` -> `role: analyst`
- `/dashboard/visit` -> `role: viewer`
- `/dashboard/admin/users` (nueva ruta sugerida) -> `permission: users.read`
- Acciones crear usuario -> `permission: users.write`

---

## 6) Estados de error y resiliencia

## 6.1 Errores de autenticación/autorización
- **401 (no autenticado)**: redirect a login con mensaje breve.
- **403 (sin permiso)**: página dedicada con CTA “Volver al dashboard”.

## 6.2 Errores de backend/API
- Timeouts/red: mensaje “No se pudo conectar” + botón reintentar.
- 5xx: estado de error genérico con ID de incidente (si existe).
- Errores de validación: mensajes inline por campo.

## 6.3 Errores de UI
- Error boundary por sección crítica del dashboard (si aplica en Fresh).
- Fallback visual consistente, nunca pantalla en blanco.

---

## 7) Backlog por rutas/componentes

## 7.1 Rutas

### `routes/index.tsx` (Landing)
- [ ] Reestructurar secciones (Hero, beneficios, CTA).
- [ ] Ajustar copy a marca Nanaisoft + Edison.
- [ ] Mejorar responsive y accesibilidad.
- [ ] Añadir CTA condicional según sesión.

### `routes/login.tsx`
- [ ] Mejorar manejo de errores (tipo/estilo/mensajes).
- [ ] Añadir estado loading y bloqueo de doble submit.
- [ ] Validación de campos con feedback inline.
- [ ] Revisar título/metadatos y consistencia visual con landing.

### `routes/dashboard.tsx`
- [ ] Centralizar lógica de redirección por rol con fallback explícito.
- [ ] Definir comportamiento cuando rol desconocido/no mapeado.

### `routes/dashboard/admin.tsx`
- [ ] Crear home admin con cards/resumen.
- [ ] Enlace al módulo de usuarios.
- [ ] Aplicar layout dashboard común.

### `routes/dashboard/analyst.tsx`
- [ ] Diseñar vista base analista (widgets iniciales).
- [ ] Integrar estados loading/empty/error por widget.

### `routes/dashboard/visit.tsx`
- [ ] Diseñar vista viewer orientada a lectura.
- [ ] Ocultar acciones de escritura.

### `routes/dashboard/forbidden.tsx` (nueva)
- [ ] Crear página 403 amigable con CTA de retorno.

### `routes/dashboard/admin/users.tsx` (nueva)
- [ ] Implementar vista de gestión de usuarios.
- [ ] Consumir `GET /api/admin/users`.
- [ ] Integrar formulario alta de usuario contra `POST /api/admin/users`.

### `routes/_middleware.ts`
- [ ] Revisar lista de rutas públicas.
- [ ] Diferenciar manejo HTML vs API para no autenticado.

## 7.2 Componentes

### `components/layout/PublicLayout.tsx` (nuevo)
- [ ] Header público + contenedor de contenido.

### `components/layout/DashboardLayout.tsx` (nuevo)
- [ ] Sidebar/topbar, logout, info usuario, menú por permisos.

### `components/auth/LoginForm.tsx` (nuevo o refactor)
- [ ] Inputs, validaciones, loading y errores.

### `components/states/*` (nuevos)
- [ ] `LoadingState.tsx`
- [ ] `EmptyState.tsx`
- [ ] `ErrorState.tsx`
- [ ] `ForbiddenState.tsx`
- [ ] `InlineAlert.tsx`

### `components/admin/users/*` (nuevos)
- [ ] `UsersTable.tsx`
- [ ] `CreateUserForm.tsx`
- [ ] `RoleBadge.tsx`
- [ ] `UserFormValidation.ts` (esquema/validaciones)

### `components/auth/PermissionGate.tsx` (nuevo)
- [ ] Render condicional por permisos en frontend.

## 7.3 Auth/guards

### `lib/auth/guards.ts`
- [ ] Homogeneizar respuestas de no autorizado/no autenticado.
- [ ] Definir helper para redirect a `/dashboard/forbidden`.

### `lib/auth` (servicios auxiliares)
- [ ] Exponer utilidades de permisos para UI (si falta).

---

## 8) Priorización sugerida (sprints cortos)

## Sprint 1 (base UX + seguridad)
- Layouts público/privado.
- Mejoras de login.
- Página forbidden + guardas consistentes.
- Componentes de estado compartidos.

## Sprint 2 (dashboard por rol)
- Home admin/analyst/viewer con estructura real.
- Navegación contextual por permisos.

## Sprint 3 (admin usuarios V1)
- Ruta `/dashboard/admin/users`.
- Listado + alta de usuario + validaciones + feedback.
- Estados de error/reintento robustos.

---

## 9) Definición de listo (DoD)
- Rutas protegidas no filtran información a usuarios sin sesión.
- Usuario sin permiso recibe experiencia 403 clara.
- Login y alta de usuarios muestran errores comprensibles.
- Dashboard por rol tiene navegación y contenido consistente.
- Componentes de estado reutilizados en pantallas críticas.
- Validación mínima de accesibilidad (teclado, foco, labels, contraste).
