import type { Metadata } from "next";
import type Stripe from "stripe";

import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { getStripe } from "@/lib/stripe";
import { EmailCaptureForm } from "@/components/site/home/EmailCaptureForm";
import { OrderFulfiller } from "@/components/site/thanks/OrderFulfiller";
import { SharePrompt } from "@/components/site/thanks/SharePrompt";
import { PurchaseTracker } from "@/components/site/thanks/PurchaseTracker";
import { SITE_URL, season } from "@/config/season";

// Post-purchase confirmation at "/thanks". Server Component. Inherits
// SiteHeader + SiteFooter + the sticker-theme from the (site) layout, so we
// render sections directly. The only client islands are the reused email
// capture form and the share prompt.
//
// This page reads the Stripe Checkout session server-side to show the real
// order. If there is no session, an invalid one, or Stripe is not configured,
// it renders a graceful generic confirmation. It never redirects or crashes.

export const metadata: Metadata = {
  title: copy.thanks.metaTitle,
  description: copy.thanks.metaDescription,
  // Order pages must never be indexed.
  robots: { index: false, follow: false },
};

// Always render dynamically: this page depends on a per-request session_id and
// must never be statically generated (which would also call Stripe at build).
export const dynamic = "force-dynamic";

interface ThanksPageProps {
  searchParams: Promise<{ session_id?: string | string[]; order?: string | string[] }>;
}

interface OrderView {
  kitNames: string[];
  quantityLabel: string;
  /** Count of A-Z & 0-9 letter set add-ons purchased (0 when none). */
  alphabetQty: number;
  selection: "single" | "bundle" | null;
  /** Raw values for the analytics `purchase` event (primitives only). */
  analytics: {
    kitIds: string;
    quantity: number;
  };
}

/** Derive a clean display order from a retrieved Stripe session. */
function buildOrderView(session: Stripe.Checkout.Session): OrderView {
  const metadata = session.metadata ?? {};
  const selection =
    metadata.selection === "single" || metadata.selection === "bundle"
      ? metadata.selection
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

  return { kitNames, quantityLabel, alphabetQty, selection, analytics };
}

/** Safely retrieve and shape the order. Returns null on any failure. */
async function getOrderView(sessionId: string): Promise<OrderView | null> {
  try {
    const stripe = getStripe();
    // customer_details is inline on the session (not an expandable ref);
    // only line_items needs expanding.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    // Only treat a paid session as a confirmed order.
    if (session.payment_status === "unpaid") return null;
    return buildOrderView(session);
  } catch {
    // Missing key, bad id, or network failure: fall back to generic.
    return null;
  }
}

export default async function ThanksPage({ searchParams }: ThanksPageProps) {
  const params = await searchParams;
  const rawSessionId = params.session_id;
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const rawOrderId = params.order;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

  const order = sessionId ? await getOrderView(sessionId) : null;
  const shareUrl = process.env.SITE_URL || SITE_URL;

  return (
    <section className="bg-[#faf0d6]">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-24">
        {/* Headline */}
        <div
          className="mb-[22px] inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]"
          style={{ boxShadow: "3px 3px 0 #1e1b17" }}
        >
          <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#ed5aa0]" />
          Order confirmed
        </div>
        <h1 className="m-0 text-[clamp(36px,7vw,56px)] font-bold leading-[0.98] tracking-[-1.5px] text-[#1e1b17]">
          {order ? copy.thanks.headline : copy.thanks.genericHeadline}
        </h1>

        {/* Custom builder order: relay the design + artifacts to fulfillment
            (verifies payment server-side, then emails the proof + production files). */}
        {orderId && sessionId && <OrderFulfiller orderId={orderId} sessionId={sessionId} />}

        {/* Fire the funnel `purchase` event once when a real order rendered. */}
        {order && (
          <PurchaseTracker
            selection={order.selection ?? ""}
            kitIds={order.analytics.kitIds}
            quantity={order.analytics.quantity}
          />
        )}

        {/* Order summary or generic confirmation */}
        {order ? (
          <div
            className="mt-8 rounded-[24px] border-[4px] border-[#1e1b17] bg-[#f8c53b] px-6 py-6"
            style={{ boxShadow: "8px 8px 0 #1e1b17" }}
          >
            {order.kitNames.length > 0 && (
              <>
                <h2 className="s-display text-sm font-bold uppercase tracking-[0.12em] text-[#3a2f0c]">
                  Your order
                </h2>
                <ul className="mt-3 space-y-1">
                  {order.kitNames.map((name, i) => (
                    <li key={`${name}-${i}`} className="s-display text-xl font-semibold text-[#1e1b17]">
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {order.quantityLabel && (
              <p className="mt-3 text-base font-bold text-[#3a2f0c]">{order.quantityLabel}</p>
            )}
            {order.alphabetQty > 0 && (
              <p className="mt-3 text-base font-bold text-[#3a2f0c]">
                {order.alphabetQty} x A-Z &amp; 0-9 letter set
                {order.alphabetQty > 1 ? "s" : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 max-w-prose text-lg font-medium text-[#3a352c]">
            {copy.thanks.genericBody}
          </p>
        )}

        {/* All orders ship from St. Louis. */}
        {order && (
          <div
            className="mt-6 rounded-[24px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-6 py-6"
            style={{ boxShadow: "5px 5px 0 #1e1b17" }}
          >
            <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
              {copy.thanks.shipping.heading}
            </h2>
            <p className="mt-2 text-base font-medium text-[#3a352c]">{copy.thanks.shipping.body}</p>
          </div>
        )}

        {/* Future tile drops tease (the ONLY place this lives) + email capture */}
        <div
          className="mt-12 overflow-hidden rounded-[24px] border-[4px] border-[#1e1b17] bg-[#3fb0e6] px-6 py-7"
          style={{ boxShadow: "8px 8px 0 #1e1b17" }}
        >
          <h2 className="s-display text-3xl font-bold tracking-[-1px] text-[#fff9ec]">
            {copy.thanks.tease.heading}
          </h2>
          <p className="mt-2 max-w-prose text-base font-semibold text-[#fff9ec]">
            {copy.thanks.tease.body}
          </p>
          <p className="mt-4 text-sm font-bold text-[#fff9ec]">
            {copy.thanks.emailCapturePrompt}
          </p>
          <div className="mt-3 max-w-md">
            <EmailCaptureForm />
          </div>
        </div>

        {/* Share prompt */}
        <div className="mt-10">
          <h2 className="s-display text-2xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            {copy.thanks.share.heading}
          </h2>
          <p className="mt-2 max-w-prose text-base font-medium text-[#3a352c]">
            {copy.thanks.share.body}
          </p>
          <div className="mt-3">
            <SharePrompt url={shareUrl} shareText={copy.thanks.share.shareText} />
          </div>
        </div>
      </div>
    </section>
  );
}
