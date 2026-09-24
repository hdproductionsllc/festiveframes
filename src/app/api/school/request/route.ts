import { NextResponse } from "next/server";
import { recordSchoolRequest } from "@/lib/school-requests";
import { sendSchoolRequestAlert } from "@/lib/email-production";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school/request — "we don't have your school".
//
// The finder's miss state. It is not a form for the sake of one: what a parent
// types here is the only signal we have about which schools people are looking
// for, and it comes from someone who went looking.
//
// THE ONE THING THIS MUST NOT DO IS EMAIL THEM BACK. `email` is optional and is
// stored so a human can choose to reply; nothing here writes to it, and the
// internal alert goes to MySchoolFrame's own inbox only (MSF_ORDER_EMAIL, default
// bill@myschoolframe.com — owner, 2026-09-23). That is the standing rule in
// CLAUDE.md — nothing mails anyone without the owner saying so — and it is
// enforced here rather than assumed, because "we'll let you know" is exactly the
// promise a capture form invents on its own.
//
// Rate limited in `src/proxy.ts` (6 per IP per 10 minutes, 16 KB) alongside the
// other public POSTs: it writes to Postgres and can send mail.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

/** Every postal code the roster actually contains — 50 states, DC, and the
 *  territories the federal directories cover. Validated against a list rather
 *  than `/^[A-Z]{2}$/` so "XX" is a 400 and not a row nobody can act on. */
const STATES = new Set(
  ("AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH " +
    "NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY AS GU MP PR VI")
    .split(" "),
);

const MAX = { schoolName: 120, city: 80, email: 160, note: 500 };

/** Trimmed, control characters stripped. A school name is one line. */
function line(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, max) : "";
}

function bad(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("bad-request");
  }

  const schoolName = line(body.schoolName, MAX.schoolName);
  const city = line(body.city, MAX.city);
  // NOT slice(2): truncating the input would turn "Missouri" into "MI", which is
  // Michigan and is in the list. A state is two characters or it is a mistake.
  const state = line(body.state, 32).toUpperCase();
  const email = line(body.email, MAX.email);
  // The note keeps its line breaks — it is the one field somebody might write a
  // sentence or two into.
  const note =
    typeof body.note === "string" ? body.note.trim().slice(0, MAX.note) : "";

  if (schoolName.length < 2) return bad("school-name");
  if (city.length < 2) return bad("city");
  if (!STATES.has(state)) return bad("state");
  // Deliberately loose: the only thing worth rejecting is a value that is
  // obviously not an address, because we are not sending to it.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad("email");

  const row = await recordSchoolRequest({
    schoolName,
    city,
    state,
    email: email || null,
    note: note || null,
  });
  if (!row) {
    return NextResponse.json({ ok: false, error: "store-failed" }, { status: 503 });
  }

  // Internal alert ONLY, to MySchoolFrame's own inbox (MSF_ORDER_EMAIL, default
  // bill@myschoolframe.com — lib/email-msf); the requester is never a recipient.
  // Awaited rather than fired and forgotten: this route's process can be frozen the
  // moment it responds, and an alert that usually arrives is worse than one that
  // always does.
  await sendSchoolRequestAlert(row);

  return NextResponse.json({ ok: true, id: row.id });
}
