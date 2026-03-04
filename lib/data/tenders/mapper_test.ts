import { assertEquals, assertThrows } from "@std/assert";
import {
  normalizePocketBaseTender,
  resolveBusinessKey,
} from "@/lib/data/tenders/mapper.ts";

Deno.test("resolveBusinessKey prioriza campo configurado", () => {
  const key = resolveBusinessKey(
    {
      id: "abc",
      codigo_externo: "CODE-1",
      external_ref: "BIZ-9",
    },
    "external_ref",
  );

  assertEquals(key, "BIZ-9");
});

Deno.test("normalizePocketBaseTender mapea campos principales", () => {
  const normalized = normalizePocketBaseTender(
    {
      id: "pb_1",
      updated: "2026-03-01T10:00:00.000Z",
      title: "  Licitación Test  ",
      amount: "123.45",
      currency: "CLP",
      status: "published",
      codigo_externo: "L-2026-1",
    },
    "pocketbase",
  );

  assertEquals(normalized.businessKey, "L-2026-1");
  assertEquals(normalized.sourceId, "pb_1");
  assertEquals(normalized.sourceUpdatedAt, "2026-03-01T10:00:00.000Z");
  assertEquals(normalized.amount, 123.45);
  assertEquals(normalized.title, "Licitación Test");
  assertEquals(normalized.status, "published");
});

Deno.test("normalizePocketBaseTender usa unknown para estado inválido", () => {
  const normalized = normalizePocketBaseTender({
    id: "pb_2",
    updated: "2026-03-01T10:00:00.000Z",
    status: "open",
  }, "pocketbase");

  assertEquals(normalized.status, "unknown");
});

Deno.test("normalizePocketBaseTender falla si no hay clave", () => {
  assertThrows(() =>
    normalizePocketBaseTender(
      {
        id: "",
        updated: "2026-03-01T10:00:00.000Z",
      },
      "pocketbase",
    )
  );
});
