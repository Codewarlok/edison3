import type {
  TenderRecord,
  TendersSyncCheckpoint,
  TendersSyncRun,
} from "@/lib/data/tenders/types.ts";

export const APP_DATA_PREFIX = ["edison", "app_data"] as const;
export const TENDERS_PREFIX = [...APP_DATA_PREFIX, "tenders"] as const;

export const TENDERS_BY_UPDATED_AT_PREFIX = [
  ...APP_DATA_PREFIX,
  "tenders_by_updated_at",
] as const;

export const TENDERS_BY_STATUS_PREFIX = [
  ...APP_DATA_PREFIX,
  "tenders_by_status",
] as const;

export const TENDERS_BY_BUYER_PREFIX = [
  ...APP_DATA_PREFIX,
  "tenders_by_buyer",
] as const;

export const TENDERS_BY_PUBLISHED_AT_PREFIX = [
  ...APP_DATA_PREFIX,
  "tenders_by_published_at",
] as const;

export const TENDERS_BY_SOURCE_ID_PREFIX = [
  ...APP_DATA_PREFIX,
  "tenders_by_source_id",
] as const;

export const TENDERS_SYNC_PREFIX = [
  ...APP_DATA_PREFIX,
  "sync",
  "tenders",
] as const;
export const TENDERS_SYNC_RUNS_PREFIX = [
  ...TENDERS_SYNC_PREFIX,
  "runs",
] as const;

export function tenderKey(businessKey: string) {
  return [...TENDERS_PREFIX, businessKey] as const;
}

export function tenderByUpdatedAtKey(updatedAt: string, businessKey: string) {
  return [...TENDERS_BY_UPDATED_AT_PREFIX, updatedAt, businessKey] as const;
}

export function tenderByStatusKey(
  status: string,
  updatedAt: string,
  businessKey: string,
) {
  return [...TENDERS_BY_STATUS_PREFIX, status, updatedAt, businessKey] as const;
}

export function tenderByBuyerKey(
  buyerId: string,
  updatedAt: string,
  businessKey: string,
) {
  return [...TENDERS_BY_BUYER_PREFIX, buyerId, updatedAt, businessKey] as const;
}

export function tenderByPublishedAtKey(
  publishedAt: string,
  businessKey: string,
) {
  return [...TENDERS_BY_PUBLISHED_AT_PREFIX, publishedAt, businessKey] as const;
}

export function tenderBySourceIdKey(source: string, sourceId: string) {
  return [...TENDERS_BY_SOURCE_ID_PREFIX, source, sourceId] as const;
}

export function tendersSourceCheckpointKey(sourceName: string) {
  return [...TENDERS_SYNC_PREFIX, sourceName, "checkpoint"] as const;
}

export function tendersSourceLastRunKey(sourceName: string) {
  return [...TENDERS_SYNC_PREFIX, sourceName, "last_run"] as const;
}

export function tendersSyncRunKey(sourceName: string, runId: string) {
  return [...TENDERS_SYNC_RUNS_PREFIX, sourceName, runId] as const;
}

export async function readCheckpoint(
  kv: Deno.Kv,
  sourceName: string,
): Promise<TendersSyncCheckpoint | null> {
  const result = await kv.get<TendersSyncCheckpoint>(
    tendersSourceCheckpointKey(sourceName),
  );
  return result.value ?? null;
}

export async function writeCheckpoint(
  kv: Deno.Kv,
  sourceName: string,
  checkpoint: TendersSyncCheckpoint,
) {
  await kv.set(tendersSourceCheckpointKey(sourceName), checkpoint);
}

export async function writeLastRun(
  kv: Deno.Kv,
  sourceName: string,
  run: TendersSyncRun,
) {
  await kv.atomic()
    .set(tendersSourceLastRunKey(sourceName), run)
    .set(tendersSyncRunKey(sourceName, run.runId), run)
    .commit();
}

export async function getTenderBySourceId(
  kv: Deno.Kv,
  source: string,
  sourceId: string,
): Promise<TenderRecord | null> {
  const idIndex = await kv.get<string>(tenderBySourceIdKey(source, sourceId));
  if (!idIndex.value) return null;

  const result = await kv.get<TenderRecord>(tenderKey(idIndex.value));
  return result.value ?? null;
}
