# Edison / Codex – Propuesta inicial (n8n + Deno + Fresh + Deno Deploy + Deno KV)

## 1) Objetivo
Construir `edison` para:
- extraer licitaciones de Mercado Público,
- persistirlas en Deno KV (`codex`) con lógica upsert sin sobreescritura destructiva,
- exponer API de lectura/actualización,
- gestionar gobernanza (CRUD + auditoría),
- visualizar en tablero Kanban con filtros y métricas.

## 2) Evaluación del workflow n8n "service 2.0"
Fortalezas:
- paginación y loop por páginas,
- filtros de negocio (monto/proveedores),
- clasificación de criticidad y score,
- separación insertar/actualizar,
- histórico de cambios,
- logging/estadísticas.

Riesgos/Gaps para pasar a producción con Deno KV:
1. **Dependencia de Google Sheets como source of truth**: sirve para QA, pero no para backend principal.
2. **Ventana de extracción actual = 7 días** (`date_from = now - 7`): no cubre objetivo histórico hasta 2020.
3. **Update parcial**: hoy parece actualizar solo `cantidad_proveedores_cotizando`.
4. **Lectura previa simulada** (`valor_anterior_proveedores = DESCONOCIDO`): rompe trazabilidad real.
5. **API key expuesta en nodo**: debe ir en credencial/secret.
6. **Falta idempotencia fuerte por ejecución**: evitar duplicados cuando se reintenta.

## 3) Diseño objetivo de datos (Deno KV)

### 3.1 Keys principales
- `['codex','licitacion', <idLicitacion>]` → documento canónico.
- `['codex','historial', <idLicitacion>, <ts>]` → eventos de cambio.
- `['codex','estado', <idLicitacion>]` → estado Kanban actual.

### 3.2 Índices de consulta
- `['idx','region', <region>, <idLicitacion>]`
- `['idx','ciudad', <ciudad>, <idLicitacion>]`
- `['idx','organismo', <organismo>, <idLicitacion>]`
- `['idx','sku', <sku>, <idLicitacion>]`
- `['idx','estado', <estado>, <idLicitacion>]`
- `['idx','fecha', <yyyy-mm>, <idLicitacion>]`

### 3.3 Entidad mínima licitación
- idLicitacion, nombre, organismo, region, ciudad,
- sku[] (normalizado),
- cantidadProveedoresCotizando,
- montoDisponibleCLP,
- fechaCierre,
- sourceUpdatedAt,
- hashPayload,
- createdAt, updatedAt.

## 4) Upsert sin sobreescritura destructiva
Regla:
- si no existe → INSERT,
- si existe y cambia payload/hash → UPDATE con merge de campos + evento en historial,
- si existe y no cambia → NOOP.

Nota: preservar campos de operación interna (`estadoKanban`, `owner`, notas, tags) cuando llegue nuevo payload de API.

## 5) Plan de ingestión histórico (hasta 2020)
Fase A (Backfill):
- correr por ventanas mensuales desde 2020-01 a hoy,
- paginar completo por ventana,
- checkpoint por `(periodo,page)` para reanudar.

Fase B (Incremental diario):
- job diario (n8n/cron) con rango corto (p.ej. 1-3 días) + tolerancia de reproceso.

Fase C (Reconciliación):
- job semanal que revisa últimos 30-60 días por cambios tardíos.

## 6) API backend (Deno)
- `GET /api/licitaciones` (filtros: estado, region, ciudad, organismo, sku, montoMin/max, fechaDesde/Hasta, proveedorMax)
- `GET /api/licitaciones/:id`
- `PATCH /api/licitaciones/:id/estado` (kanban)
- `PATCH /api/licitaciones/:id` (campos gobernanza)
- `GET /api/metricas` (totales, por estado, por región, por organismo, montos agregados)
- `GET /api/auditoria/:id` (histórico de cambios)

## 7) Kanban (Fresh + Tailwind)
Columnas iniciales sugeridas:
- `nuevo`, `cotizando`, `cotizado`, `licitado`, `orden_compra`, `pagado`, `descartado`.

Requisitos UI:
- drag & drop entre columnas,
- filtros persistentes,
- vista por grupos (organismo/región/SKU),
- badges de criticidad y score,
- orden por fecha cierre y monto.

## 8) Seguridad y operación
- secretos en env vars (nunca hardcode API key),
- rate-limit/retry con backoff,
- logs estructurados con `executionId`,
- métricas de pipeline (insert/update/noop/error),
- test de idempotencia y deduplicación.

## 9) Adaptación directa desde tu workflow n8n
Mapeo recomendado:
- "Leer datos existentes" → lectura en Deno KV (`codex`)
- "Insertar/Actualizar Sheets" → upsert en API backend Deno
- "Histórico Codex" → eventos en `['codex','historial', ...]`
- "Alertas" → webhook/email/slack disparado desde backend o n8n
- "Mapa existente" → cache de IDs en memoria por ejecución

## 10) Próximos pasos concretos
1. Definir contrato JSON de licitación canónica + estados Kanban.
2. Implementar módulo `ingest/mercadopublico.ts` en Deno (fetch + normalización + upsert).
3. Crear endpoints Fresh API (`routes/api/...`).
4. Crear tablero Kanban inicial con filtros.
5. Crear migración/runner de backfill 2020→hoy con checkpoints.
6. Integrar n8n para orquestar (trigger + monitoreo), dejando persistencia en Deno KV.
