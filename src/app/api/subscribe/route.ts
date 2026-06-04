import { NextResponse } from "next/server";

// Email capture endpoint for the homepage / thanks-page capture form.
//
// Persistence is delegated to an external provider via a single env var:
//
//   SUBSCRIBE_ENDPOINT
//     A server-side webhook URL that accepts a JSON body of { email } and
//     stores/forwards the subscriber. Use a form/audience webhook from a
//     provider such as Formspree, Beehiiv, ConvertKit, Mailchimp, or a
//     Resend-backed handler. Example:
//       SUBSCRIBE_ENDPOINT=https://formspree.io/f/xxxxxxx
//
// Behavior:
//   - Invalid email shape            -> 400 { ok: false }
//   - SUBSCRIBE_ENDPOINT set, 2xx    -> 200 { ok: true }
//   - SUBSCRIBE_ENDPOINT set, non-2xx-> 502 { ok: false }
//   - SUBSCRIBE_ENDPOINT NOT set     -> 200 { ok: true } and a console.warn
//     (the form still confirms to the visitor, but nothing is captured;
//     configure the env var to enable real capture).

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

  const email = body.email;
  const endpoint = process.env.SUBSCRIBE_ENDPOINT;

  // No provider configured: confirm to the visitor but warn loudly that the
  // submission was not actually captured anywhere.
  if (!endpoint) {
    console.warn(
      "[subscribe] SUBSCRIBE_ENDPOINT is not set; email capture is not configured. " +
        "Submission was accepted but NOT stored.",
    );
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
