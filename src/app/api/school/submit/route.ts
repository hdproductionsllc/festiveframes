// ─────────────────────────────────────────────────────────────
// POST /api/school/submit — "Send design": save it, then tell the team.
//
// The client renders the assembled frame (composeSchoolFrame) and its panels and
// POSTs them with the editable design. The body is checked and saved by
// lib/school-designs/submission — the same code the Buy path uses — and then the
// print files + parts summary are emailed to a SERVER-FIXED production inbox
// (MSF_ORDER_EMAIL, default bill@myschoolframe.com — lib/email-msf).
//
// SAVE FIRST, EMAIL SECOND. Every send stores a revision (lib/school-designs) and
// answers with its code and the parent's link, so the design reopens on any device
// and Bill's email names the exact frozen revision. A failed save never blocks the
// email — the team still gets the design, and the answer says there is no link —
// and a failed email never loses the save: every answer, failures included, hands
// back what was saved. Sending unchanged content again reuses its revision, so
// "Try again" after a failed email is not a new version.
//
// The recipient is NEVER read from the body. The one email that goes to an
// address the parent typed is their own link, when they ask (lib/email-msf).
// When RESEND_API_KEY is unset we answer { ok:false, reason:"email-not-configured" }
// — never a false "sent".
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { sendDesignLinkEmail, sendSchoolOrderEmail } from "@/lib/email-production";
import { artworkRightsLine } from "@/lib/order/artwork-rights";
import { CONTACT_PROBLEM_COPY, coerceOrderContact, orderContactLine } from "@/lib/order/order-contact";
import { checkSubmission, saveSubmission } from "@/lib/school-designs/submission";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const { contact, emailLink } = (body ?? {}) as Record<string, unknown>;

  // ── WHO TO ANSWER. A sent design with no way to reach its sender cannot be
  //    followed up, which is the whole promise of "Send design". Required, and
  //    checked here whatever the send sheet did. The address is text in the email
  //    for a person to reply to — never a recipient of the team's email. ──
  const who = coerceOrderContact(contact);
  if (!who.ok) {
    return NextResponse.json(
      { ok: false, error: CONTACT_PROBLEM_COPY[who.problem], field: who.problem.split("-")[0] },
      { status: 400 },
    );
  }

  const checked = checkSubmission(body);
  if (!checked.ok) return NextResponse.json(checked.body, { status: checked.status });
  const s = checked.value;

  // ── SAVE FIRST, so the code in Bill's inbox names a design that exists. ──
  const saved = await saveSubmission(s, who.contact);

  // ── The artwork's provenance. The builder asks before it submits, so a design
  //    that arrives with uploaded art and no attestation came from somewhere else
  //    — the email says so in as many words, because an operator who cannot tell
  //    is an operator who prints it. ──
  const result = await sendSchoolOrderEmail({
    designName: s.name,
    printPng: s.overview,
    panels: s.panels,
    partsList: s.parts,
    artworkNote: artworkRightsLine(s.artUploaded, s.artworkRights),
    // Only the formatted line crosses into the email; the parsed address stays here.
    contactNote: orderContactLine(who.contact),
    saved: saved ? { code: saved.ref.code, revision: saved.ref.revision } : null,
  });

  // The parent's own link, ONLY when they asked in this request — the one email
  // that goes to an address a parent typed (lib/email-msf, the exception). Only
  // once the team HAS the design: a failed team send is retried by the parent, and
  // a link mailed on every attempt would land in their inbox twice.
  const url = saved?.out.url ?? null;
  const linkEmailed =
    result.ok && emailLink === true && url && saved
      ? await sendDesignLinkEmail({ to: who.contact.email, code: saved.ref.code, url, schoolName: s.kit?.schoolName ?? null })
      : false;

  const savedOut = saved?.out ?? null;
  if (result.ok) return NextResponse.json({ ok: true, saved: savedOut, linkEmailed }, { status: 200 });

  switch (result.reason) {
    case "email-not-configured":
      // Not an error the client did wrong — the send path just isn't live yet.
      return NextResponse.json({ ok: false, reason: "email-not-configured", saved: savedOut, linkEmailed }, { status: 200 });
    // The failures still hand back what was SAVED: the parent is shown their code
    // and link, and "Try again" resends the same revision.
    case "invalid-attachment":
      return NextResponse.json({ ok: false, error: "Could not read the print image.", saved: savedOut }, { status: 400 });
    case "attachment-too-large":
      return NextResponse.json({ ok: false, error: "Print image is too large.", saved: savedOut }, { status: 413 });
    default:
      return NextResponse.json({ ok: false, error: "Could not send your design to our team right now.", saved: savedOut }, { status: 502 });
  }
}
