# Edison V2 — Plan enfocado (Data Warehouse + Seguimiento Comercial)

## Contexto clave (alineado)
No vamos a replicar n8n 1:1.
El flujo `service 2.0` se usa solo como contexto de negocio: entender señales, filtros y trazabilidad.

Objetivo real de Edison:
1. Construir **data warehouse propio** de licitaciones Mercado Público.
2. Habilitar **inteligencia de negocios** para concursar mejor.
3. Permitir **seguimiento operativo** por licitación (estados, notas, ownership).
4. Persistir en **Deno KV (codex)**, backend en Deno/Fresh, frontend Fresh + Tailwind, deploy en Deno Deploy.

---

## 1) Enfoque de producto (MVP real)

### MVP-1 (imperante ahora)
- Ingesta histórica inicial (hasta 2020, por lotes/ventanas).
- Modelo canónico de licitación en Deno KV.
- CRUD de gobernanza/seguimiento (estado, notas, etiquetas, responsable).
- Kanban con filtros y búsqueda.
- Métricas base para toma de decisión.
- Auditoría de cambios funcional (quién/cómo/cuándo cambió algo).

### MVP-2 (después)
- Actualización diaria incremental desde API Mercado Público.
- Detección de cambios de campos externos (ej. proveedores cotizando, monto, cierre).
- Registro automático de diff/histórico por campo.

---

## 2) Arquitectura recomendada (Deno/Fresh/Deno KV)

### 2.1 Dominios de datos separados
1. **Datos fuente (externos)**: lo que llega de Mercado Público.
2. **Datos internos (comerciales)**: estado Kanban, notas, prioridad, owner.
3. **Datos analíticos**: agregados/métricas/materializaciones para dashboard.

Evitar sobrescribir datos internos con refresh externo.

### 2.2 Esquema lógico en KV
- `['codex','licitacion',id]` → snapshot canónico externo + metadata.
- `['codex','seguimiento',id]` → estado interno (kanban/notas/owner/tags).
- `['codex','historial',id,ts]` → eventos (origen=externo|interno, campo, old/new).
- Índices por prefijo para filtros rápidos:
  - región/ciudad
  - organismo
  - SKU
  - estado
  - mes/año cierre

### 2.3 Upsert correcto (sin destrucción)
- **INSERT** si no existe.
- **MERGE UPDATE** solo de campos externos si cambian.
- **NOOP** si hash equivalente.
- Campos internos siempre preservados.

---

## 3) API mínima (Fresh handlers)
- `GET /api/licitaciones` (filtros + paginación)
- `GET /api/licitaciones/:id`
- `PATCH /api/licitaciones/:id/seguimiento` (estado/notas/tags/owner)
- `GET /api/licitaciones/:id/historial`
- `GET /api/metricas` (totales, montos, distribución por estado/región/organismo)

Nota Fresh 2.x: usar handlers con `ctx` y retorno `{ data: ... }` para páginas SSR.

---

## 4) UI Fresh + Tailwind (operación comercial)

### Vistas
1. **Kanban principal** por estado.
2. **Tabla analítica** con filtros combinables.
3. **Ficha de licitación** (detalle + actividad + notas).

### Filtros prioritarios
- ID licitación
- región/ciudad
- SKU
- organismo
- cantidad proveedores cotizando
- monto disponible CLP
- estado interno

### Estados sugeridos
`nuevo`, `analizando`, `cotizando`, `cotizado`, `licitado`, `orden_compra`, `pagado`, `descartado`.

---

## 5) Backfill histórico (2020 → hoy)

Ejecución por ventanas mensuales:
- cursor: `from`, `to`, `page`.
- checkpoint persistido en KV:
  - `['codex','jobs','backfill','checkpoint']`.
- idempotencia por `idLicitacion + hashPayload`.

Resultado esperado:
- población estable de la bodega antes de optimizar incremental diario.

---

## 6) Gobernanza de datos (CRUD + auditoría)
Cada cambio interno debe generar evento:
- actor (user/system)
- timestamp
- campo
- valor anterior
- valor nuevo
- motivo/opcional

Esto habilita trazabilidad y métricas de proceso comercial.

---

## 7) Métricas BI iniciales (prioridad negocio)
- Nº licitaciones por estado y por período.
- Pipeline por monto (CLP) y probabilidad (score).
- Conversión entre estados (ej. cotizando → adjudicado).
- Top organismos y regiones con mejor desempeño.
- Tiempo promedio por etapa.

---

## 8) Checklist técnico Deno (skills aplicado)
- Dependencias por `jsr:`/`npm:` con `deno add`.
- Estructura Fresh 2.x con rutas + islands mínimas.
- Separar componentes SSR de UI interactiva.
- Ejecutar siempre: `deno fmt`, `deno lint`, `deno test`.
- Deploy: `deno task build` + `deno deploy --prod`.
- Secretos/API keys por env vars (no hardcoded).

---

## 9) Orden de implementación recomendado (sprintable)
1. Modelo de datos KV + índices + contratos TS.
2. Endpoints API de lectura + patch seguimiento + historial.
3. Kanban y tabla con filtros.
4. Runner de backfill 2020→hoy con checkpoint.
5. Dashboard de métricas base.
6. (Luego) incremental diario + detección de diffs automáticos.

---

## Decisión de arquitectura
**Edison = sistema propio orientado a data warehouse + operación comercial.**
n8n queda como referencia de reglas y, si conviene, orquestación futura; no como diseño fuente de backend.