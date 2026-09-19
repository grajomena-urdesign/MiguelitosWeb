import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export type PosUser = {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const COOKIE_NAME = "miguelitos_pos_session";
const encoder = new TextEncoder();

function runtimeEnv() {
  return env as typeof env & {
    POS_AUTH_SECRET?: string;
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function key() {
  const secret = runtimeEnv().POS_AUTH_SECRET;
  if (!secret) throw new Error("POS authentication is not configured.");

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createPosSession(user: PosUser): Promise<void> {
  const payload = {
    ...user,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };

  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(), encoder.encode(body)),
  );

  const store = await cookies();
  store.set(COOKIE_NAME, `${body}.${toBase64Url(signature)}`, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function getPosUser(): Promise<PosUser | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return null;

  try {
    const [body, signature] = value.split(".");
    if (!body || !signature) return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body)),
    );

    if (
      typeof payload.userId !== "string" ||
      
      typeof payload.email !== "string" ||
      typeof payload.displayName !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now()
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: typeof payload.username === "string" ? payload.username : "",
      email: payload.email,
      displayName: payload.displayName,
      fullName:
        typeof payload.fullName === "string" ? payload.fullName : null,
    };
  } catch {
    return null;
  }
}

export async function clearPosSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

