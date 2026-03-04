import { auditService, authService } from "@/lib/auth/runtime.ts";
import { clearSessionCookie } from "@/lib/auth/session.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const sessionId = ctx.state.auth.sessionId;
    const user = ctx.state.auth.user;

    if (sessionId) {
      await authService.logout(sessionId);
      await auditService.log({
        type: "auth.logout",
        userId: user?.id,
        email: user?.email,
        sessionId,
      });
    }

    const res = Response.json({ ok: true });
    res.headers.append("set-cookie", clearSessionCookie());
    return res;
  },
});
