import { hashPassword, verifyPassword } from "./password.ts";
import type { AuthProvider } from "./provider.ts";
import { hasPermission, toPublicUser, type Permission, type PublicUser, type SessionWithUser, type UserRole } from "./types.ts";

export const AUTH_COOKIE = "edison_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export class AuthService {
  constructor(private provider: AuthProvider) {}

  async bootstrapAdmin(email: string, password: string, displayName = "Admin"): Promise<void> {
    const existing = await this.provider.getUserByEmail(email);
    if (existing) return;
    const passwordHash = await hashPassword(password);
    await this.provider.createUser({
      email,
      displayName,
      passwordHash,
      roles: ["admin"],
    });
  }

  async createUser(input: { email: string; displayName: string; password: string; roles: UserRole[] }) {
    const passwordHash = await hashPassword(input.password);
    const user = await this.provider.createUser({ ...input, passwordHash });
    return toPublicUser(user);
  }

  async login(email: string, password: string): Promise<{ sessionId: string; user: PublicUser } | null> {
    const user = await this.provider.getUserByEmail(email);
    if (!user || !user.isActive) return null;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return null;

    const session = await this.provider.createSession(user.id, SESSION_TTL_MS);
    return { sessionId: session.id, user: toPublicUser(user) };
  }

  async logout(sessionId: string): Promise<void> {
    await this.provider.deleteSession(sessionId);
  }

  async getSessionWithUser(sessionId: string): Promise<SessionWithUser | null> {
    const session = await this.provider.getSession(sessionId);
    if (!session) return null;

    const user = await this.provider.getUserById(session.userId);
    if (!user || !user.isActive) return null;

    return { session, user: toPublicUser(user) };
  }

  async listUsers() {
    const users = await this.provider.listUsers();
    return users.map(toPublicUser);
  }

  async updateRoles(userId: string, roles: UserRole[]): Promise<void> {
    await this.provider.updateUserRoles(userId, roles);
  }

  can(user: PublicUser, permission: Permission): boolean {
    return hasPermission(user, permission);
  }
}
