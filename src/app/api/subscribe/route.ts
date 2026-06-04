import { NextResponse } from "next/server";

// STUB endpoint for the homepage email capture form.
//
// This intentionally does NOT persist anything yet. It validates the shape of
// the request and returns { ok: true } so the client island can show its
// success state. Wire a real provider in a later phase.
//
// TODO: connect to the real email provider (e.g. ConvertKit / Mailchimp /
// Resend audience). On success forward { email } to the provider and return
// its result; on validation failure return { ok: false } with a 400.

interface SubscribeBody {
  email?: unknown;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // STUB: no persistence yet. Pretend the subscribe succeeded.
  return NextResponse.json({ ok: true });
}
