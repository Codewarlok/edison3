# Theme toggle con DaisyUI (solo theming)

## Qué se implementó

- DaisyUI se usa únicamente para **tokens de tema** (no se migraron componentes
  a DaisyUI).
- Se definieron 2 temas:
  - `edison-light` (default)
  - `edison-dark`
- Se agregó `ThemeToggle` reusable en `islands/ThemeToggle.tsx` y se monta
  globalmente en `routes/_app.tsx`.

## Cómo funciona

1. En primera carga, un script inline en `_app.tsx` evita flicker y decide tema:
   - Si existe `localStorage["edison-theme"]`, usa ese valor.
   - Si no existe, usa `prefers-color-scheme` del navegador.
2. El botón `ThemeToggle` alterna entre `edison-light` y `edison-dark`.
3. Cada cambio persiste en `localStorage` con la key `edison-theme`.
4. El tema activo se aplica vía `data-theme` en `<html>`.

## Dónde están los temas

En `assets/styles.css`:

- `@plugin "daisyui";`
- bloques `@plugin "daisyui/theme" { ... }` para cada tema.

## Extender temas

Para agregar otro tema, duplicar un bloque:

```css
@plugin "daisyui/theme" {
  name: "edison-otro";
  default: false;
  prefersdark: false;
  color-scheme: light;

  --color-base-100: ...;
  --color-base-content: ...;
  --color-primary: ...;
  --color-primary-content: ...;
}
```

Luego, permitir ese nombre en la lógica de `ThemeToggle` si quieres que sea
seleccionable desde UI.

## Hotfix (compatibilidad login/theming con `dev`)

Fecha: 2026-03-04

- Se agregó `lib/auth/session.ts` (alineado con `dev`) con:
  - `AUTH_COOKIE`
  - `getSessionTtlMs()` (lee `EDISON_SESSION_TTL_MS` con fallback seguro)
  - `buildSessionCookie()` / `clearSessionCookie()`
  - `getCookieValue()`
- `routes/login.tsx` dejó de usar imports obsoletos desde `lib/auth/service.ts`
  y ahora usa helpers de `lib/auth/session.ts`.
- `routes/api/auth/login.ts` y `routes/api/auth/logout.ts` también migraron a
  helpers de `session.ts` para un formato de cookie único y consistente.
- `lib/auth/service.ts` ya no exporta `AUTH_COOKIE`/`SESSION_TTL_MS`; ahora
  calcula TTL vía `getSessionTtlMs()` al crear sesión.
- `ThemeToggle` DaisyUI se mantiene sin cambios funcionales y compatible con SSR
  (estado inicial seguro + aplicación de tema en cliente).

### Evidencia rápida

Comandos ejecutados en la rama `nanai-frontend-landing-login-dashboard`:

- `deno fmt lib/auth/session.ts lib/auth/service.ts routes/login.tsx routes/api/auth/login.ts routes/api/auth/logout.ts docs/theme-toggle-daisyui.md` ✅
- `deno lint lib/auth/session.ts lib/auth/service.ts routes/login.tsx routes/api/auth/login.ts routes/api/auth/logout.ts islands/ThemeToggle.tsx routes/_app.tsx` ✅
- `deno task check` ⚠️ falla por archivos no formateados preexistentes fuera de este hotfix (docs/rutas no tocadas).
- `deno task build` ⚠️ falla por import faltante preexistente `lib/auth/audit.ts` referenciado desde `lib/auth/runtime.ts`.
