// GET /api/admin/verify?t=<token> — the link in a staff sign-in email.
//
// Spends the one-time token and sets the session cookie: httpOnly (page scripts
// cannot read it), Secure in production, SameSite=Lax, 30 days. A used, expired
// or unknown link lands back on the sign-in page with a plain message.

import { NextResponse } from "next/server";
import { ADMIN_COOKIE, exchangeLoginToken, SESSION_TTL_MS } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const session = await exchangeLoginToken(url.searchParams.get("t")).catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/admin/login?e=link", url));
  const res = NextResponse.redirect(new URL("/admin", url));
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
