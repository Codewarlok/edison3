import { KvAuthProvider } from "./kv_provider.ts";
import type { AuthProvider, CreateUserInput } from "./provider.ts";
import { AuthService } from "./service.ts";
import type { AuthUser, SessionRecord, UserRole } from "./types.ts";

const hasKv = typeof Deno !== "undefined" && typeof Deno.openKv === "function";

class DevDisabledAuthProvider implements AuthProvider {
  async getUserByEmail(_email: string): Promise<AuthUser | null> {
    return null;
  }

  async getUserById(_id: string): Promise<AuthUser | null> {
    return null;
  }

  async listUsers(): Promise<AuthUser[]> {
    return [];
  }

  async createUser(_input: CreateUserInput): Promise<AuthUser> {
    throw new Error("AUTH_DISABLED");
  }

  async updateUserRoles(_userId: string, _roles: UserRole[]): Promise<void> {
    throw new Error("AUTH_DISABLED");
  }

  async deleteUser(_userId: string): Promise<void> {
    throw new Error("AUTH_DISABLED");
  }

  async createSession(_userId: string, _ttlMs: number): Promise<SessionRecord> {
    throw new Error("AUTH_DISABLED");
  }

  async getSession(_sessionId: string): Promise<SessionRecord | null> {
    return null;
  }

  async deleteSession(_sessionId: string): Promise<void> {
    return;
  }
}

const kv = hasKv ? await Deno.openKv() : null;
const provider = hasKv ? new KvAuthProvider(kv!) : new DevDisabledAuthProvider();
export const authService = new AuthService(provider);

if (hasKv) {
  const bootstrapEmail = Deno.env.get("EDISON_ADMIN_EMAIL");
  const bootstrapPassword = Deno.env.get("EDISON_ADMIN_PASSWORD");
  const bootstrapName = Deno.env.get("EDISON_ADMIN_NAME") ?? "Admin";

  if (bootstrapEmail && bootstrapPassword) {
    await authService.bootstrapAdmin(bootstrapEmail, bootstrapPassword, bootstrapName);
  }
}
