import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createPosSession } from "@/app/pos-auth";

function safeReturnTo(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function samePassword(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);

  const left = new Uint8Array(aHash);
  const right = new Uint8Array(bHash);
  let difference = left.length ^ right.length;

  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const returnTo = safeReturnTo(String(form.get("return_to") ?? "/"));

  const runtime = env as typeof env & {
    POS_ADMIN_EMAIL?: string;
    POS_ADMIN_PASSWORD?: string;
  };

  const expectedEmail = runtime.POS_ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = runtime.POS_ADMIN_PASSWORD;

  const passwordOk =
    expectedPassword && password
      ? await samePassword(password, expectedPassword)
      : false;

  if (!expectedEmail || !passwordOk || email !== expectedEmail) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    url.searchParams.set("return_to", returnTo);
    return NextResponse.redirect(url, 303);
  }

  await createPosSession({
    userId: "pos_admin",
    email: expectedEmail,
    displayName: "Miguelitos Admin",
    fullName: "Miguelitos Admin",
  });

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
