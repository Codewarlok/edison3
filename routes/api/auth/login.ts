import { authService } from "@/lib/auth/runtime.ts";
import { buildSessionCookie, getSessionTtlMs } from "@/lib/auth/session.ts";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const { email, password } = await ctx.req.json();
    if (!email || !password) {
      return Response.json({ error: "MISSING_CREDENTIALS" }, { status: 400 });
    }

    const login = await authService.login(email, password);
    if (!login) {
      return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const res = Response.json({ user: login.user });
    res.headers.append(
      "set-cookie",
      buildSessionCookie(login.sessionId, getSessionTtlMs()),
    );
    return res;
  },
});
