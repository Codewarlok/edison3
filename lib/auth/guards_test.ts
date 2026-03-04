import { assertEquals } from "@std/assert";
import { type AuthState, requireAuth, requireRole } from "@/lib/auth/guards.ts";

function makeState(roles?: Array<"admin" | "analyst">): AuthState {
  return {
    auth: {
      user: roles
        ? {
          id: "u1",
          email: "test@example.com",
          displayName: "Test",
          roles,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        : null,
    },
  };
}

Deno.test("requireAuth rejects anonymous state", () => {
  const result = requireAuth(makeState());
  assertEquals(result?.status, 302);
});

Deno.test("requireRole allows matching role", () => {
  const result = requireRole(makeState(["analyst"]), "analyst");
  assertEquals(result, null);
});

Deno.test("requireRole redirects on non-matching role", () => {
  const result = requireRole(makeState(["analyst"]), "admin");
  assertEquals(result?.status, 302);
  assertEquals(result?.headers.get("location")?.startsWith("/forbidden"), true);
});
