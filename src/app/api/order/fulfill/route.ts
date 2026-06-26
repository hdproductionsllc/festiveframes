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
import { fulfillOrder, fulfillCart } from "@/lib/order/fulfill";
import type { PartsList } from "@/lib/order/parts-list";
import type { OrderArtifacts } from "@/lib/order/store";

export const runtime = "nodejs";

interface FulfillBody {
  orderId?: string;
  cartId?: string;
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
  if (!body.sessionId || (!body.orderId && !body.cartId)) {
    return NextResponse.json({ error: "Missing sessionId and orderId/cartId" }, { status: 400 });
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let session: Stripe.Checkout.Session;
  try {
    // Expand the shipping address so production/customer emails get a real
    // "Ship to" block. On the pinned API version the address lives at
    // collected_information.shipping_details (the old top-level
    // shipping_details was removed) and must be expanded to populate.
    session = await stripe.checkout.sessions.retrieve(body.sessionId, {
      expand: ["collected_information.shipping_details"],
    });
  } catch {
    return NextResponse.json({ error: "Unknown session" }, { status: 400 });
  }

  // Trust gate: the session must be paid before we generate anything.
  if (session.payment_status === "unpaid") {
    return NextResponse.json({ error: "Not paid" }, { status: 402 });
  }

  // Cart order: the session must belong to this cart. Designs + quantities are
  // read from the server-side cart draft, so no client payload is trusted here.
  if (body.cartId) {
    if ((session.metadata?.cartId ?? null) !== body.cartId) {
      return NextResponse.json({ error: "Cart mismatch" }, { status: 400 });
    }
    const result = await fulfillCart(body.cartId, session);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  }

  // Single custom-frame order.
  if ((session.metadata?.orderId ?? null) !== body.orderId) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const payload =
    body.parts && body.artifacts ? { parts: body.parts, artifacts: body.artifacts } : undefined;

  const result = await fulfillOrder(body.orderId!, session, payload);
  return NextResponse.json({ ok: true, result }, { status: 200 });
}
