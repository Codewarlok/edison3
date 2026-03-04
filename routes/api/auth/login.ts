import { auditService, authService } from "@/lib/auth/runtime.ts";
import { buildSessionCookie, getSessionTtlMs } from "@/lib/auth/session.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const { email, password } = await ctx.req.json();
      if (!email || !password) {
        return Response.json({ error: "MISSING_CREDENTIALS" }, { status: 400 });
      }

      const login = await authService.login(email, password);
      if (!login) {
        await auditService.log({
          type: "auth.login.failed",
          email: String(email).toLowerCase(),
        });
        return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
      }

      await auditService.log({
        type: "auth.login.success",
        userId: login.user.id,
        email: login.user.email,
        sessionId: login.sessionId,
      });

      const res = Response.json({ user: login.user });
      res.headers.append(
        "set-cookie",
        buildSessionCookie(login.sessionId, getSessionTtlMs()),
      );
      return res;
    } catch (_error) {
      return Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
  },
});
