import {
  sessionByExpiryKey,
  sessionByUserKey,
  sessionKey,
  SESSIONS_BY_USER_PREFIX,
} from "./kv_keyspace.ts";
import type { SessionRecord } from "./types.ts";

export interface CreateSessionInput {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  ttlMs: number;
}

export class SessionsRepository {
  constructor(private kv: Deno.Kv) {}

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const session: SessionRecord = {
      id: input.id,
      userId: input.userId,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    };

    const expiresIn = Math.max(1, input.ttlMs);
    await this.kv.atomic()
      .set(sessionKey(session.id), session, { expireIn: expiresIn })
      .set(sessionByUserKey(session.userId, session.id), session.expiresAt, {
        expireIn: expiresIn,
      })
      .set(sessionByExpiryKey(session.expiresAt, session.id), 1, {
        expireIn: expiresIn,
      })
      .commit();

    return session;
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    const row = await this.kv.get<SessionRecord>(sessionKey(sessionId));
    return row.value ?? null;
  }

  async delete(sessionId: string): Promise<void> {
    const row = await this.getById(sessionId);
    if (!row) return;

    await this.kv.atomic()
      .delete(sessionKey(sessionId))
      .delete(sessionByUserKey(row.userId, row.id))
      .delete(sessionByExpiryKey(row.expiresAt, row.id))
      .commit();
  }

  async deleteByUser(userId: string): Promise<number> {
    let count = 0;
    const sessionIds: string[] = [];
    for await (
      const row of this.kv.list<string>({
        prefix: [...SESSIONS_BY_USER_PREFIX, userId],
      })
    ) {
      const sessionId = String(row.key.at(-1));
      sessionIds.push(sessionId);
    }

    for (const sessionId of sessionIds) {
      await this.delete(sessionId);
      count++;
    }

    return count;
  }
}
