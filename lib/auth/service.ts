import { hashPassword, verifyPassword } from "./password.ts";
import type { AuthProvider } from "./provider.ts";
import { getSessionTtlMs } from "./session.ts";
import {
  hasPermission,
  type Permission,
  type PublicUser,
  type SessionWithUser,
  toPublicUser,
  type UserRole,
} from "./types.ts";

interface LoginProtectionState {
  failedAttempts: number;
  windowStartedAtMs: number;
  lockUntilMs: number;
}

interface AuthServiceConfig {
  rateLimitWindowMs: number;
  rateLimitMaxAttempts: number;
  lockoutThreshold: number;
  lockoutBaseMs: number;
  lockoutMaxMs: number;
}

interface AuthServiceOptions {
  now?: () => number;
  config?: Partial<AuthServiceConfig>;
}

const DEFAULT_CONFIG: AuthServiceConfig = {
  rateLimitWindowMs: 10 * 60 * 1000,
  rateLimitMaxAttempts: 10,
  lockoutThreshold: 5,
  lockoutBaseMs: 60 * 1000,
  lockoutMaxMs: 15 * 60 * 1000,
};

function readNumberEnv(name: string): number | undefined {
  const raw = Deno.env.get(name);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function resolveConfig(
  overrides?: Partial<AuthServiceConfig>,
): AuthServiceConfig {
  return {
    rateLimitWindowMs: overrides?.rateLimitWindowMs ??
      readNumberEnv("EDISON_LOGIN_RATE_LIMIT_WINDOW_MS") ??
      DEFAULT_CONFIG.rateLimitWindowMs,
    rateLimitMaxAttempts: overrides?.rateLimitMaxAttempts ??
      readNumberEnv("EDISON_LOGIN_RATE_LIMIT_MAX_ATTEMPTS") ??
      DEFAULT_CONFIG.rateLimitMaxAttempts,
    lockoutThreshold: overrides?.lockoutThreshold ??
      readNumberEnv("EDISON_LOGIN_LOCKOUT_THRESHOLD") ??
      DEFAULT_CONFIG.lockoutThreshold,
    lockoutBaseMs: overrides?.lockoutBaseMs ??
      readNumberEnv("EDISON_LOGIN_LOCKOUT_BASE_MS") ??
      DEFAULT_CONFIG.lockoutBaseMs,
    lockoutMaxMs: overrides?.lockoutMaxMs ??
      readNumberEnv("EDISON_LOGIN_LOCKOUT_MAX_MS") ??
      DEFAULT_CONFIG.lockoutMaxMs,
  };
}

export class AuthService {
  private loginState = new Map<string, LoginProtectionState>();
  private readonly now: () => number;
  private readonly config: AuthServiceConfig;

  constructor(private provider: AuthProvider, options?: AuthServiceOptions) {
    this.now = options?.now ?? (() => Date.now());
    this.config = resolveConfig(options?.config);
  }

  async bootstrapAdmin(
    email: string,
    password: string,
    displayName = "Admin",
  ): Promise<void> {
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

  async createUser(input: {
    email: string;
    displayName: string;
    password: string;
    roles: UserRole[];
  }) {
    const passwordHash = await hashPassword(input.password);
    const user = await this.provider.createUser({ ...input, passwordHash });
    return toPublicUser(user);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ sessionId: string; user: PublicUser } | null> {
    const key = email.trim().toLowerCase();
    if (!key) return null;

    const now = this.now();
    const state = this.getOrCreateLoginState(key, now);

    if (state.lockUntilMs > now) {
      return null;
    }

    if (state.failedAttempts >= this.config.rateLimitMaxAttempts) {
      state.lockUntilMs = Math.max(
        state.lockUntilMs,
        now + this.config.lockoutBaseMs,
      );
      this.loginState.set(key, state);
      return null;
    }

    const user = await this.provider.getUserByEmail(key);
    if (!user || !user.isActive) {
      this.registerFailure(key, state, now);
      return null;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      this.registerFailure(key, state, now);
      return null;
    }

    this.loginState.delete(key);
    const session = await this.provider.createSession(
      user.id,
      getSessionTtlMs(),
    );
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

  async deleteUser(userId: string): Promise<void> {
    await this.provider.deleteUser(userId);
  }

  can(user: PublicUser, permission: Permission): boolean {
    return hasPermission(user, permission);
  }

  private getOrCreateLoginState(
    key: string,
    nowMs: number,
  ): LoginProtectionState {
    const current = this.loginState.get(key);
    if (
      !current ||
      nowMs - current.windowStartedAtMs >= this.config.rateLimitWindowMs
    ) {
      const next = {
        failedAttempts: 0,
        windowStartedAtMs: nowMs,
        lockUntilMs: 0,
      };
      this.loginState.set(key, next);
      return next;
    }
    return current;
  }

  private registerFailure(
    key: string,
    state: LoginProtectionState,
    nowMs: number,
  ): void {
    state.failedAttempts += 1;

    if (state.failedAttempts >= this.config.lockoutThreshold) {
      const exponent = state.failedAttempts - this.config.lockoutThreshold;
      const progressiveLockMs = Math.min(
        this.config.lockoutBaseMs * (2 ** exponent),
        this.config.lockoutMaxMs,
      );
      state.lockUntilMs = Math.max(
        state.lockUntilMs,
        nowMs + progressiveLockMs,
      );
    }

    this.loginState.set(key, state);
  }
}
