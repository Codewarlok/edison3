export const AUTH_KEYSPACE = ["edison", "auth"] as const;

export const USERS_PREFIX = [...AUTH_KEYSPACE, "users"] as const;
export const USERS_BY_EMAIL_PREFIX = [
  ...AUTH_KEYSPACE,
  "users_by_email",
] as const;
export const USERS_BY_ROLE_PREFIX = [
  ...AUTH_KEYSPACE,
  "users_by_role",
] as const;

export const SESSIONS_PREFIX = [...AUTH_KEYSPACE, "sessions"] as const;
export const SESSIONS_BY_USER_PREFIX = [
  ...AUTH_KEYSPACE,
  "sessions_by_user",
] as const;
export const SESSIONS_BY_EXPIRY_PREFIX = [
  ...AUTH_KEYSPACE,
  "sessions_by_expiry",
] as const;

export const AUDIT_EVENTS_PREFIX = [...AUTH_KEYSPACE, "audit_events"] as const;
export const AUDIT_BY_TS_PREFIX = [...AUTH_KEYSPACE, "audit_by_ts"] as const;
export const AUDIT_BY_ACTOR_PREFIX = [
  ...AUTH_KEYSPACE,
  "audit_by_actor",
] as const;
export const AUDIT_BY_TARGET_PREFIX = [
  ...AUTH_KEYSPACE,
  "audit_by_target",
] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function userKey(userId: string) {
  return [...USERS_PREFIX, userId] as const;
}

export function userByEmailKey(email: string) {
  return [...USERS_BY_EMAIL_PREFIX, normalizeEmail(email)] as const;
}

export function userByRoleKey(role: string, userId: string) {
  return [...USERS_BY_ROLE_PREFIX, role, userId] as const;
}

export function sessionKey(sessionId: string) {
  return [...SESSIONS_PREFIX, sessionId] as const;
}

export function sessionByUserKey(userId: string, sessionId: string) {
  return [...SESSIONS_BY_USER_PREFIX, userId, sessionId] as const;
}

export function sessionByExpiryKey(expiresAt: string, sessionId: string) {
  return [...SESSIONS_BY_EXPIRY_PREFIX, expiresAt, sessionId] as const;
}

export function auditEventKey(eventId: string) {
  return [...AUDIT_EVENTS_PREFIX, eventId] as const;
}

export function auditByTsKey(ts: string, eventId: string) {
  return [...AUDIT_BY_TS_PREFIX, ts, eventId] as const;
}

export function auditByActorKey(
  actorUserId: string,
  ts: string,
  eventId: string,
) {
  return [...AUDIT_BY_ACTOR_PREFIX, actorUserId, ts, eventId] as const;
}

export function auditByTargetKey(
  targetType: string,
  targetId: string,
  ts: string,
  eventId: string,
) {
  return [
    ...AUDIT_BY_TARGET_PREFIX,
    targetType,
    targetId,
    ts,
    eventId,
  ] as const;
}
