import { authService } from "@/lib/auth/runtime.ts";
import { AUTH_COOKIE } from "@/lib/auth/service.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const sessionId = ctx.state.auth.sessionId;
    if (sessionId) await authService.logout(sessionId);

    const res = Response.json({ ok: true });
    res.headers.append(
      "set-cookie",
      `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
    );
    return res;
  },
});
