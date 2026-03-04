export type AuditResult = "success" | "failure";
export type AuditActorType = "user" | "system";
export type AuditTargetType = "user" | "session" | "system";

export interface AuditEvent {
  id: string;
  ts: string;
  actorType: AuditActorType;
  actorUserId?: string;
  action: string;
  targetType?: AuditTargetType;
  targetId?: string;
  result: AuditResult;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAuditEventInput {
  id: string;
  ts: string;
  actorType: AuditActorType;
  actorUserId?: string;
  action: string;
  targetType?: AuditTargetType;
  targetId?: string;
  result: AuditResult;
  reason?: string;
  metadata?: Record<string, unknown>;
}
