# Sync PocketBase -> DenoKV (Licitaciones)

Base de ingesta para sincronizar licitaciones desde PocketBase hacia Edison
sobre DenoKV.

## Variables de entorno

- `PB_URL` (requerida): URL base PocketBase (ej. `http://localhost:8090`)
- `PB_TOKEN` (opcional): token `Authorization` para API
- `PB_TENDERS_COLLECTION` (opcional, default `tenders`): colección origen
- `PB_TENDER_BUSINESS_KEY` (opcional): campo para clave de negocio (ej.
  `codigo_externo`)
- `PB_PAGE_SIZE` (opcional, default `100`): tamaño de página
- `PB_TIMEOUT_MS` (opcional, default `15000`): timeout request
- `PB_RETRY_MAX` (opcional, default `3`): reintentos por página
- `PB_RETRY_DELAY_MS` (opcional, default `400`): backoff base en ms
- `PB_SOURCE_NAME` (opcional, default `pocketbase`): nombre de fuente para
  checkpoint
- `PB_SYNC_RESET_CHECKPOINT` (opcional, default `false`): reinicia
  watermark/checkpoint

## Ejecución manual

```bash
PB_URL="http://localhost:8090" \
PB_TOKEN="Bearer <token>" \
PB_TENDERS_COLLECTION="licitaciones" \
PB_TENDER_BUSINESS_KEY="codigo_externo" \
deno run -A --unstable-kv scripts/sync_tenders_from_pocketbase.ts
```

Salida esperada (JSON): métricas (`read`, `inserted`, `updated`, `unchanged`,
`errors`) y checkpoint final.

## Idempotencia y checkpoint

- Upsert por clave de negocio en keyspace
  `edison/app_data/tenders/<businessKey>`.
- Checkpoint persistido por fuente en
  `edison/app_data/sync/tenders/<source>/checkpoint`.
- El filtro incremental usa watermark `updatedAt` + `sourceId` para evitar
  duplicados al retomar.

## Preparación para cron

El script es no interactivo y puede ejecutarse por cron/systemd timer:

```bash
*/10 * * * * cd /ruta/proyecto && PB_URL=... deno run -A --unstable-kv scripts/sync_tenders_from_pocketbase.ts >> /var/log/edison-tenders-sync.log 2>&1
```

## Tests

```bash
deno test lib/data/tenders/mapper_test.ts
```
