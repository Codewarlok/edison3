export interface PocketBaseRecord {
  id: string;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

export type TenderStatus =
  | "draft"
  | "published"
  | "awarded"
  | "cancelled"
  | "closed"
  | "unknown";

export interface TenderRecord {
  businessKey: string;
  source: string;
  sourceId: string;
  sourceUpdatedAt: string;
  sourceCreatedAt?: string;
  title: string;
  status: TenderStatus;
  buyerId?: string;
  buyerName?: string;
  category?: string;
  amount?: number;
  currency?: string;
  publishedAt?: string;
  closingAt?: string;
  tags: string[];
  raw: Record<string, unknown>;
  ingestedAt: string;
  updatedAt: string;
}

export interface TenderDashboardFilters {
  status?: TenderStatus;
  buyerId?: string;
  limit?: number;
}

export interface TenderRow {
  key: Deno.KvKey;
  value: TenderRecord;
}

export interface TendersSyncCheckpoint {
  source: string;
  cursor: {
    sourceUpdatedAt: string;
    sourceId: string;
  };
  lastRunAt: string;
  lastSuccessAt?: string;
  lastError?: string;
}

export interface TendersSyncRun {
  source: string;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "failed";
  metrics: TendersSyncMetrics;
  error?: string;
}

export interface TendersSyncMetrics {
  read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
}

export interface UpsertTenderResult {
  action: "inserted" | "updated" | "unchanged";
  value: TenderRecord;
}

export interface ListOptions {
  limit?: number;
  reverse?: boolean;
}
