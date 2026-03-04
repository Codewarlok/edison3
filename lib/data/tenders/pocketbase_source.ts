import type {
  PocketBaseRecord,
  TendersSyncCheckpoint,
} from "@/lib/data/tenders/types.ts";

export interface PocketBaseSourceConfig {
  baseUrl: string;
  collection: string;
  authToken?: string;
  perPage: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface PocketBasePage {
  items: PocketBaseRecord[];
  totalPages: number;
  page: number;
  perPage: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelayMs: number,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) throw error;
      await sleep(retryDelayMs * attempt);
    }
  }
}

export class PocketBaseTendersSource {
  constructor(private readonly config: PocketBaseSourceConfig) {}

  private buildFilter(checkpoint?: TendersSyncCheckpoint): string | undefined {
    if (!checkpoint) return undefined;
    const updated = checkpoint.cursor.sourceUpdatedAt.replaceAll('"', '\\"');
    const sourceId = checkpoint.cursor.sourceId.replaceAll('"', '\\"');
    return `(updated > \"${updated}\") || (updated = \"${updated}\" && id > \"${sourceId}\")`;
  }

  async fetchPage(
    page: number,
    checkpoint?: TendersSyncCheckpoint,
  ): Promise<PocketBasePage> {
    const filter = this.buildFilter(checkpoint);
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(this.config.perPage),
      sort: "+updated,+id",
    });
    if (filter) params.set("filter", filter);

    const url = `${
      this.config.baseUrl.replace(/\/$/, "")
    }/api/collections/${this.config.collection}/records?${params.toString()}`;

    return await withRetries(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs,
        );
        try {
          const response = await fetch(url, {
            headers: this.config.authToken
              ? { Authorization: this.config.authToken }
              : undefined,
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`PocketBase error HTTP ${response.status}`);
          }
          const payload = await response.json();
          return {
            items: payload.items ?? [],
            totalPages: payload.totalPages ?? 0,
            page: payload.page ?? page,
            perPage: payload.perPage ?? this.config.perPage,
          } as PocketBasePage;
        } finally {
          clearTimeout(timeout);
        }
      },
      this.config.maxRetries,
      this.config.retryDelayMs,
    );
  }
}
