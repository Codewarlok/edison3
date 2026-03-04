import { PocketBaseTendersSource } from "@/lib/data/tenders/pocketbase_source.ts";
import { runTendersSync } from "@/lib/data/tenders/sync_job.ts";

function env(name: string, fallback?: string): string {
  const value = Deno.env.get(name) ?? fallback;
  if (!value) throw new Error(`Falta variable de entorno ${name}`);
  return value;
}

function envNumber(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Variable ${name} inválida: ${raw}`);
  }
  return parsed;
}

function envBoolean(name: string, fallback = false): boolean {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

const source = new PocketBaseTendersSource({
  baseUrl: env("PB_URL"),
  collection: env("PB_TENDERS_COLLECTION", "tenders"),
  authToken: Deno.env.get("PB_TOKEN") ?? undefined,
  perPage: envNumber("PB_PAGE_SIZE", 100),
  timeoutMs: envNumber("PB_TIMEOUT_MS", 15000),
  maxRetries: envNumber("PB_RETRY_MAX", 3),
  retryDelayMs: envNumber("PB_RETRY_DELAY_MS", 400),
});

const kv = await Deno.openKv();

try {
  const startedAt = Date.now();
  const result = await runTendersSync(kv, {
    sourceName: env("PB_SOURCE_NAME", "pocketbase"),
    source,
    businessKeyField: Deno.env.get("PB_TENDER_BUSINESS_KEY") ?? undefined,
    resetCheckpoint: envBoolean("PB_SYNC_RESET_CHECKPOINT", false),
  });

  console.log(JSON.stringify(
    {
      ok: true,
      elapsedMs: Date.now() - startedAt,
      metrics: result.metrics,
      checkpoint: result.checkpoint,
    },
    null,
    2,
  ));
} finally {
  kv.close();
}
