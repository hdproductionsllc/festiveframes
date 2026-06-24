// ─────────────────────────────────────────────────────────────
// POST /api/order/draft — stash a custom order's design + rendered
// artifacts BEFORE the customer is sent to Stripe. Keyed by orderId so the
// webhook (or the /thanks relay) can fulfill it after payment. Best-effort:
// a failure here never blocks checkout (the /thanks relay also carries the
// payload in the customer's localStorage).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { saveDraft } from "@/lib/order/store";
import type { PartsList } from "@/lib/order/parts-list";
import type { OrderArtifacts } from "@/lib/order/store";

export const runtime = "nodejs";

interface DraftBody {
  orderId: string;
  parts: PartsList;
  artifacts: OrderArtifacts;
  design?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: DraftBody;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.orderId || typeof body.orderId !== "string" || !body.parts || !body.artifacts) {
    return NextResponse.json({ error: "Missing orderId/parts/artifacts" }, { status: 400 });
  }
  try {
    saveDraft({ orderId: body.orderId, parts: body.parts, artifacts: body.artifacts, design: body.design });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[order/draft] save failed:", err);
    // Non-fatal: the localStorage relay is the backup.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
