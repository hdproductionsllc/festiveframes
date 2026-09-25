// ─────────────────────────────────────────────────────────────
// POST /api/school/designs/approve — the parent's "yes" to a proof, recorded.
//
// Body: { token, revision }. The token proves this browser holds the design; the
// revision names the exact, immutable proof it saw. The approval is written ONCE
// on that revision with the wording version and who/when (store.approveRevision),
// and checkout will not start on a revision without one — nor will production
// send one (lib/order/fulfill-school).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { approveRevision } from "@/lib/school-designs/store";
import { PROOF_APPROVAL_VERSION } from "@/content/proof-approval";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: { token?: unknown; revision?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  const n = typeof body.revision === "number" ? body.revision : NaN;
  const approved = await approveRevision(token, n, {
    wordingVersion: PROOF_APPROVAL_VERSION,
    ip: request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });
  if (!approved?.approval) {
    return NextResponse.json({ ok: false, error: "We couldn't record your approval. Please try again." }, { status: 404 });
  }
  return NextResponse.json(
    { ok: true, code: approved.code, revision: approved.n, approvedAt: approved.approval.at },
    { status: 200 },
  );
}
