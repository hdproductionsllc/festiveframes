// ─────────────────────────────────────────────────────────────
// POST /api/order/fulfill — fired by the /thanks success page once the
// customer returns from Stripe. The server is the trust boundary: it
// RETRIEVES the Stripe session and only fulfills if the session is paid AND
// its metadata.orderId matches the claimed orderId. The (parts + artifacts)
// payload is accepted from the client only after that check, so a forged
// request with no real paid session can't trigger emails.
//
// fulfillOrder() is idempotent, so this is safe to call alongside the webhook.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { fulfillOrder } from "@/lib/order/fulfill";
import type { PartsList } from "@/lib/order/parts-list";
import type { OrderArtifacts } from "@/lib/order/store";

export const runtime = "nodejs";

interface FulfillBody {
  orderId: string;
  sessionId: string;
  parts?: PartsList;
  artifacts?: OrderArtifacts;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: FulfillBody;
  try {
    body = (await request.json()) as FulfillBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.orderId || !body.sessionId) {
    return NextResponse.json({ error: "Missing orderId/sessionId" }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(body.sessionId);
  } catch {
    return NextResponse.json({ error: "Unknown session" }, { status: 400 });
  }

  // Trust gate: the session must be paid and must belong to this order.
  if (session.payment_status === "unpaid") {
    return NextResponse.json({ error: "Not paid" }, { status: 402 });
  }
  if ((session.metadata?.orderId ?? null) !== body.orderId) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const payload =
    body.parts && body.artifacts ? { parts: body.parts, artifacts: body.artifacts } : undefined;

  const result = await fulfillOrder(body.orderId, session, payload);
  return NextResponse.json({ ok: true, result }, { status: 200 });
}
