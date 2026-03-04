export const AUTH_COOKIE = "edison_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export function getSessionTtlMs(): number {
  const raw = Deno.env.get("EDISON_SESSION_TTL_MS");
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SESSION_TTL_MS;
  return parsed;
}

export function buildSessionCookie(
  sessionId: string,
  ttlMs: number,
  secure = true,
): string {
  const attrs = [
    `${AUTH_COOKIE}=${encodeURIComponent(sessionId)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(secure = true): string {
  const attrs = [
    `${AUTH_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function getCookieValue(
  cookieHeader: string,
  name: string,
): string | null {
  const part = cookieHeader
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`));

  if (!part) return null;
  return decodeURIComponent(part.slice(name.length + 1));
}
