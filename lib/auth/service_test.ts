import { assertEquals } from "jsr:@std/assert@^1.0.15";
import type { AuthProvider, CreateUserInput } from "@/lib/auth/provider.ts";
import { hashPassword } from "@/lib/auth/password.ts";
import { AuthService } from "@/lib/auth/service.ts";
import type { AuthUser, SessionRecord, UserRole } from "@/lib/auth/types.ts";

class FakeProvider implements AuthProvider {
  users = new Map<string, AuthUser>();
  usersById = new Map<string, AuthUser>();
  sessions = new Map<string, SessionRecord>();

  getUserByEmail(email: string): Promise<AuthUser | null> {
    return Promise.resolve(this.users.get(email.toLowerCase()) ?? null);
  }

  getUserById(id: string): Promise<AuthUser | null> {
    return Promise.resolve(this.usersById.get(id) ?? null);
  }

  listUsers(): Promise<AuthUser[]> {
    return Promise.resolve([...this.usersById.values()]);
  }

  createUser(input: CreateUserInput): Promise<AuthUser> {
    const user: AuthUser = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      roles: input.roles,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.set(user.email, user);
    this.usersById.set(user.id, user);
    return Promise.resolve(user);
  }

  updateUserRoles(userId: string, roles: UserRole[]): Promise<void> {
    const current = this.usersById.get(userId);
    if (!current) return Promise.resolve();
    const next = { ...current, roles };
    this.usersById.set(userId, next);
    this.users.set(next.email, next);
    return Promise.resolve();
  }

  deleteUser(userId: string): Promise<void> {
    const current = this.usersById.get(userId);
    if (!current) return Promise.resolve();
    this.usersById.delete(userId);
    this.users.delete(current.email);
    return Promise.resolve();
  }

  createSession(userId: string, ttlMs: number): Promise<SessionRecord> {
    const createdAt = new Date().toISOString();
    const record: SessionRecord = {
      id: crypto.randomUUID(),
      userId,
      createdAt,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    };
    this.sessions.set(record.id, record);
    return Promise.resolve(record);
  }

  getSession(sessionId: string): Promise<SessionRecord | null> {
    return Promise.resolve(this.sessions.get(sessionId) ?? null);
  }

  deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    return Promise.resolve();
  }
}

Deno.test("AuthService applies temporary lockout after repeated login failures", async () => {
  let now = 0;
  const provider = new FakeProvider();
  const passwordHash = await hashPassword("correct horse battery staple");
  const user = await provider.createUser({
    email: "admin@example.com",
    displayName: "Admin",
    passwordHash,
    roles: ["admin"],
  });

  const service = new AuthService(provider, {
    now: () => now,
    config: {
      rateLimitWindowMs: 10_000,
      rateLimitMaxAttempts: 10,
      lockoutThreshold: 2,
      lockoutBaseMs: 100,
      lockoutMaxMs: 1_000,
    },
  });

  assertEquals(await service.login(user.email, "bad-1"), null);
  assertEquals(await service.login(user.email, "bad-2"), null);

  assertEquals(
    await service.login(user.email, "correct horse battery staple"),
    null,
  );

  now += 150;
  const login = await service.login(user.email, "correct horse battery staple");
  assertEquals(Boolean(login?.sessionId), true);
});

Deno.test("AuthService enforces rate-limit window for login attempts", async () => {
  let now = 0;
  const provider = new FakeProvider();
  const passwordHash = await hashPassword("secret");
  const user = await provider.createUser({
    email: "analyst@example.com",
    displayName: "Analyst",
    passwordHash,
    roles: ["analyst"],
  });

  const service = new AuthService(provider, {
    now: () => now,
    config: {
      rateLimitWindowMs: 1_000,
      rateLimitMaxAttempts: 2,
      lockoutThreshold: 99,
      lockoutBaseMs: 100,
      lockoutMaxMs: 1_000,
    },
  });

  assertEquals(await service.login(user.email, "bad-1"), null);
  assertEquals(await service.login(user.email, "bad-2"), null);
  assertEquals(await service.login(user.email, "secret"), null);

  now += 1_200;
  const login = await service.login(user.email, "secret");
  assertEquals(Boolean(login?.sessionId), true);
});
