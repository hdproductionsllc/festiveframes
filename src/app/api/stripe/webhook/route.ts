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
import { sendOrderEmails } from "@/lib/email";
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

    // Structured order record (also visible in Railway logs).
    console.log(
      "[stripe-webhook] Order confirmed:",
      JSON.stringify({
        sessionId: session.id,
        selection: metadata.selection ?? null,
        kitIds: metadata.kitIds ?? null,
        quantity: metadata.quantity ?? null,
        alphabetQty: metadata.alphabetQty ?? null,
        amountTotal: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email ?? null,
        customerName: session.customer_details?.name ?? null,
      }),
    );

    // Send the customer confirmation + admin order emails. Best-effort: a
    // failure here must never fail the webhook (Stripe would otherwise retry).
    try {
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items", "collected_information.shipping_details"],
      });
      const items = (full.line_items?.data ?? []).map((li) => ({
        name: li.description ?? "Festive Frames",
        quantity: li.quantity ?? 1,
        amountCents: li.amount_total ?? 0,
      }));
      // On the pinned API version the shipping address lives at
      // collected_information.shipping_details (top-level shipping_details was
      // removed). Read that first, with a legacy fallback for older sessions.
      const collected =
        full.collected_information?.shipping_details ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (full as any).shipping_details ??
        null;

      await sendOrderEmails({
        sessionId: full.id,
        customerEmail: full.customer_details?.email ?? null,
        customerName: full.customer_details?.name ?? collected?.name ?? null,
        items,
        totalCents: full.amount_total ?? 0,
        currency: full.currency ?? "usd",
        shippingName: collected?.name ?? full.customer_details?.name ?? null,
        shippingAddress: collected?.address ?? null,
      });
    } catch (err) {
      console.error("[stripe-webhook] order email step failed:", err);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
