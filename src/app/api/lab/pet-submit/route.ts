// ─────────────────────────────────────────────────────────────
// POST /api/lab/pet-submit — PROTOTYPE "send to production" for the pet-frame
// builder. Emails the team the approved cartoon(s) + layout + name(s) so the
// end-to-end flow (upload → cartoonize → approve → production) is demonstrable.
// Not wired to Stripe/checkout — this is the /lab concept demo only.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

interface PetOrder {
  mode: "one" | "two";
  pets: { name: string; image: string }[]; // image = cartoon data URL
}

function toAttachment(dataUrl: string, filename: string) {
  const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { filename, content: m[2], contentType: m[1] };
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: PetOrder;
  try {
    body = (await request.json()) as PetOrder;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!Array.isArray(body.pets) || body.pets.length === 0) {
    return NextResponse.json({ error: "No pets in the order." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.PRODUCTION_EMAILS || process.env.ADMIN_ORDER_EMAIL || "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  // Prototype: if email isn't configured, still succeed so the flow is reviewable.
  if (!apiKey || to.length === 0) {
    console.log("[pet-submit] (prototype, email not configured) order:", body.mode, body.pets.map((p) => p.name));
    return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
  }

  const from = process.env.EMAIL_FROM || "Festive Frames <onboarding@resend.dev>";
  const attachments = body.pets
    .map((p, i) => toAttachment(p.image, `${(p.name || `pet-${i + 1}`).replace(/[^a-z0-9]/gi, "-")}.png`))
    .filter(Boolean) as { filename: string; content: string; contentType: string }[];

  const names = body.pets.map((p) => p.name || "(unnamed)").join(", ");
  try {
    await new Resend(apiKey).emails.send({
      from,
      to,
      subject: `LAB — Pet frame order (${body.mode}-pet): ${names}`,
      text: `Prototype pet-frame order.\nLayout: ${body.mode}-pet\nPets: ${names}\nCartoon art attached (one PNG per pet).`,
      attachments,
    });
    return NextResponse.json({ ok: true, emailed: true }, { status: 200 });
  } catch (err) {
    console.error("[pet-submit] email failed:", err);
    // Don't fail the demo on email trouble.
    return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
  }
}
