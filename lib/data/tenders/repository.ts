import {
  tenderByBuyerKey,
  tenderByPublishedAtKey,
  tenderBySourceIdKey,
  tenderByStatusKey,
  tenderByUpdatedAtKey,
  tenderKey,
  TENDERS_BY_BUYER_PREFIX,
  TENDERS_BY_PUBLISHED_AT_PREFIX,
  TENDERS_BY_STATUS_PREFIX,
  TENDERS_BY_UPDATED_AT_PREFIX,
} from "@/lib/data/tenders/kv_keyspace.ts";
import type {
  ListOptions,
  TenderDashboardFilters,
  TenderRecord,
  TendersSyncCheckpoint,
  TendersSyncRun,
  UpsertTenderResult,
} from "@/lib/data/tenders/types.ts";
import {
  readCheckpoint,
  tendersSourceCheckpointKey,
  tendersSourceLastRunKey,
  writeLastRun,
} from "@/lib/data/tenders/kv_keyspace.ts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function sameTender(a: TenderRecord, b: TenderRecord): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function indexSet(atomic: Deno.AtomicOperation, tender: TenderRecord) {
  atomic
    .set(tenderByUpdatedAtKey(tender.updatedAt, tender.businessKey), 1)
    .set(
      tenderByStatusKey(tender.status, tender.updatedAt, tender.businessKey),
      1,
    )
    .set(
      tenderBySourceIdKey(tender.source, tender.sourceId),
      tender.businessKey,
    );

  if (tender.buyerId) {
    atomic.set(
      tenderByBuyerKey(tender.buyerId, tender.updatedAt, tender.businessKey),
      1,
    );
  }

  if (tender.publishedAt) {
    atomic.set(
      tenderByPublishedAtKey(tender.publishedAt, tender.businessKey),
      1,
    );
  }

  return atomic;
}

function indexDelete(atomic: Deno.AtomicOperation, tender: TenderRecord) {
  atomic
    .delete(tenderByUpdatedAtKey(tender.updatedAt, tender.businessKey))
    .delete(
      tenderByStatusKey(tender.status, tender.updatedAt, tender.businessKey),
    )
    .delete(tenderBySourceIdKey(tender.source, tender.sourceId));

  if (tender.buyerId) {
    atomic.delete(
      tenderByBuyerKey(tender.buyerId, tender.updatedAt, tender.businessKey),
    );
  }

  if (tender.publishedAt) {
    atomic.delete(
      tenderByPublishedAtKey(tender.publishedAt, tender.businessKey),
    );
  }

  return atomic;
}

export class TendersRepository {
  constructor(private kv: Deno.Kv) {}

  async getByBusinessKey(businessKey: string): Promise<TenderRecord | null> {
    const row = await this.kv.get<TenderRecord>(tenderKey(businessKey));
    return row.value ?? null;
  }

  async upsert(tender: TenderRecord): Promise<UpsertTenderResult> {
    const primaryKey = tenderKey(tender.businessKey);
    const current = await this.kv.get<TenderRecord>(primaryKey);

    if (current.value && sameTender(current.value, tender)) {
      return { action: "unchanged", value: current.value };
    }

    let atomic = this.kv.atomic().set(primaryKey, tender);

    if (current.value) {
      atomic = atomic.check(current).check({
        key: tenderBySourceIdKey(tender.source, tender.sourceId),
        versionstamp: null,
      });
      atomic = indexDelete(atomic, current.value);
      atomic = indexSet(atomic, tender);
      const commit = await atomic.commit();
      if (!commit.ok) throw new Error("TENDER_UPDATE_CONFLICT");
      return { action: "updated", value: tender };
    }

    atomic = atomic.check({ key: primaryKey, versionstamp: null }).check({
      key: tenderBySourceIdKey(tender.source, tender.sourceId),
      versionstamp: null,
    });
    atomic = indexSet(atomic, tender);

    const commit = await atomic.commit();
    if (!commit.ok) throw new Error("TENDER_CREATE_CONFLICT");

    return { action: "inserted", value: tender };
  }

  async listRecent(options: ListOptions = {}): Promise<TenderRecord[]> {
    return await this.listFromIndex(TENDERS_BY_UPDATED_AT_PREFIX, options);
  }

  async listPublished(options: ListOptions = {}): Promise<TenderRecord[]> {
    return await this.listFromIndex(TENDERS_BY_PUBLISHED_AT_PREFIX, options);
  }

  async listByStatus(
    status: TenderRecord["status"],
    options: ListOptions = {},
  ): Promise<TenderRecord[]> {
    return await this.listFromIndex(
      [...TENDERS_BY_STATUS_PREFIX, status],
      options,
    );
  }

  async listByBuyer(
    buyerId: string,
    options: ListOptions = {},
  ): Promise<TenderRecord[]> {
    return await this.listFromIndex(
      [...TENDERS_BY_BUYER_PREFIX, buyerId],
      options,
    );
  }

  async queryDashboard(
    filters: TenderDashboardFilters = {},
  ): Promise<TenderRecord[]> {
    if (filters.buyerId) {
      return await this.listByBuyer(filters.buyerId, {
        limit: filters.limit,
        reverse: true,
      });
    }

    if (filters.status) {
      return await this.listByStatus(filters.status, {
        limit: filters.limit,
        reverse: true,
      });
    }

    return await this.listRecent({ limit: filters.limit, reverse: true });
  }

  async getCheckpoint(source: string): Promise<TendersSyncCheckpoint | null> {
    return await readCheckpoint(this.kv, source);
  }

  async setCheckpoint(
    source: string,
    checkpoint: TendersSyncCheckpoint,
  ): Promise<void> {
    await this.kv.set(tendersSourceCheckpointKey(source), checkpoint);
  }

  async getLastRun(source: string): Promise<TendersSyncRun | null> {
    const row = await this.kv.get<TendersSyncRun>(
      tendersSourceLastRunKey(source),
    );
    return row.value ?? null;
  }

  async setLastRun(source: string, run: TendersSyncRun): Promise<void> {
    await writeLastRun(this.kv, source, run);
  }

  private async listFromIndex(
    prefix: Deno.KvKey,
    options: ListOptions,
  ): Promise<TenderRecord[]> {
    const limit = clampLimit(options.limit);
    const results: TenderRecord[] = [];

    for await (
      const row of this.kv.list<number>({ prefix }, {
        limit,
        reverse: options.reverse ?? true,
      })
    ) {
      const businessKey = String(row.key.at(-1));
      const tender = await this.getByBusinessKey(businessKey);
      if (tender) results.push(tender);
    }

    return results;
  }
}
