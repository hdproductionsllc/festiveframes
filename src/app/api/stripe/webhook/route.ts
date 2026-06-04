// ─────────────────────────────────────────────────────────────
// POST /api/stripe/webhook  —  Stripe event receiver.
//
// Verifies the Stripe signature against the RAW request body and the
// STRIPE_WEBHOOK_SECRET. On checkout.session.completed it logs a
// structured order record so David can prep festival pickups.
//
// IMPORTANT: signature verification requires the unparsed body. We read
// request.text() and never request.json() here.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw body is mandatory for signature verification.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};

    // Structured order record for fulfillment prep.
    console.log(
      "[stripe-webhook] Order confirmed:",
      JSON.stringify({
        sessionId: session.id,
        selection: metadata.selection ?? null,
        kitIds: metadata.kitIds ?? null,
        quantity: metadata.quantity ?? null,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email ?? null,
        customerName: session.customer_details?.name ?? null,
        shippingOption: session.shipping_cost?.shipping_rate ?? null,
      }),
    );

    // TODO: email David for pickup prep.
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
