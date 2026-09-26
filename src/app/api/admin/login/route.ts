// POST /api/admin/login — "email me a sign-in link" for the staff dashboard.
//
// Answers the SAME thing whether or not the address is on the staff list, so the
// form cannot be used to find out who is. The link is built on the server's own
// MySchoolFrame origin, never the request's. Rate limited in proxy.ts.
//
// In local development with no email key the link is returned in the response
// (and logged) so the dashboard can be tried; never in production.

import { NextResponse } from "next/server";
import { createLoginToken } from "@/lib/admin/auth";
import { sendAdminSignInEmail } from "@/lib/email-production";
import { msfOrigin } from "@/lib/msf-origin";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.slice(0, 254) : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const ok = NextResponse.json({ ok: true, message: "If that address is on the staff list, a sign-in link is on its way." });

  let token: string | null = null;
  try {
    token = await createLoginToken(email);
  } catch (err) {
    console.error("[admin/login] could not create a sign-in link:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "Sign-in isn't available right now." }, { status: 503 });
  }
  if (!token) return ok;

  // The link opens a PAGE with a "Sign in" button (app/admin/verify); only the
  // button spends the token, so a mail filter that opens every link to scan it
  // cannot use it up before the person clicks.
  const url = `${msfOrigin()}/admin/verify?t=${token}`;
  const sent = await sendAdminSignInEmail({ to: email.trim().toLowerCase(), url });
  if (!sent && process.env.NODE_ENV !== "production") {
    console.log(`[admin/login] DEV sign-in link (no email sent): ${url}`);
    return NextResponse.json({ ok: true, message: "Development: no email was sent.", devLink: url });
  }
  return ok;
}
