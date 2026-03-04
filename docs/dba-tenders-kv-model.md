# Modelo DenoKV para licitaciones (PocketBase -> Edison)

## Objetivo

Diseñar persistencia en DenoKV para almacenar licitaciones sincronizadas desde
PocketBase con soporte a:

- Upsert idempotente por licitación.
- Consultas principales del dashboard (recientes, por estado, por comprador).
- Metadatos de sincronización (checkpoint y runs).

## Keyspace propuesto

Prefijo base: `['edison', 'app_data']`

### Entidad principal

- `['edison','app_data','tenders', <businessKey>] => TenderRecord`

`businessKey` recomendado: `<source>:<sourceId>` (ej. `pocketbase:abc123`).

### Índices secundarios

- `['edison','app_data','tenders_by_updated_at', <updatedAt>, <businessKey>] => 1`
  - Lista para “últimas actualizadas”.
- `['edison','app_data','tenders_by_status', <status>, <updatedAt>, <businessKey>] => 1`
  - Filtro por estado para dashboard.
- `['edison','app_data','tenders_by_buyer', <buyerId>, <updatedAt>, <businessKey>] => 1`
  - Filtro por organismo comprador.
- `['edison','app_data','tenders_by_published_at', <publishedAt>, <businessKey>] => 1`
  - Timeline de publicación.
- `['edison','app_data','tenders_by_source_id', <source>, <sourceId>] => <businessKey>`
  - Resolución rápida source-id -> registro principal.

### Sync / checkpoint

- `['edison','app_data','sync','tenders', <source>, 'checkpoint'] => TendersSyncCheckpoint`
- `['edison','app_data','sync','tenders', <source>, 'last_run'] => TendersSyncRun`
- `['edison','app_data','sync','tenders','runs', <source>, <runId>] => TendersSyncRun`

## Trade-offs y decisiones

1. **Duplicación controlada en índices**
   - Se guarda solo marcador (`1`) en índices y se hidrata desde clave
     principal.
   - Trade-off: una lectura extra por resultado, pero evita inconsistencia de
     datos duplicados.

2. **Orden temporal con ISO-8601**
   - `updatedAt/publishedAt` en ISO string para mantener orden lexicográfico =
     cronológico.

3. **Upsert atómico con limpieza de índices previos**
   - En update se eliminan índices antiguos y se escriben los nuevos en la misma
     operación atómica.

4. **Control de concurrencia optimista**
   - `atomic.check(current)` en updates + checks de unicidad para
     `source+sourceId`.

5. **Consistencia eventual en listados**
   - El listado recorre índice y luego busca documento principal.
   - Si hay huérfanos temporales, se ignoran al no encontrar la clave principal.

## Archivos implementados

- `lib/data/tenders/types.ts`
- `lib/data/tenders/kv_keyspace.ts`
- `lib/data/tenders/normalizer.ts`
- `lib/data/tenders/repository.ts`

## Ejemplos de consulta

```ts
const kv = await Deno.openKv();
const repo = new TendersRepository(kv);

// 1) Upsert desde PocketBase
const record = normalizePocketBaseTender(pbRow, "pocketbase");
const result = await repo.upsert(record);
// result.action: inserted | updated | unchanged

// 2) Dashboard general (más recientes)
const recent = await repo.queryDashboard({ limit: 25 });

// 3) Dashboard por estado
const published = await repo.queryDashboard({
  status: "published",
  limit: 50,
});

// 4) Dashboard por comprador
const byBuyer = await repo.queryDashboard({
  buyerId: "MOP-CL",
  limit: 30,
});

// 5) Checkpoint de sync
await repo.setCheckpoint("pocketbase", {
  source: "pocketbase",
  cursor: {
    sourceUpdatedAt: "2026-03-04T17:00:00.000Z",
    sourceId: "abc123",
  },
  lastRunAt: new Date().toISOString(),
  lastSuccessAt: new Date().toISOString(),
});
```
