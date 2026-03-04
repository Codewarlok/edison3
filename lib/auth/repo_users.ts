import {
  normalizeEmail,
  userByEmailKey,
  userByRoleKey,
  userKey,
  USERS_PREFIX,
} from "./kv_keyspace.ts";
import type { AuthUser, UserRole } from "./types.ts";

export interface CreateUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  roles: UserRole[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UsersRepository {
  constructor(private kv: Deno.Kv) {}

  async getById(id: string): Promise<AuthUser | null> {
    const row = await this.kv.get<AuthUser>(userKey(id));
    return row.value ?? null;
  }

  async getByEmail(email: string): Promise<AuthUser | null> {
    const row = await this.kv.get<string>(userByEmailKey(email));
    if (!row.value) return null;
    return await this.getById(row.value);
  }

  async list(): Promise<AuthUser[]> {
    const users: AuthUser[] = [];
    for await (const row of this.kv.list<AuthUser>({ prefix: USERS_PREFIX })) {
      users.push(row.value);
    }
    users.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return users;
  }

  async create(input: CreateUserRecord): Promise<AuthUser> {
    const normalizedEmail = normalizeEmail(input.email);
    const user: AuthUser = {
      id: input.id,
      email: normalizedEmail,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      roles: [...new Set(input.roles)],
      isActive: input.isActive ?? true,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };

    let atomic = this.kv.atomic()
      .check({ key: userByEmailKey(normalizedEmail), versionstamp: null })
      .set(userKey(user.id), user)
      .set(userByEmailKey(normalizedEmail), user.id);

    for (const role of user.roles) {
      atomic = atomic.set(userByRoleKey(role, user.id), 1);
    }

    const commit = await atomic.commit();
    if (!commit.ok) throw new Error("CREATE_USER_CONFLICT");
    return user;
  }

  async updateRoles(
    userId: string,
    roles: UserRole[],
    updatedAt: string,
  ): Promise<void> {
    const current = await this.getById(userId);
    if (!current) throw new Error("USER_NOT_FOUND");

    const uniqueRoles = [...new Set(roles)];
    const next: AuthUser = { ...current, roles: uniqueRoles, updatedAt };

    let atomic = this.kv.atomic().set(userKey(userId), next);

    for (const role of current.roles) {
      atomic = atomic.delete(userByRoleKey(role, userId));
    }

    for (const role of uniqueRoles) {
      atomic = atomic.set(userByRoleKey(role, userId), 1);
    }

    await atomic.commit();
  }

  async delete(userId: string): Promise<void> {
    const current = await this.getById(userId);
    if (!current) return;

    let atomic = this.kv.atomic()
      .delete(userKey(userId))
      .delete(userByEmailKey(current.email));

    for (const role of current.roles) {
      atomic = atomic.delete(userByRoleKey(role, userId));
    }

    await atomic.commit();
  }
}
