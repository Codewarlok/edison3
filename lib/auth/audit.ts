import type { AuthProvider } from "./provider.ts";
import type { AuditEvent } from "./types.ts";

export class AuditService {
  constructor(private provider: AuthProvider) {}

  async log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
    await this.provider.createAuditEvent({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    });
  }
}
