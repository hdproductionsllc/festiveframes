import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — collects a custom-order inquiry from the homepage and
// emails it to the team via Resend. Stores nothing. No-ops gracefully if email
// isn't configured; never throws to the client.
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, message } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 1 || name.length > 120) {
    return NextResponse.json({ error: "Please add your name." }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 200) {
    return NextResponse.json({ error: "Please add a valid email." }, { status: 400 });
  }
  if (typeof message !== "string" || message.trim().length < 4 || message.length > 4000) {
    return NextResponse.json({ error: "Please add a short message." }, { status: 400 });
  }

  let sent = false;
  try {
    sent = await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
  } catch (err) {
    console.error("[contact] failed:", err);
    sent = false;
  }

  // If the inquiry didn't actually send, tell the client so the form shows its
  // "email us directly at hello@festiveframes.co" fallback — never a false "GOT IT".
  if (!sent) {
    return NextResponse.json({ error: "Could not send your message right now." }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
