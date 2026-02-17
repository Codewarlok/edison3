import type { AuthUser, SessionRecord, UserRole } from "./types.ts";

export interface CreateUserInput {
  email: string;
  displayName: string;
  passwordHash: string;
  roles: UserRole[];
}

export interface AuthProvider {
  getUserByEmail(email: string): Promise<AuthUser | null>;
  getUserById(id: string): Promise<AuthUser | null>;
  listUsers(): Promise<AuthUser[]>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  updateUserRoles(userId: string, roles: UserRole[]): Promise<void>;
  deleteUser(userId: string): Promise<void>;

  createSession(userId: string, ttlMs: number): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  deleteSession(sessionId: string): Promise<void>;
}
