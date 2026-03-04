import { AuditService } from "./audit.ts";
import { KvAuthProvider } from "./kv_provider.ts";
import type { AuthProvider, CreateUserInput } from "./provider.ts";
import { AuthService } from "./service.ts";
import type { AuditEvent, AuthUser, SessionRecord, UserRole } from "./types.ts";

const hasKv = typeof Deno !== "undefined" && typeof Deno.openKv === "function";

class DevDisabledAuthProvider implements AuthProvider {
  getUserByEmail(_email: string): Promise<AuthUser | null> {
    return Promise.resolve(null);
  }

  getUserById(_id: string): Promise<AuthUser | null> {
    return Promise.resolve(null);
  }

  listUsers(): Promise<AuthUser[]> {
    return Promise.resolve([]);
  }

  createUser(_input: CreateUserInput): Promise<AuthUser> {
    throw new Error("AUTH_DISABLED");
  }

  updateUserRoles(_userId: string, _roles: UserRole[]): Promise<void> {
    throw new Error("AUTH_DISABLED");
  }

  deleteUser(_userId: string): Promise<void> {
    throw new Error("AUTH_DISABLED");
  }

  createSession(_userId: string, _ttlMs: number): Promise<SessionRecord> {
    throw new Error("AUTH_DISABLED");
  }

  getSession(_sessionId: string): Promise<SessionRecord | null> {
    return Promise.resolve(null);
  }

  deleteSession(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }

  async createAuditEvent(_event: AuditEvent): Promise<void> {
    return;
  }
}

const kv = hasKv ? await Deno.openKv() : null;
const provider = hasKv
  ? new KvAuthProvider(kv!)
  : new DevDisabledAuthProvider();
export const authService = new AuthService(provider);
export const auditService = new AuditService(provider);

if (hasKv) {
  const bootstrapEmail = Deno.env.get("EDISON_ADMIN_EMAIL");
  const bootstrapPassword = Deno.env.get("EDISON_ADMIN_PASSWORD");
  const bootstrapName = Deno.env.get("EDISON_ADMIN_NAME") ?? "Admin";

  if (bootstrapEmail && bootstrapPassword) {
    await authService.bootstrapAdmin(
      bootstrapEmail,
      bootstrapPassword,
      bootstrapName,
    );
  }
}
