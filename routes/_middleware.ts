import { authService } from "@/lib/auth/runtime.ts";
import { AUTH_COOKIE } from "@/lib/auth/service.ts";
import { define } from "@/utils.ts";

function getCookieValue(cookieHeader: string, name: string): string | null {
  const part = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));

  if (!part) return null;
  return decodeURIComponent(part.slice(name.length + 1));
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login") return true;
  if (pathname.startsWith("/static") || pathname.startsWith("/assets")) return true;
  if (pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/logout")) return true;
  return false;
}

export const handler = define.middleware(async (ctx) => {
  const cookieHeader = ctx.req.headers.get("cookie") ?? "";
  const sessionId = getCookieValue(cookieHeader, AUTH_COOKIE);

  let user = null;
  if (sessionId) {
    const session = await authService.getSessionWithUser(sessionId);
    user = session?.user ?? null;
  }

  ctx.state.shared = "edison";
  ctx.state.auth = { sessionId, user };

  const pathname = ctx.url.pathname;
  if (!isPublicPath(pathname) && !user) {
    return new Response(null, { status: 302, headers: { location: "/login" } });
  }

  return await ctx.next();
});
