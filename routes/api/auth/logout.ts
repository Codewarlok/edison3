import { authService } from "@/lib/auth/runtime.ts";
import { clearSessionCookie } from "@/lib/auth/session.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const sessionId = ctx.state.auth.sessionId;
    if (sessionId) await authService.logout(sessionId);

    const res = Response.json({ ok: true });
    res.headers.append(
      "set-cookie",
      clearSessionCookie(ctx.url.protocol === "https:"),
    );
    return res;
  },
});
