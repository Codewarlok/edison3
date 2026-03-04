export const AUTH_COOKIE = "edison_session";
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function readBooleanEnv(name: string): boolean | undefined {
  const raw = Deno.env.get(name)?.trim().toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return undefined;
}

export function getSessionTtlMs(): number {
  const raw = Deno.env.get("EDISON_SESSION_TTL_MS");
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SESSION_TTL_MS;
  return parsed;
}

export function shouldUseSecureCookie(): boolean {
  const overridden = readBooleanEnv("EDISON_COOKIE_SECURE");
  if (overridden !== undefined) return overridden;
  const env = (Deno.env.get("DENO_ENV") ?? "development").toLowerCase();
  return env === "production";
}

export function getCookieSameSite(): "Lax" | "Strict" | "None" {
  const raw = (Deno.env.get("EDISON_COOKIE_SAMESITE") ?? "Lax").trim();
  if (raw === "Lax" || raw === "Strict" || raw === "None") return raw;
  return "Lax";
}

export function buildSessionCookie(
  sessionId: string,
  ttlMs: number,
  secure = shouldUseSecureCookie(),
): string {
  const attrs = [
    `${AUTH_COOKIE}=${encodeURIComponent(sessionId)}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
    `SameSite=${getCookieSameSite()}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(secure = shouldUseSecureCookie()): string {
  const attrs = [
    `${AUTH_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    `SameSite=${getCookieSameSite()}`,
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
