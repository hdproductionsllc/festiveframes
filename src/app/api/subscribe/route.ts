import { NextResponse } from "next/server";
import { Resend } from "resend";
import { recordSubscriber } from "@/lib/order/store";

// Email capture endpoint for the homepage / thanks-page capture form.
//
// Capture order of preference:
//   1. SUBSCRIBE_ENDPOINT (external provider webhook: Formspree, Beehiiv,
//      ConvertKit, Mailchimp, etc.) — forwarded to if set.
//   2. Otherwise, if Resend is configured, email the new signup to the team
//      (ADMIN_ORDER_EMAIL) so EVERY signup is captured and nothing is lost.
//   3. Only if neither is configured do we accept-but-warn (no capture).
//
// Behavior:
//   - Invalid email shape            -> 400 { ok: false }
//   - SUBSCRIBE_ENDPOINT set, 2xx    -> 200 { ok: true }
//   - SUBSCRIBE_ENDPOINT set, non-2xx-> 502 { ok: false }
//   - No endpoint, Resend configured -> emails the team, 200 { ok: true }

export const runtime = "nodejs";

interface SubscribeBody {
  email?: unknown;
}

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Email a new signup to the team so it is always captured (no list provider needed). */
async function notifyTeam(email: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_ORDER_EMAIL;
  if (!apiKey || !to) return false;
  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: `New tile-drop signup: ${email}`,
      text: `New "Get the tile drops" signup from the site:\n\n${email}\n\nAdd them to your list / send them first access to new tiles + seasonal sets.`,
    });
    return true;
  } catch (err) {
    console.error("[subscribe] team notification failed:", err);
    return false;
  }
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

  const email = body.email.trim().toLowerCase();
  const endpoint = process.env.SUBSCRIBE_ENDPOINT;

  // Idempotency gate: only act on a GENUINELY NEW email. A repeat signup (or a bot
  // hammering the form) is already captured, so we short-circuit with no email/
  // forward — that's what stops the inbox flood. Fail OPEN: if the dedup store is
  // unreachable, treat the signup as new so we never silently drop a real one.
  let isNew = true;
  try {
    isNew = await recordSubscriber(email);
  } catch {
    isNew = true;
  }
  if (!isNew) {
    return NextResponse.json({ ok: true, already: true });
  }

  // No external provider: capture by emailing the team via Resend.
  if (!endpoint) {
    const captured = await notifyTeam(email);
    if (!captured) {
      console.warn(
        "[subscribe] No SUBSCRIBE_ENDPOINT and Resend not configured; signup was NOT captured.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Forward to the configured provider server-side.
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      console.error(
        `[subscribe] provider responded ${res.status} ${res.statusText}`,
      );
      return NextResponse.json({ ok: false }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe] failed to reach SUBSCRIBE_ENDPOINT:", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
