# Evaluación rápida stack UI (Edison3: Fresh + Deno)

## 1) Factibilidad técnica real de integrar DaisyUI en el stack actual

**Conclusión corta:** Sí, es técnicamente factible y de bajo roce.

### Evidencia del stack actual
- Proyecto en **Fresh 2.x** (`jsr:@fresh/core@^2.2.0`) con **Vite**.
- Ya usa **Tailwind v4** (`tailwindcss@^4.1.x`) + plugin Vite (`@tailwindcss/vite`).
- Estilos actuales mayormente con utilidades Tailwind en páginas (`routes/index.tsx`, `routes/login.tsx`, `islands/LoginForm.tsx`).

### Implicación
DaisyUI se monta sobre Tailwind, por lo que la integración no exige cambiar arquitectura Fresh/Islands ni reescribir routing/SSR. La adopción sería incremental por componente/pantalla.

### Nota técnica importante
Con Tailwind v4, la integración de DaisyUI se debe validar en una rama de prueba (configuración de plugin/estilos globales) antes de migrar vistas críticas. No hay bloqueo técnico visible, pero sí conviene un smoke test de build + preview para confirmar compatibilidad exacta de versión.

---

## 2) Estimación de tiempo de integración y riesgo de retrabajo

## Escenario recomendado (adopción parcial para Sprint)
- **Setup inicial + tema base + smoke test:** 0.5 día
- **Aplicar a Landing + Login (UI core):** 0.5–1 día
- **Ajustes visuales/accesibilidad + QA visual:** 0.5 día
- **Total Sprint:** **1.5 a 2 días**

## Riesgo de retrabajo
- **Bajo–Medio** si se limita a componentes de superficie (botones, cards, forms, navbar).
- **Medio** si se intenta “restyling masivo” del dashboard en el mismo Sprint.

### Fuentes de retrabajo probables
1. Ajuste de tema (branding Nanaisoft) para no quedar “look genérico DaisyUI”.
2. Clases utilitarias existentes que choquen con clases de componente DaisyUI.
3. Correcciones de estados interactivos (focus/error/loading) en formularios.

---

## 3) Alternativas viables (comparación breve)

| Opción | Setup | DX | Consistencia visual | Costo mantenimiento |
|---|---|---|---|---|
| **DaisyUI** | **Rápido** (sobre Tailwind existente) | Muy buena para velocidad | Alta al inicio, depende de theming para branding | Medio-bajo (si se define sistema de tema desde el día 1) |
| **Tailwind puro + design tokens propios** | Medio | Buena, más manual | Muy alta (control total) | **Medio-alto** (más trabajo continuo) |
| **shadcn/ui (adaptado a Preact/Fresh)** | Medio-alto | Muy buena en React estándar, en Fresh requiere adaptación | Alta | Medio-alto (upstream pensado para React/Next, más fricción en Deno/Fresh) |

### Lectura rápida
- Si el objetivo principal es **salir rápido con UI consistente**, DaisyUI gana en time-to-value.
- Si el objetivo principal es **control de diseño a largo plazo** desde el día 1, Tailwind + sistema propio gana, pero cuesta más Sprint actual.
- shadcn/ui no es la opción más eficiente hoy para Fresh+Deno por fricción de integración.

---

## 4) Recomendación concreta para Sprint actual

**Recomiendo adoptar DaisyUI de forma acotada en este Sprint** para Landing + Login + componentes base reutilizables (button/input/card/navbar), dejando dashboard profundo para siguiente iteración.

### Por qué
- Ya existe Tailwind en el proyecto, por lo que el costo de entrada es bajo.
- Permite mejorar consistencia visual de inmediato sin rediseñar toda la app.
- Minimiza riesgo al atacar primero pantallas de entrada (impacto alto, acoplamiento bajo).

**Decisión práctica:** DaisyUI ahora, pero con guardrails (tema/tokens y catálogo mínimo de componentes) para no depender del estilo por defecto.

---

## 5) Plan de adopción en 3 pasos (si se aprueba)

### Paso 1 — Spike técnico corto (medio día)
- Integrar DaisyUI en rama.
- Definir 1 tema base (colores, radius, tipografía) alineado a Nanaisoft.
- Validar: `deno task check`, `deno task build`, `deno task start`.

### Paso 2 — Pilot controlado (0.5–1 día)
- Migrar **Landing + Login** a componentes DaisyUI.
- Estandarizar estados: hover/focus/disabled/error/loading.
- Crear guía mínima en `docs/` con reglas de uso (qué componente usar y cuándo).

### Paso 3 — Consolidación (0.5 día)
- Extraer wrappers reutilizables en `components/ui/*` para desacoplar del vendor.
- Checklist de regresión visual en rutas críticas.
- Definir backlog de migración dashboard por bloques (no “big bang”).

---

## Veredicto final
Para **velocidad + mantenibilidad en este Sprint**, **DaisyUI es una buena opción ahora** si se adopta de forma incremental y con tema base definido desde el inicio. La alternativa más balanceada distinta sería Tailwind puro con sistema propio, pero no compite en tiempo de entrega inmediata.