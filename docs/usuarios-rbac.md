# Usuarios y permisos (RBAC) — Edison

## Decisión
Se implementa **Opción A**: autenticación propia en Deno KV, con abstracción `AuthProvider` para migrar luego a OAuth/SSO sin romper APIs.

## Roles
- `admin`
- `analyst`
- `viewer`

## Usuarios iniciales solicitados
- admin → `admin@edison.local` / `milanesadepollo`
- analyst → `analyst@edison.local` / `milanesa`
- visit → `visit@edison.local` / `clave123` (rol `viewer`)

## Vistas por rol
- `/dashboard/admin` → solo `admin`
- `/dashboard/analyst` → solo `analyst`
- `/dashboard/visit` → solo `viewer`

## Acceso
- Landing pública: `/`
- Login público: `/login`
- Resto de vistas: requiere sesión.

## Comandos de gestión de usuarios

### Crear usuarios base
```bash
deno task users:seed
```

### Listar usuarios
```bash
deno task users:list
```

### Crear usuario
```bash
deno run -A scripts/users.ts create \
  --email=ejemplo@edison.local \
  --name="Ejemplo" \
  --password="secreta" \
  --roles=viewer
```

### Modificar roles
```bash
deno run -A scripts/users.ts update-roles \
  --email=ejemplo@edison.local \
  --roles=analyst
```

### Eliminar usuario
```bash
deno run -A scripts/users.ts delete \
  --email=ejemplo@edison.local
```
