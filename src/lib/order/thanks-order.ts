import type Stripe from "stripe";
import { getKit } from "@/config/kits";
import { getStripe } from "@/lib/stripe";

// ─── The order a thanks page may speak about ─────────────────────────────────
//
// Shared by the holiday /thanks and MySchoolFrame's /school/thanks. ONLY a
// session we retrieved and that Stripe calls settled may be called confirmed:
// with no session, an unreadable one, or Stripe not configured, there is no order
// to speak of and `getOrderView` returns null.

export interface OrderView {
  kitNames: string[];
  quantityLabel: string;
  /** Count of A-Z & 0-9 letter set add-ons purchased (0 when none). */
  alphabetQty: number;
  selection: "single" | "bundle" | null;
  /** Slug of the school this frame raises money for, when it is a school order. */
  school: string | null;
  /** A MySchoolFrame order at all — with or without a school slug (/lab/school
   *  sends none). Decides which brand's follow-up the page shows. */
  schoolFrame: boolean;
  /** Raw values for the analytics `purchase` event (primitives only). */
  analytics: {
    kitIds: string;
    quantity: number;
  };
}

/** Derive a clean display order from a retrieved Stripe session. */
export function buildOrderView(session: Stripe.Checkout.Session): OrderView {
  const metadata = session.metadata ?? {};
  const selection =
    metadata.selection === "single" || metadata.selection === "bundle"
      ? metadata.selection
      : null;
  const school =
    metadata.kind === "school-frame" && typeof metadata.school === "string" && metadata.school
      ? metadata.school
      : null;

  // Kit names: prefer the trusted metadata ids mapped through the catalog;
  // fall back to expanded line item descriptions if metadata is absent.
  let kitNames: string[] = [];
  if (metadata.kitIds) {
    kitNames = metadata.kitIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => getKit(id)?.name ?? id);
  }
  if (kitNames.length === 0) {
    kitNames = (session.line_items?.data ?? [])
      .map((item) => item.description)
      .filter((d): d is string => Boolean(d));
  }

  // Letter-set add-on count. Guard NaN / invalid values to 0.
  const parsedAlphabetQty = Number.parseInt(metadata.alphabetQty ?? "", 10);
  const alphabetQty =
    Number.isFinite(parsedAlphabetQty) && parsedAlphabetQty > 0
      ? parsedAlphabetQty
      : 0;

  const quantity = metadata.quantity ? Number(metadata.quantity) : null;
  const unit = selection === "bundle" ? "bundle" : "kit";
  const quantityLabel =
    quantity && Number.isFinite(quantity)
      ? `${quantity} ${unit}${quantity > 1 ? "s" : ""}`
      : "";

  // Raw, primitive analytics values. Prefer the trusted metadata kit ids
  // (already a comma-joined string); fall back to empty when absent.
  const analytics = {
    kitIds: metadata.kitIds ?? "",
    quantity: quantity && Number.isFinite(quantity) ? quantity : 1,
  };

  return {
    kitNames,
    quantityLabel,
    alphabetQty,
    selection,
    school,
    schoolFrame: metadata.kind === "school-frame",
    analytics,
  };
}

/** Safely retrieve and shape the order. Returns null on any failure. */
export async function getOrderView(sessionId: string): Promise<OrderView | null> {
  try {
    const stripe = getStripe();
    // customer_details is inline on the session (not an expandable ref);
    // only line_items needs expanding.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    // Only a session Stripe calls settled is a confirmed order. A 100%-off promo
    // completes as `no_payment_required`; anything else (including "unpaid" and
    // any status added later) is not ours to confirm.
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return null;
    return buildOrderView(session);
  } catch {
    // Missing key, bad id, or network failure: fall back to generic.
    return null;
  }
}

/** First value of a search param that may repeat. */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
