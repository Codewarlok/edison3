import type { AuthProvider, CreateUserInput } from "./provider.ts";
import type { AuthUser, SessionRecord, UserRole } from "./types.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

export class KvAuthProvider implements AuthProvider {
  constructor(private kv: Deno.Kv) {}

  private userKey(id: string) {
    return ["codex", "auth", "users", id] as const;
  }

  private userEmailKey(email: string) {
    return ["codex", "auth", "users_by_email", email.toLowerCase()] as const;
  }

  private sessionKey(id: string) {
    return ["codex", "auth", "sessions", id] as const;
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const byEmail = await this.kv.get<string>(this.userEmailKey(email));
    if (!byEmail.value) return null;
    return await this.getUserById(byEmail.value);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const row = await this.kv.get<AuthUser>(this.userKey(id));
    return row.value ?? null;
  }

  async listUsers(): Promise<AuthUser[]> {
    const out: AuthUser[] = [];
    for await (const row of this.kv.list<AuthUser>({ prefix: ["codex", "auth", "users"] })) {
      out.push(row.value);
    }
    out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return out;
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const existing = await this.getUserByEmail(input.email);
    if (existing) throw new Error("USER_ALREADY_EXISTS");

    const id = uuid();
    const timestamp = nowIso();
    const user: AuthUser = {
      id,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      roles: input.roles,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const res = await this.kv.atomic()
      .check({ key: this.userEmailKey(input.email), versionstamp: null })
      .set(this.userKey(id), user)
      .set(this.userEmailKey(input.email), id)
      .commit();

    if (!res.ok) throw new Error("CREATE_USER_CONFLICT");
    return user;
  }

  async updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
    const row = await this.getUserById(userId);
    if (!row) throw new Error("USER_NOT_FOUND");
    row.roles = roles;
    row.updatedAt = nowIso();
    await this.kv.set(this.userKey(userId), row);
  }

  async deleteUser(userId: string): Promise<void> {
    const row = await this.getUserById(userId);
    if (!row) return;
    await this.kv.atomic()
      .delete(this.userKey(userId))
      .delete(this.userEmailKey(row.email))
      .commit();
  }

  async createSession(userId: string, ttlMs: number): Promise<SessionRecord> {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlMs);
    const record: SessionRecord = {
      id: uuid(),
      userId,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    await this.kv.set(this.sessionKey(record.id), record, { expireIn: ttlMs });
    return record;
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const row = await this.kv.get<SessionRecord>(this.sessionKey(sessionId));
    return row.value ?? null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.kv.delete(this.sessionKey(sessionId));
  }
}
