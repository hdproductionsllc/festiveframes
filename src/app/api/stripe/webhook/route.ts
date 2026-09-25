// ─────────────────────────────────────────────────────────────
// POST /api/stripe/webhook  —  Stripe event receiver.
//
// Verifies the Stripe signature against the RAW request body and the
// STRIPE_WEBHOOK_SECRET. On checkout.session.completed it logs a
// structured order record so Henry can prep and ship orders. On
// charge.refunded it takes a fully refunded school order out of the
// fundraiser ledger (see handleRefund).
//
// IMPORTANT: signature verification requires the unparsed body. We read
// request.text() and never request.json() here.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { fulfillOrder, fulfillCart, type FulfillResult } from "@/lib/order/fulfill";
import { fulfillSchoolOrder, type SchoolFulfillResult } from "@/lib/order/fulfill-school";
import { markSchoolOrderRefunded, recordSchoolOrder } from "@/lib/order/school-ledger";

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

  if (event.type === "charge.refunded") {
    return handleRefund(stripe, event.data.object as Stripe.Charge);
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
    if (metadata.kind !== "custom-frame" && metadata.kind !== "cart" && metadata.kind !== "school-frame") {
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

    // ── The fundraiser ledger. Recorded BEFORE fulfillment and independently of
    // it: what a school is owed is a fact about a PAID order, not about whether
    // we managed to print it, and the two must never be able to disagree. The
    // call is idempotent by orderId and swallows its own errors — a failed ledger
    // write must not make Stripe retry an order that was already fulfilled.
    // PAID, not merely "not unpaid". A 100%-off promo completes as
    // `no_payment_required`, which passed this gate and credited the school a
    // donation on an order that collected nothing — a number the club would be
    // told it earned and could never be sent. The order still fulfils below;
    // only the ledger insists on money having changed hands.
    if (metadata.kind === "school-frame" && session.payment_status === "paid" && metadata.orderId && metadata.school) {
      await recordSchoolOrder({
        orderId: metadata.orderId,
        school: metadata.school,
        donationCents: Number(metadata.donationCents ?? 0),
      });
    }

    // ── MySchoolFrame order: an approved, immutable revision (lib/order/
    // fulfill-school). Its own path since 2026-09-25 — it never reads a draft.
    if (metadata.kind === "school-frame" && metadata.orderId) {
      try {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["collected_information.shipping_details"],
        });
        const result = await fulfillSchoolOrder(full);
        console.log(`[stripe-webhook] school order ${metadata.orderId} via webhook: ${result}`);
        if (!schoolSettled(result)) return redeliver();
      } catch (err) {
        console.error("[stripe-webhook] school order fulfillment failed:", err);
        return redeliver();
      }
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
        if (!fulfilled(result)) return redeliver();
      } catch (err) {
        console.error("[stripe-webhook] custom order fulfillment failed:", err);
        return redeliver();
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
        if (!fulfilled(result)) return redeliver();
      } catch (err) {
        console.error("[stripe-webhook] cart fulfillment failed:", err);
        return redeliver();
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

/**
 * Did this trigger leave the order produced? "sent" and "already" (another
 * trigger won) are done. "failed" and "no-payload" are NOT — the claim has been
 * released and a human alerted, and a 200 here would tell Stripe to stop
 * retrying, leaving the parent's reload of the thanks page as the only other
 * way the order ever reaches the printer. A redelivery is safe: the claim is
 * idempotent and so is the school ledger.
 */
function fulfilled(result: FulfillResult): boolean {
  return result === "sent" || result === "already";
}

/**
 * Is there nothing more a redelivery could do for this school order? Sent, done
 * by another trigger, HELD for a person (a retry would only hold it again), or
 * naming no order at all (alerted; a retry cannot conjure one). "in-progress"
 * (another attempt holds the claim — possibly a crashed one whose claim will
 * expire) and "failed" come back later.
 */
function schoolSettled(result: SchoolFulfillResult): boolean {
  return result === "sent" || result === "already" || result === "held" || result === "no-order";
}

/** Ask Stripe to deliver this event again (it retries non-2xx for up to 3 days). */
function redeliver(): NextResponse {
  return NextResponse.json({ received: true, retry: true }, { status: 500 });
}

/**
 * A refund takes the order back out of what the school raised.
 *
 * Without this, a refunded frame stayed in the ledger and the club was still told
 * it earned that order's donation. Only a FULL refund counts: a partial one (a
 * shipping credit, a damaged-part discount) is still a frame that sold, so it
 * keeps its donation and is only logged for a human to judge.
 *
 * A charge does not carry our metadata; the Checkout Session that took the
 * payment does, so the session is looked up by its payment intent. The account
 * is shared with Still Beside Me, so anything that is not a school frame is
 * ignored exactly as the completed branch ignores it. A lookup that fails asks
 * Stripe to redeliver; the ledger mark is idempotent, so a retry is safe.
 *
 * Needs `charge.refunded` ticked on the webhook endpoint in the Stripe dashboard.
 */
async function handleRefund(stripe: Stripe, charge: Stripe.Charge): Promise<NextResponse> {
  const ok = NextResponse.json({ received: true }, { status: 200 });
  if (!charge.refunded) {
    console.log(`[stripe-webhook] charge ${charge.id} partly refunded; the school ledger is unchanged.`);
    return ok;
  }
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent) return ok;

  let session: Stripe.Checkout.Session | undefined;
  try {
    const found = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
    session = found.data[0];
  } catch (err) {
    console.error("[stripe-webhook] refund: session lookup failed:", err instanceof Error ? err.message : err);
    return redeliver();
  }
  const metadata = session?.metadata ?? {};
  if (metadata.kind !== "school-frame" || !metadata.orderId) return ok;

  const marked = await markSchoolOrderRefunded(metadata.orderId);
  console.log(
    marked
      ? `[stripe-webhook] school order ${metadata.orderId} (${metadata.school ?? "?"}) refunded; removed from the school's total.`
      : `[stripe-webhook] school order ${metadata.orderId} refunded but was not in the ledger (a $0 order, or its write was lost).`,
  );
  return ok;
}
