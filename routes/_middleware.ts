import { authService, } from "@/lib/auth/runtime.ts";
import { AUTH_COOKIE } from "@/lib/auth/service.ts";
import { define } from "@/utils.ts";

export const handler = define.middleware(async (ctx) => {
  const cookieHeader = ctx.req.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${AUTH_COOKIE}=`));

  const sessionId = sessionCookie?.split("=")[1] ?? null;

  let user = null;
  if (sessionId) {
    const session = await authService.getSessionWithUser(sessionId);
    user = session?.user ?? null;
  }

  ctx.state.shared = "edison";
  ctx.state.auth = { sessionId, user };

  return await ctx.next();
});
