// /api/admin/verify — where the "Sign in" button on /admin/verify posts.
//
// POST { t } spends the one-time token and sets the session cookie: httpOnly
// (page scripts cannot read it), Secure in production, SameSite=Lax, 30 days.
// It is a POST behind a button, not a GET behind the emailed link, because mail
// filters OPEN every link in an email to scan it — and a one-time link opened by
// a robot is a spent link (seen live, 2026-09-26).
//
// GET (a link emailed before that change) spends NOTHING: it forwards to the
// button page with the token intact.
//
// Every redirect is built on msfOrigin(), never request.url — behind Railway's
// proxy the app believes it is localhost:8080.

import { NextResponse } from "next/server";
import { ADMIN_COOKIE, exchangeLoginToken, SESSION_TTL_MS } from "@/lib/admin/auth";
import { msfOrigin } from "@/lib/msf-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let token: unknown = null;
  try {
    token = (await request.formData()).get("t");
  } catch {
    token = null;
  }
  const session = await exchangeLoginToken(token).catch(() => null);
  if (!session) return NextResponse.redirect(`${msfOrigin()}/admin/login?e=link`, { status: 303 });
  const res = NextResponse.redirect(`${msfOrigin()}/admin`, { status: 303 });
  res.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}

export async function GET(request: Request): Promise<NextResponse> {
  const t = new URL(request.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(`${msfOrigin()}/admin/verify?t=${encodeURIComponent(t)}`);
}
