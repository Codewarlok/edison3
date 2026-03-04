import {
  AUDIT_EVENTS_PREFIX,
  auditByActorKey,
  auditByTargetKey,
  auditByTsKey,
  auditEventKey,
} from "@/lib/auth/kv_keyspace.ts";
import type { AuditEvent, CreateAuditEventInput } from "./types.ts";

export class AuditEventsRepository {
  constructor(private kv: Deno.Kv) {}

  async append(input: CreateAuditEventInput): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: input.id,
      ts: input.ts,
      actorType: input.actorType,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      result: input.result,
      reason: input.reason,
      metadata: input.metadata,
    };

    let atomic = this.kv.atomic()
      .set(auditEventKey(event.id), event)
      .set(auditByTsKey(event.ts, event.id), 1);

    if (event.actorUserId) {
      atomic = atomic.set(
        auditByActorKey(event.actorUserId, event.ts, event.id),
        1,
      );
    }

    if (event.targetType && event.targetId) {
      atomic = atomic.set(
        auditByTargetKey(event.targetType, event.targetId, event.ts, event.id),
        1,
      );
    }

    await atomic.commit();
    return event;
  }

  async listByTime(limit = 100): Promise<AuditEvent[]> {
    const out: AuditEvent[] = [];
    for await (
      const row of this.kv.list<AuditEvent>({ prefix: AUDIT_EVENTS_PREFIX })
    ) {
      out.push(row.value);
      if (out.length >= limit) break;
    }
    out.sort((a, b) => b.ts.localeCompare(a.ts));
    return out;
  }
}
