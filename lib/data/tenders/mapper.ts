import type {
  PocketBaseRecord,
  TenderRecord,
  TenderStatus,
} from "@/lib/data/tenders/types.ts";

const DEFAULT_BUSINESS_KEY_CANDIDATES = [
  "codigo_externo",
  "code",
  "external_id",
  "folio",
  "number",
  "id",
] as const;

function toNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStatus(input: unknown): TenderStatus {
  const value = normalizeString(input)?.toLowerCase();
  switch (value) {
    case "draft":
    case "published":
    case "awarded":
    case "cancelled":
    case "closed":
      return value;
    default:
      return "unknown";
  }
}

export function resolveBusinessKey(
  record: PocketBaseRecord,
  configuredField?: string,
): string | null {
  const candidates = configuredField
    ? [configuredField, ...DEFAULT_BUSINESS_KEY_CANDIDATES]
    : [...DEFAULT_BUSINESS_KEY_CANDIDATES];

  for (const field of candidates) {
    const raw = record[field];
    const value = normalizeString(raw);
    if (value) return value;
  }

  return normalizeString(record.id) ?? null;
}

export function normalizePocketBaseTender(
  record: PocketBaseRecord,
  source: string,
  configuredBusinessKeyField?: string,
): TenderRecord {
  const businessKey = resolveBusinessKey(record, configuredBusinessKeyField);
  if (!businessKey) {
    throw new Error(`Tender sin clave de negocio. sourceId=${record.id}`);
  }

  const now = new Date().toISOString();
  const sourceUpdatedAt = normalizeString(record.updated) ??
    normalizeString(record.created) ??
    new Date(0).toISOString();

  const title = normalizeString(record.title) ??
    normalizeString(record.nombre) ??
    `Tender ${businessKey}`;

  return {
    businessKey,
    source,
    sourceId: record.id,
    sourceUpdatedAt,
    sourceCreatedAt: normalizeString(record.created),
    title,
    status: normalizeStatus(record.status ?? record.estado),
    buyerId: normalizeString(record.buyer_id) ??
      normalizeString(record.organismo_id),
    buyerName: normalizeString(record.buyer_name) ??
      normalizeString(record.organismo_nombre),
    category: normalizeString(record.category) ??
      normalizeString(record.categoria),
    amount: toNumber(record.amount ?? record.monto),
    currency: normalizeString(record.currency) ??
      normalizeString(record.moneda),
    publishedAt: normalizeString(record.published_at) ??
      normalizeString(record.fecha_publicacion),
    closingAt: normalizeString(record.closing_at) ??
      normalizeString(record.fecha_cierre),
    tags: Array.isArray(record.tags)
      ? record.tags.flatMap((v) => {
        const val = normalizeString(v);
        return val ? [val] : [];
      })
      : [],
    raw: { ...record },
    ingestedAt: now,
    updatedAt: now,
  };
}
