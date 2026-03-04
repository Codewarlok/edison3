export type UserRole = "admin" | "analyst";

export type Permission =
  | "users.read"
  | "users.write"
  | "licitaciones.read"
  | "licitaciones.write"
  | "kanban.write"
  | "backfill.run"
  | "audit.read";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  roles: UserRole[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuditEvent {
  id: string;
  type: "auth.login.success" | "auth.login.failed" | "auth.logout";
  userId?: string;
  email?: string;
  sessionId?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface SessionWithUser {
  session: SessionRecord;
  user: PublicUser;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "users.read",
    "users.write",
    "licitaciones.read",
    "licitaciones.write",
    "kanban.write",
    "backfill.run",
    "audit.read",
  ],
  analyst: [
    "licitaciones.read",
    "licitaciones.write",
    "kanban.write",
  ],
};

export function toPublicUser(user: AuthUser): PublicUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export function hasPermission(
  user: PublicUser,
  permission: Permission,
): boolean {
  const all = new Set<Permission>();
  for (const role of user.roles) {
    for (const p of ROLE_PERMISSIONS[role]) all.add(p);
  }
  return all.has(permission);
}
