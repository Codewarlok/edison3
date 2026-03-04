import type {
  PocketBaseRecord,
  TenderRecord,
  TenderStatus,
} from "@/lib/data/tenders/types.ts";

function pickString(
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeStatus(value?: string): TenderStatus {
  const normalized = (value ?? "").trim().toLowerCase();
  if (
    normalized === "draft" || normalized === "published" ||
    normalized === "awarded" || normalized === "cancelled" ||
    normalized === "closed"
  ) {
    return normalized;
  }
  return "unknown";
}

export function normalizePocketBaseTender(
  record: PocketBaseRecord,
  source = "pocketbase",
): TenderRecord {
  const raw = record as Record<string, unknown>;
  const sourceUpdatedAt =
    pickString(raw, "updated", "updatedAt", "fechaActualizacion") ??
      new Date().toISOString();

  const sourceCreatedAt = pickString(
    raw,
    "created",
    "createdAt",
    "fechaPublicacion",
  );
  const publishedAt = pickString(raw, "publishedAt", "fechaPublicacion");
  const closingAt = pickString(raw, "closingAt", "fechaCierre");

  const buyerId = pickString(raw, "buyerId", "organismoId", "buyer_id");
  const buyerName = pickString(raw, "buyerName", "organismo", "buyer_name");
  const category = pickString(raw, "category", "rubro", "categoria");

  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((v): v is string => typeof v === "string").map((v) =>
      v.trim()
    ).filter(Boolean)
    : [];

  return {
    businessKey: `${source}:${record.id}`,
    source,
    sourceId: record.id,
    sourceUpdatedAt,
    sourceCreatedAt,
    title: pickString(raw, "title", "nombre", "name") ?? `Tender ${record.id}`,
    status: normalizeStatus(pickString(raw, "status", "estado")),
    buyerId,
    buyerName,
    category,
    amount: pickNumber(raw, "amount", "monto", "presupuesto"),
    currency: pickString(raw, "currency", "moneda") ?? "CLP",
    publishedAt,
    closingAt,
    tags,
    raw,
    ingestedAt: new Date().toISOString(),
    updatedAt: sourceUpdatedAt,
  };
}
