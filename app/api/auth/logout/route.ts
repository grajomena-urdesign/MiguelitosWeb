import { NextResponse } from "next/server";
import { clearPosSession } from "@/app/pos-auth";

export async function GET(request: Request) {
  await clearPosSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
