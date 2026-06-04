// ─────────────────────────────────────────────────────────────
// POST /api/checkout  —  the only buying path.
//
// The SERVER is the sole pricing authority. The client sends only a
// selection ("single" | "bundle"), the chosen kit ids, and a quantity.
// The amount charged is re-derived here from @/config/offers and is
// NEVER read from the request body. Every kit id is validated against
// the live catalog (getActiveKits) before any Stripe call.
//
// Flat pricing (enforced in code, not via dashboard price IDs):
//   single -> 3900 cents x quantity
//   bundle -> 6900 cents x quantity (ANY two active kits)
//
// Inline price_data is used (not pre-made Stripe price IDs) so the flat
// pricing rule lives in source and works in test mode immediately.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
import { offer, type OfferSelection } from "@/config/offers";
import { getActiveKits, getKit } from "@/config/kits";
import { SITE_URL, season } from "@/config/season";

export const runtime = "nodejs";

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 5;

interface CheckoutRequest {
  selection: OfferSelection;
  kitIds: string[];
  quantity: number;
}

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

/**
 * Parses and fully validates the request body. Returns either a typed,
 * trusted payload or an error message. The amount is intentionally NOT
 * part of the payload: the server alone decides what to charge.
 */
function parseBody(body: unknown):
  | { ok: true; data: CheckoutRequest }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body." };
  }

  const { selection, kitIds, quantity } = body as Record<string, unknown>;

  // selection
  if (selection !== "single" && selection !== "bundle") {
    return { ok: false, error: "Invalid selection." };
  }

  // quantity: integer 1-5
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < MIN_QUANTITY ||
    quantity > MAX_QUANTITY
  ) {
    return { ok: false, error: "Quantity must be a whole number from 1 to 5." };
  }

  // kitIds: array of the right length for the selection
  if (!Array.isArray(kitIds) || kitIds.some((id) => typeof id !== "string")) {
    return { ok: false, error: "Invalid kit selection." };
  }
  const ids = kitIds as string[];

  const expectedLength = selection === "bundle" ? 2 : 1;
  if (ids.length !== expectedLength) {
    return {
      ok: false,
      error:
        selection === "bundle"
          ? "A bundle requires exactly two kits."
          : "A single order requires exactly one kit.",
    };
  }

  // Every id must be an ACTIVE kit.
  const activeIds = new Set(getActiveKits().map((kit) => kit.id));
  if (ids.some((id) => !activeIds.has(id))) {
    return { ok: false, error: "One or more kits are unavailable." };
  }

  return {
    ok: true,
    data: { selection, kitIds: ids, quantity },
  };
}

/**
 * Builds the Stripe line items from trusted server data. Amounts come
 * ONLY from offers.ts; product names come from the kit catalog.
 */
function buildLineItems(
  data: CheckoutRequest,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (data.selection === "single") {
    const kit = getKit(data.kitIds[0]);
    return [
      {
        quantity: data.quantity,
        price_data: {
          currency: offer.currency,
          unit_amount: offer.singlePrice,
          product_data: { name: kit?.name ?? "Festive Frames Kit" },
        },
      },
    ];
  }

  // bundle: ALWAYS 6900 for the pair, regardless of which two kits.
  const nameA = getKit(data.kitIds[0])?.name ?? "Festive Frames Kit";
  const nameB = getKit(data.kitIds[1])?.name ?? "Festive Frames Kit";
  return [
    {
      quantity: data.quantity,
      price_data: {
        currency: offer.currency,
        unit_amount: offer.bundlePrice,
        product_data: { name: `Two-Kit Bundle: ${nameA} + ${nameB}` },
      },
    },
  ];
}

export async function POST(request: Request): Promise<NextResponse> {
  // Parse JSON defensively.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return badRequest("Invalid request body.");
  }

  const parsed = parseBody(rawBody);
  if (!parsed.ok) {
    return badRequest(parsed.error);
  }
  const data = parsed.data;

  // Initialize Stripe lazily; missing key degrades gracefully.
  let stripe: Stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  const baseUrl = getBaseUrl(request);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: buildLineItems(data),
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: season.freePickupLabel,
            fixed_amount: { amount: 0, currency: offer.currency },
          },
        },
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: season.shippingLabel,
            fixed_amount: {
              amount: season.flatShippingCents,
              currency: offer.currency,
            },
          },
        },
      ],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/buy`,
      metadata: {
        selection: data.selection,
        kitIds: data.kitIds.join(","),
        quantity: String(data.quantity),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[checkout] Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
