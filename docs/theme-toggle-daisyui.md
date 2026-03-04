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
