// ─────────────────────────────────────────────────────────────
// POST /api/checkout  —  the checkout entry point.
//
// Festive Frames is DESIGN-FIRST. The only live checkout is the
// design-backed custom frame: the builder renders a real design + artifacts,
// stashes them (server draft + localStorage relay), then calls this with
// `kind: "custom-frame"` and an orderId. The amount is ALWAYS re-derived here
// from @/config/offers — never read from the request body.
//
// The legacy "buy a kit" path (selection/kitIds → instant Stripe checkout for a
// pre-made kit) is RETIRED: it could charge for a frame that was never designed.
// Any request that isn't `kind: "custom-frame"` now returns 410 Gone. The
// multi-design cart (`kind: "cart"`) lands in a follow-up phase.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { offer, priceForFramesCents, MAX_CART_FRAMES } from "@/config/offers";
import { SITE_URL, season } from "@/config/season";
import { getDraft, saveCartDraft, type CartLineRef } from "@/lib/order/store";

export const runtime = "nodejs";

/**
 * Base origin for success/cancel URLs. The live request origin wins so
 * checkout returns to whatever domain the visitor is actually on; env and
 * the compiled constant are fallbacks. Pricing is unaffected by this.
 */
function getBaseUrl(request: Request): string {
  return request.headers.get("origin") || process.env.SITE_URL || SITE_URL;
}

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

export async function POST(request: Request): Promise<NextResponse> {
  // Parse JSON defensively.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  // Initialize Stripe lazily; missing key degrades gracefully.
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const baseUrl = getBaseUrl(request);

  // ── Custom builder order: one made-to-order frame at the flat single price.
  // Pricing is server-authoritative (offer.singlePrice). allow_promotion_codes
  // exposes the "Add promotion code" field so a 100%-off code can test at $0,
  // while a real customer simply pays. The small orderId rides in metadata; the
  // full design + artifacts are stashed via /api/order/draft + localStorage relay.
  if ((rawBody as Record<string, unknown>)?.kind === "custom-frame") {
    const orderId = (rawBody as Record<string, unknown>).orderId;
    if (typeof orderId !== "string" || !orderId) {
      return badRequest("Missing orderId for custom order.");
    }
    const rawName = (rawBody as Record<string, unknown>).designName;
    const designName = typeof rawName === "string" && rawName.trim() ? rawName.trim().slice(0, 80) : "Custom License Plate Frame";
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        allow_promotion_codes: true,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: offer.currency,
              unit_amount: offer.singlePrice,
              product_data: { name: designName, description: "Made-to-order custom license plate frame" },
            },
          },
          // Shipping as a LINE ITEM (not a shipping_option) so a 100%-off promo
          // code zeroes the WHOLE order — frame + shipping — for true $0 testing.
          // Real customers (no code) still pay frame + shipping.
          {
            quantity: 1,
            price_data: {
              currency: offer.currency,
              unit_amount: season.flatShippingCents,
              product_data: { name: season.shippingLabel },
            },
          },
        ],
        shipping_address_collection: { allowed_countries: ["US"] },
        success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}&order=${encodeURIComponent(orderId)}`,
        cancel_url: `${baseUrl}/build`,
        metadata: { kind: "custom-frame", orderId, designName },
      });
      if (!session.url) {
        return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
      }
      return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (err) {
      console.error("[checkout] custom-frame session creation failed:", err);
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
    }
  }

  // ── Cart order: one or more designed frames, PAIRS pricing (2-for-$69),
  // checked out in a single Stripe session. The cart *is* the order; a single
  // frame is just a cart of length 1. Pricing is server-authoritative: we
  // re-derive the subtotal from the frame count and apply the bulk savings as a
  // one-off Stripe coupon, so the receipt itemizes each design and the discount.
  if ((rawBody as Record<string, unknown>)?.kind === "cart") {
    const rawLines = (rawBody as Record<string, unknown>).lines;
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return badRequest("Your cart is empty.");
    }

    // Validate every line and confirm its design draft still exists server-side.
    const resolved: { orderId: string; quantity: number; name: string }[] = [];
    let frames = 0;
    for (const raw of rawLines) {
      const orderId = (raw as Record<string, unknown>)?.orderId;
      const qtyRaw = (raw as Record<string, unknown>)?.quantity;
      const quantity = typeof qtyRaw === "number" ? Math.floor(qtyRaw) : NaN;
      if (typeof orderId !== "string" || !orderId || !Number.isInteger(quantity) || quantity < 1) {
        return badRequest("Invalid cart line.");
      }
      const draft = await getDraft(orderId);
      if (!draft) {
        // A design draft expired or was never saved — fail loud so the buyer
        // re-adds it rather than paying for a design we can't produce.
        return NextResponse.json(
          { error: "One of your designs is no longer available. Please re-open it in the builder and add it again." },
          { status: 409 },
        );
      }
      const clientName = (raw as Record<string, unknown>)?.designName;
      const name =
        (typeof draft.parts?.designName === "string" && draft.parts.designName.trim()) ||
        (typeof clientName === "string" && clientName.trim()) ||
        "Custom License Plate Frame";
      resolved.push({ orderId, quantity, name: String(name).slice(0, 80) });
      frames += quantity;
    }

    if (frames < 1 || frames > MAX_CART_FRAMES) {
      return badRequest(`Orders are limited to ${MAX_CART_FRAMES} frames. Please adjust your cart.`);
    }

    const cartId = `cart_${(crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 1e6)}`)}`;
    const lineRefs: CartLineRef[] = resolved.map(({ orderId, quantity }) => ({ orderId, quantity }));

    // Stash the cart (design refs + quantities) so fulfillment can rebuild it.
    try {
      await saveCartDraft(cartId, lineRefs);
    } catch (err) {
      console.error("[checkout] saveCartDraft failed:", err);
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
    }

    // One line item per design (named, so the receipt is legible) + shipping once.
    // Bake the pairs price (2-for-$69) DIRECTLY into a single consolidated frames
    // line item — do NOT use a Stripe coupon for the bulk discount. Stripe forbids
    // combining `discounts` with `allow_promotion_codes`, so a coupon would HIDE
    // the "Add promotion code" field — meaning a customer (or a $0 founder test)
    // couldn't enter their own code on a multi-frame order. With the discount
    // already in the price, we keep promo codes enabled on every cart. Per-design
    // names live in the line description + the production/customer emails.
    const designsSummary = resolved
      .map((r) => (r.quantity > 1 ? `${r.name} ×${r.quantity}` : r.name))
      .join(", ");
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        quantity: 1,
        price_data: {
          currency: offer.currency,
          unit_amount: priceForFramesCents(frames), // authoritative pairs total
          product_data: {
            name: frames > 1 ? `${frames} custom license plate frames` : "Custom license plate frame",
            description: designsSummary,
          },
        },
      },
      // Shipping as a LINE ITEM (not a shipping_option) so a 100%-off promo code
      // zeroes the WHOLE order — frames + shipping — for true $0 founder testing.
      {
        quantity: 1,
        price_data: {
          currency: offer.currency,
          unit_amount: season.flatShippingCents,
          product_data: { name: season.shippingLabel },
        },
      },
    ];

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        // Always on — the bulk discount is in the price, so the promo-code field
        // stays available for founder/marketing codes (incl. 100%-off testing).
        allow_promotion_codes: true,
        shipping_address_collection: { allowed_countries: ["US"] },
        success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}&cart=${encodeURIComponent(cartId)}`,
        cancel_url: `${baseUrl}/cart`,
        metadata: {
          kind: "cart",
          cartId,
          frames: String(frames),
          // Sanity check against the server's authoritative pairs price.
          expectedTotalCents: String(priceForFramesCents(frames) + season.flatShippingCents),
        },
      });
      if (!session.url) {
        return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
      }
      return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (err) {
      console.error("[checkout] cart session creation failed:", err);
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
    }
  }

  // Retired legacy kit checkout (and any unrecognized kind): design-first only.
  return NextResponse.json(
    { error: "This checkout path is no longer available. Design your frame at /build." },
    { status: 410 },
  );
}
