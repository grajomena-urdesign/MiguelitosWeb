import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createPosSession } from "@/app/pos-auth";
import { verifyPassword } from "@/app/password";
import { q } from "@/lib/store";

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
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new NextResponse("Invalid request.", { status: 403 });
  }

  const form = await request.formData();
  const username = String(
    form.get("username") ?? form.get("email") ?? "",
  ).trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const returnTo = safeReturnTo(String(form.get("return_to") ?? "/"));

  const member = await q(
    "SELECT email,user_id,username,name,role,active,password_hash FROM members WHERE username=? COLLATE NOCASE LIMIT 1",
    username,
  ).first<any>();

  if (
    member?.active &&
    member.user_id &&
    member.password_hash &&
    (await verifyPassword(password, member.password_hash))
  ) {
    await createPosSession({
      userId: member.user_id,
      username: member.username,
      email: member.email,
      displayName: member.name,
      fullName: member.name,
    });

    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  // Temporary fallback for the existing Admin account.
  // Remove after the new Admin username/password has been tested.
  const runtime = env as typeof env & {
    POS_ADMIN_EMAIL?: string;
    POS_ADMIN_PASSWORD?: string;
  };

  const expectedEmail = runtime.POS_ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = runtime.POS_ADMIN_PASSWORD;

  const legacyPasswordOk =
    expectedPassword && password
      ? await samePassword(password, expectedPassword)
      : false;

  if (
    expectedEmail &&
    username === expectedEmail &&
    legacyPasswordOk
  ) {
    await createPosSession({
      userId: "pos_admin",
      username: "",
      email: expectedEmail,
      displayName: "Miguelitos Admin",
      fullName: "Miguelitos Admin",
    });

    return NextResponse.redirect(new URL(returnTo, request.url), 303);
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "1");
  url.searchParams.set("return_to", returnTo);
  return NextResponse.redirect(url, 303);
}
