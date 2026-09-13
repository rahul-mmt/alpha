/**
 * Single shared credential + signed session cookie.
 * Uses Web Crypto only, so it runs in both the proxy and route handlers.
 */
export const SESSION_COOKIE = "fw_session";
export const USER_COOKIE = "fw_user";
const SESSION_DAYS = 30;

export function credentials() {
  const user = process.env.APP_USER || "mosaic";
  const password = process.env.APP_PASSWORD || (process.env.NODE_ENV !== "production" ? "mosaic-demo" : "");
  return { user, password };
}

function secret() {
  const s = process.env.AUTH_SECRET || (process.env.NODE_ENV !== "production" ? "dev-only-secret-change-me" : "");
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

const enc = new TextEncoder();

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncodeString(s: string) {
  return b64url(enc.encode(s));
}
function b64urlDecodeString(s: string) {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function signSession(user: string) {
  const payload = b64urlEncodeString(JSON.stringify({ u: user, exp: Date.now() + SESSION_DAYS * 86_400_000 }));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!timingSafeEqual(await hmac(payload), sig)) return null;
    const { u, exp } = JSON.parse(b64urlDecodeString(payload)) as { u: string; exp: number };
    return typeof exp === "number" && exp > Date.now() ? u : null;
  } catch {
    return null;
  }
}

export const cookieBase = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DAYS * 86_400,
};
