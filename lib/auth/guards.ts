import { authService } from "@/lib/auth/runtime.ts";
import type { UserRole } from "@/lib/auth/types.ts";
import type { State } from "@/utils.ts";

export function requireAuth(state: State): Response | null {
  if (!state.auth.user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }
  return null;
}

export function requireRole(state: State, role: UserRole): Response | null {
  const user = state.auth.user;
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }

  if (!user.roles.includes(role)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
}

export function requirePermission(state: State, permission: Parameters<typeof authService.can>[1]): Response | null {
  const user = state.auth.user;
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }

  if (!authService.can(user, permission)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
}
