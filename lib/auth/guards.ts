import {
  hasPermission,
  type Permission,
  type PublicUser,
  type UserRole,
} from "@/lib/auth/types.ts";

export interface AuthState {
  auth: {
    user: PublicUser | null;
  };
}

export function requireAuth(state: AuthState): Response | null {
  if (!state.auth.user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }
  return null;
}

export function requireRole(state: AuthState, role: UserRole): Response | null {
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

export function requirePermission(
  state: AuthState,
  permission: Permission,
): Response | null {
  const user = state.auth.user;
  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }

  if (!hasPermission(user, permission)) {
    return new Response("Forbidden", { status: 403 });
  }

  return null;
}
