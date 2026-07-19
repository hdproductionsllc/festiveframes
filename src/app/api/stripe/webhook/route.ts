// ─────────────────────────────────────────────────────────────
// POST /api/stripe/webhook  —  Stripe event receiver.
//
// Verifies the Stripe signature against the RAW request body and the
// STRIPE_WEBHOOK_SECRET. On checkout.session.completed it logs a
// structured order record so David can prep and ship orders.
//
// IMPORTANT: signature verification requires the unparsed body. We read
// request.text() and never request.json() here.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { fulfillOrder, fulfillCart } from "@/lib/order/fulfill";

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

    // This Stripe account is SHARED with Still Beside Me (stillbesideme.com),
    // and Stripe fans every checkout.session.completed out to BOTH sites'
    // webhook endpoints. Every live Festive Frames session carries
    // metadata.kind ("custom-frame" | "cart" — the kit path is retired), so a
    // session without a recognized kind is another site's sale and must be
    // ignored. Before this guard, a Still Beside Me pet-tribute order fell
    // through to a generic branch here and sent bogus Festive Frames order
    // emails (2026-07-19).
    if (metadata.kind !== "custom-frame" && metadata.kind !== "cart") {
      console.log(
        `[stripe-webhook] ignoring session ${session.id}: no Festive Frames metadata.kind` +
          (metadata.orderId ? " (has orderId — likely Still Beside Me)" : ""),
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Only fulfill PAID sessions. `completed` ≈ paid for US card checkout, but an
    // async/delayed or failed payment can emit `completed` while unpaid — never
    // produce a free order. (The /thanks relay enforces the same gate.)
    if (session.payment_status === "unpaid") {
      console.warn(`[stripe-webhook] session ${session.id} completed but UNPAID; skipping fulfillment.`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── Custom builder order: fulfill from the in-memory draft (backup to the
    // /thanks relay). fulfillOrder is idempotent, so whichever trigger fires
    // second is a no-op. Production/customer emails are handled there.
    if (metadata.kind === "custom-frame" && metadata.orderId) {
      try {
        // Expand the shipping address so fulfillOrder's emails get a real
        // "Ship to" block — it lives at collected_information.shipping_details
        // on the pinned API version and must be expanded to populate.
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["collected_information.shipping_details"],
        });
        const result = await fulfillOrder(metadata.orderId, full);
        console.log(`[stripe-webhook] custom order ${metadata.orderId} fulfill via webhook: ${result}`);
      } catch (err) {
        console.error("[stripe-webhook] custom order fulfillment failed:", err);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── Multi-design cart order: fulfill from the server-side cart draft
    // (backup to the /thanks relay). fulfillCart is idempotent (claim keyed by
    // cartId), so whichever trigger fires second is a no-op.
    if (metadata.kind === "cart" && metadata.cartId) {
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["collected_information.shipping_details"],
        });
        const result = await fulfillCart(metadata.cartId, full);
        console.log(`[stripe-webhook] cart ${metadata.cartId} fulfill via webhook: ${result}`);
      } catch (err) {
        console.error("[stripe-webhook] cart fulfillment failed:", err);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // A recognized kind with a missing id (orderId/cartId) is a malformed
    // session from our own checkout — log loudly; nothing can be fulfilled.
    console.error(
      `[stripe-webhook] session ${session.id} has kind=${metadata.kind} but no order/cart id; nothing fulfilled.`,
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
