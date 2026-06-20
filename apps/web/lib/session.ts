export const SESSION_COOKIE = "ht_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 of "authenticated" keyed with AUTH_SECRET. Works in Edge + Node. */
export async function makeToken(): Promise<string> {
  const secret = process.env.AUTH_SECRET ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("authenticated"),
  );
  return toHex(sig);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    return token === (await makeToken());
  } catch {
    return false;
  }
}
