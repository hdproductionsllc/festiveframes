// ─────────────────────────────────────────────────────────────
// POST /api/order/draft — stash a custom order's design + rendered
// artifacts BEFORE the customer is sent to Stripe. Keyed by orderId so the
// webhook (or the /thanks relay) can fulfill it after payment.
//
// A store failure answers 503, not a 200 with {ok:false}: the caller adds this
// design to the cart on a 2xx, and a design that was never stored 409s at
// checkout instead. The status is the half of the answer clients read.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { saveDraft } from "@/lib/order/store";
import { HOLIDAY_SHOP_OPEN } from "@/config/holiday-shop";
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
  // The holiday checkout's first step. School orders never use drafts (they are
  // saved revisions — lib/school-designs), so with the holiday shop closed there
  // is nothing this route should store.
  if (!HOLIDAY_SHOP_OPEN) {
    return NextResponse.json({ error: "Festive Frames is closed." }, { status: 410 });
  }
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
    await saveDraft({ orderId: body.orderId, parts: body.parts, artifacts: body.artifacts, design: body.design });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[order/draft] save failed:", err);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
