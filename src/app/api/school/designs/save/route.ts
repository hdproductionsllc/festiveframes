// ─────────────────────────────────────────────────────────────
// POST /api/school/designs/save — save a design WITHOUT telling anyone.
//
// The Buy path's first step: the design becomes a revision (checked and stored by
// lib/school-designs/submission, exactly as a Send is), and the answer carries
// what the proof sheet and checkout need — the revision and the token that
// proves this browser may approve it. No email goes anywhere; Stripe collects
// the parent's contact at checkout. Unchanged content reuses its revision.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { checkSubmission, saveSubmission } from "@/lib/school-designs/submission";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const checked = checkSubmission(body);
  if (!checked.ok) return NextResponse.json(checked.body, { status: checked.status });
  if (!checked.value.design) {
    return NextResponse.json({ ok: false, error: "Missing design." }, { status: 400 });
  }
  const saved = await saveSubmission(checked.value, null);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "We couldn't save your design right now. Please try again." }, { status: 503 });
  }
  return NextResponse.json({ ok: true, saved: saved.out }, { status: 200 });
}
