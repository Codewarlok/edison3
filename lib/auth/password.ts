const ITERATIONS = 310_000;
const KEY_LEN = 32;

function toBase64Url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  let b64 = value.replaceAll("-", "+").replaceAll("_", "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: ITERATIONS,
    },
    keyMaterial,
    KEY_LEN * 8,
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [alg, iterText, saltText, hashText] = encoded.split("$");
  if (alg !== "pbkdf2") return false;
  const iterations = Number(iterText);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(hashText);
  const actual = await pbkdf2(password, salt);

  return safeEqual(actual, expected);
}
