import { normalizePocketBaseTender } from "@/lib/data/tenders/mapper.ts";
import { PocketBaseTendersSource } from "@/lib/data/tenders/pocketbase_source.ts";
import { TendersRepository } from "@/lib/data/tenders/repository.ts";
import type {
  TendersSyncCheckpoint,
  TendersSyncMetrics,
  TendersSyncRun,
} from "@/lib/data/tenders/types.ts";

export interface SyncTendersConfig {
  sourceName: string;
  source: PocketBaseTendersSource;
  businessKeyField?: string;
  resetCheckpoint?: boolean;
}

export async function runTendersSync(
  kv: Deno.Kv,
  config: SyncTendersConfig,
): Promise<
  { metrics: TendersSyncMetrics; checkpoint: TendersSyncCheckpoint | null }
> {
  const repository = new TendersRepository(kv);
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  let checkpoint = config.resetCheckpoint
    ? null
    : await repository.getCheckpoint(config.sourceName);

  const metrics: TendersSyncMetrics = {
    read: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  };

  await repository.setLastRun(config.sourceName, {
    source: config.sourceName,
    runId,
    startedAt,
    status: "running",
    metrics,
  });

  try {
    let page = 1;

    while (true) {
      const batch = await config.source.fetchPage(
        page,
        checkpoint ?? undefined,
      );
      if (batch.items.length === 0) break;

      for (const item of batch.items) {
        metrics.read++;
        try {
          const normalized = normalizePocketBaseTender(
            item,
            config.sourceName,
            config.businessKeyField,
          );
          const result = await repository.upsert(normalized);
          if (result.action === "inserted") metrics.inserted++;
          else if (result.action === "updated") metrics.updated++;
          else metrics.unchanged++;

          checkpoint = {
            source: config.sourceName,
            cursor: {
              sourceUpdatedAt: normalized.sourceUpdatedAt,
              sourceId: normalized.sourceId,
            },
            lastRunAt: startedAt,
            lastSuccessAt: new Date().toISOString(),
          };
          await repository.setCheckpoint(config.sourceName, checkpoint);
        } catch (_error) {
          metrics.errors++;
        }
      }

      if (page >= batch.totalPages) break;
      page++;
    }

    const completedRun: TendersSyncRun = {
      source: config.sourceName,
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "success",
      metrics,
    };
    await repository.setLastRun(config.sourceName, completedRun);

    return { metrics, checkpoint };
  } catch (error) {
    const failedRun: TendersSyncRun = {
      source: config.sourceName,
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      metrics,
      error: error instanceof Error ? error.message : String(error),
    };
    await repository.setLastRun(config.sourceName, failedRun);
    throw error;
  }
}
