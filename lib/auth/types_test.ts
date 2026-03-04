import { assertEquals } from "@std/assert";
import { hasPermission } from "@/lib/auth/types.ts";

Deno.test("hasPermission resolves admin privileges", () => {
  const canReadUsers = hasPermission({
    id: "u1",
    email: "admin@example.com",
    displayName: "Admin",
    roles: ["admin"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }, "users.read");

  assertEquals(canReadUsers, true);
});

Deno.test("hasPermission denies analyst admin-only permission", () => {
  const canReadUsers = hasPermission({
    id: "u2",
    email: "analyst@example.com",
    displayName: "Analyst",
    roles: ["analyst"],
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }, "users.read");

  assertEquals(canReadUsers, false);
});
