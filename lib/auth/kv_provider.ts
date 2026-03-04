import { AuditEventsRepository } from "@/lib/audit/repo_audit_events.ts";
import type { CreateAuditEventInput } from "@/lib/audit/types.ts";
import type { AuthProvider, CreateUserInput } from "./provider.ts";
import { SessionsRepository } from "./repo_sessions.ts";
import { UsersRepository } from "./repo_users.ts";
import type {
  AuditEvent as AuthAuditEvent,
  AuthUser,
  SessionRecord,
  UserRole,
} from "./types.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

export class KvAuthProvider implements AuthProvider {
  private users: UsersRepository;
  private sessions: SessionsRepository;
  private audit: AuditEventsRepository;

  constructor(private kv: Deno.Kv) {
    this.users = new UsersRepository(kv);
    this.sessions = new SessionsRepository(kv);
    this.audit = new AuditEventsRepository(kv);
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    return await this.users.getByEmail(email);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    return await this.users.getById(id);
  }

  async listUsers(): Promise<AuthUser[]> {
    return await this.users.list();
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const timestamp = nowIso();
    const user = await this.users.create({
      id: uuid(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      roles: input.roles,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.writeAudit({
      id: uuid(),
      ts: timestamp,
      actorType: "system",
      action: "user.created",
      targetType: "user",
      targetId: user.id,
      result: "success",
      metadata: { email: user.email, roles: user.roles },
    });

    return user;
  }

  async updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
    const timestamp = nowIso();
    await this.users.updateRoles(userId, roles, timestamp);
    await this.writeAudit({
      id: uuid(),
      ts: timestamp,
      actorType: "system",
      action: "user.roles.updated",
      targetType: "user",
      targetId: userId,
      result: "success",
      metadata: { roles },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.users.delete(userId);
    await this.sessions.deleteByUser(userId);
    await this.writeAudit({
      id: uuid(),
      ts: nowIso(),
      actorType: "system",
      action: "user.deleted",
      targetType: "user",
      targetId: userId,
      result: "success",
    });
  }

  async createSession(userId: string, ttlMs: number): Promise<SessionRecord> {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlMs);
    const session = await this.sessions.create({
      id: uuid(),
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ttlMs,
    });

    await this.writeAudit({
      id: uuid(),
      ts: nowIso(),
      actorType: "user",
      actorUserId: userId,
      action: "auth.login.success",
      targetType: "session",
      targetId: session.id,
      result: "success",
    });

    return session;
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    return await this.sessions.getById(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const current = await this.sessions.getById(sessionId);
    await this.sessions.delete(sessionId);

    if (current) {
      await this.writeAudit({
        id: uuid(),
        ts: nowIso(),
        actorType: "user",
        actorUserId: current.userId,
        action: "auth.logout",
        targetType: "session",
        targetId: sessionId,
        result: "success",
      });
    }
  }

  async createAuditEvent(event: AuthAuditEvent): Promise<void> {
    await this.writeAudit({
      id: event.id,
      ts: event.timestamp,
      actorType: event.userId ? "user" : "system",
      actorUserId: event.userId,
      action: event.type,
      targetType: event.sessionId ? "session" : undefined,
      targetId: event.sessionId,
      result: "success",
      metadata: event.meta,
    });
  }

  private async writeAudit(input: CreateAuditEventInput): Promise<void> {
    await this.audit.append(input);
  }
}
