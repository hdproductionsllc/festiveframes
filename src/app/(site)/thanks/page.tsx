import type { Metadata } from "next";
import type Stripe from "stripe";

import { copy } from "@/content/copy";
import { getKit } from "@/config/kits";
import { getStripe } from "@/lib/stripe";
import { EmailCaptureForm } from "@/components/site/home/EmailCaptureForm";
import { SharePrompt } from "@/components/site/thanks/SharePrompt";
import { LeaveReview } from "@/components/site/thanks/LeaveReview";
import { PurchaseTracker } from "@/components/site/thanks/PurchaseTracker";
import { SITE_URL, season } from "@/config/season";

// Post-purchase confirmation at "/thanks". Server Component. Inherits
// SiteHeader + SiteFooter + .marketing-theme from the (site) layout, so we
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
  searchParams: Promise<{ session_id?: string | string[] }>;
}

interface OrderView {
  kitNames: string[];
  quantityLabel: string;
  /** Count of A-Z & 0-9 letter set add-ons purchased (0 when none). */
  alphabetQty: number;
  selection: "single" | "bundle" | null;
  /** true = festival pickup (free), false = shipped, null = unknown. */
  isPickup: boolean | null;
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

  // Fulfillment: a zero shipping amount means festival pickup was chosen.
  let isPickup: boolean | null = null;
  const shippingAmount = session.shipping_cost?.amount_total;
  if (typeof shippingAmount === "number") {
    isPickup = shippingAmount === 0;
  }

  // Raw, primitive analytics values. Prefer the trusted metadata kit ids
  // (already a comma-joined string); fall back to empty when absent.
  const analytics = {
    kitIds: metadata.kitIds ?? "",
    quantity: quantity && Number.isFinite(quantity) ? quantity : 1,
  };

  return { kitNames, quantityLabel, alphabetQty, selection, isPickup, analytics };
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

  const order = sessionId ? await getOrderView(sessionId) : null;
  const shareUrl = process.env.SITE_URL || SITE_URL;

  return (
    <section className="paper-grain">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-24">
        {/* Headline */}
        <h1 className="font-mkt-display text-4xl font-bold uppercase tracking-tight text-brand-navy sm:text-5xl">
          {order ? copy.thanks.headline : copy.thanks.genericHeadline}
        </h1>

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
          <div className="mt-8 rounded-lg border border-brand-navy-soft/40 bg-brand-cream-soft px-6 py-6">
            {order.kitNames.length > 0 && (
              <>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink/70">
                  Your order
                </h2>
                <ul className="mt-3 space-y-1">
                  {order.kitNames.map((name, i) => (
                    <li key={`${name}-${i}`} className="text-lg font-medium text-brand-navy">
                      {name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {order.quantityLabel && (
              <p className="mt-3 text-base text-brand-ink/80">{order.quantityLabel}</p>
            )}
            {order.alphabetQty > 0 && (
              <p className="mt-3 text-base text-brand-ink/80">
                {order.alphabetQty} x A-Z &amp; 0-9 letter set
                {order.alphabetQty > 1 ? "s" : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 max-w-prose text-lg text-brand-ink/80">
            {copy.thanks.genericBody}
          </p>
        )}

        {/* Fulfillment block: pickup vs shipping (only when we know) */}
        {order?.isPickup === true && (
          <div className="mt-6 rounded-lg border border-brand-gold/50 bg-brand-navy-soft/30 px-6 py-6">
            <h2 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-navy">
              {copy.thanks.pickup.heading}
            </h2>
            <p className="mt-2 text-base text-brand-ink/85">{copy.thanks.pickup.body}</p>
            <p className="mt-2 text-base font-semibold text-brand-navy">
              {copy.thanks.pickup.instruction}
            </p>
          </div>
        )}
        {order?.isPickup === false && (
          <div className="mt-6 rounded-lg border border-brand-navy-soft/40 bg-brand-cream-soft px-6 py-6">
            <h2 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-navy">
              {copy.thanks.shipping.heading}
            </h2>
            <p className="mt-2 text-base text-brand-ink/85">{copy.thanks.shipping.body}</p>
          </div>
        )}

        {/* Review prompt — collected reviews are emailed to the team to vet,
            then the genuine ones are published to the homepage carousel. */}
        <div className="mt-12 border-t border-brand-navy-soft/30 pt-10">
          <h2 className="font-mkt-display text-2xl font-bold uppercase tracking-tight text-brand-navy">
            Loved it? Leave a review
          </h2>
          <p className="mt-2 max-w-prose text-base text-brand-ink/85">
            Tell us what you did with it and how it went. We feature real reviews on the site.
          </p>
          <div className="mt-4 max-w-md">
            <LeaveReview />
          </div>
        </div>

        {/* Future tile drops tease (the ONLY place this lives) + email capture */}
        <div className="mt-12 border-t border-brand-navy-soft/30 pt-10">
          <h2 className="font-mkt-display text-2xl font-bold uppercase tracking-tight text-brand-navy">
            {copy.thanks.tease.heading}
          </h2>
          <p className="mt-2 max-w-prose text-base text-brand-ink/85">
            {copy.thanks.tease.body}
          </p>
          <p className="mt-4 text-sm font-medium text-brand-ink/70">
            {copy.thanks.emailCapturePrompt}
          </p>
          <div className="mt-3 max-w-md">
            <EmailCaptureForm />
          </div>
        </div>

        {/* Share prompt */}
        <div className="mt-10">
          <h2 className="font-mkt-display text-xl font-bold uppercase tracking-tight text-brand-navy">
            {copy.thanks.share.heading}
          </h2>
          <p className="mt-2 max-w-prose text-base text-brand-ink/85">
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
