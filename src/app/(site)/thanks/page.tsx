import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { copy } from "@/content/copy";
import { MSF_THANKS_PATH } from "@/content/msf-pages";
import { firstParam, getOrderView } from "@/lib/order/thanks-order";
import { EmailCaptureForm } from "@/components/site/home/EmailCaptureForm";
import { OrderFulfiller } from "@/components/site/thanks/OrderFulfiller";
import { SharePrompt } from "@/components/site/thanks/SharePrompt";
import { PurchaseTracker } from "@/components/site/thanks/PurchaseTracker";
import { SITE_URL } from "@/config/season";

// Post-purchase confirmation at "/thanks". Server Component. Inherits
// SiteHeader + SiteFooter + the sticker-theme from the (site) layout, so we
// render sections directly. The only client islands are the reused email
// capture form and the share prompt.
//
// This page reads the Stripe Checkout session server-side to show the real
// order. ONLY a session we retrieved and that Stripe says is paid may be called
// confirmed: with no session, an unreadable one, or Stripe not configured we
// have no order to speak of, so the page says exactly that and points back at
// the builder. It never crashes.
//
// A MYSCHOOLFRAME order is not this page's to show: it redirects to
// MSF_THANKS_PATH (MySchoolFrame chrome, Bill's address, the school's own share
// ask). New school checkouts return there directly; this covers any session
// that comes back here anyway (an older Stripe session, a bookmarked link).

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
  searchParams: Promise<{ session_id?: string | string[]; order?: string | string[]; cart?: string | string[] }>;
}

export default async function ThanksPage({ searchParams }: ThanksPageProps) {
  const params = await searchParams;
  const sessionId = firstParam(params.session_id);
  const orderId = firstParam(params.order);
  const cartId = firstParam(params.cart);

  const order = sessionId ? await getOrderView(sessionId) : null;
  if (order?.schoolFrame && sessionId) {
    const q = new URLSearchParams({ session_id: sessionId, ...(orderId ? { order: orderId } : {}) });
    redirect(`${MSF_THANKS_PATH}?${q}`);
  }
  const shareUrl = process.env.SITE_URL || SITE_URL;

  // No session, or one Stripe would not confirm as paid. There is no order to
  // show and none to fulfill, so nothing below this line runs: no relay, no
  // purchase event, no "reserved" headline. Just what we know, and a way on.
  if (!order) {
    return (
      <section className="bg-[#faf0d6]">
        <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-24">
          <div
            className="mb-[22px] inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]"
            style={{ boxShadow: "3px 3px 0 #1e1b17" }}
          >
            <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#9a938a]" />
            {copy.thanks.notFound.badge}
          </div>
          <h1 className="m-0 text-[clamp(36px,7vw,56px)] font-bold leading-[0.98] tracking-[-1.5px] text-[#1e1b17]">
            {copy.thanks.notFound.headline}
          </h1>
          <p className="mt-6 max-w-prose text-lg font-medium text-[#3a352c]">
            {copy.thanks.notFound.body}
          </p>
          <p className="mt-4 max-w-prose text-base font-medium text-[#3a352c]">
            {copy.thanks.notFound.help}{" "}
            <a className="font-bold underline" href={`mailto:${copy.thanks.supportEmail}`}>
              {copy.thanks.supportEmail}
            </a>
          </p>
          <a
            href={copy.thanks.notFound.cta.href}
            className="mt-8 inline-block rounded-full border-[3px] border-[#1e1b17] bg-[#f8c53b] px-6 py-3 text-base font-extrabold text-[#1e1b17]"
            style={{ boxShadow: "5px 5px 0 #1e1b17" }}
          >
            {copy.thanks.notFound.cta.label}
          </a>
        </div>
      </section>
    );
  }

  const supportEmail = copy.thanks.supportEmail;

  return (
    <section className="bg-[#faf0d6]">
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 sm:py-24">
        {/* Headline */}
        <div
          className="mb-[22px] inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]"
          style={{ boxShadow: "3px 3px 0 #1e1b17" }}
        >
          <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#ed5aa0]" />
          {copy.thanks.confirmedBadge}
        </div>
        <h1 className="m-0 text-[clamp(36px,7vw,56px)] font-bold leading-[0.98] tracking-[-1.5px] text-[#1e1b17]">
          {copy.thanks.headline}
        </h1>

        {/* Builder order: relay to fulfillment (verifies payment server-side,
            then emails the proof + production files). A cart carries its cartId;
            a single custom frame carries its orderId + localStorage backup. */}
        {cartId && sessionId ? (
          <OrderFulfiller cartId={cartId} sessionId={sessionId} supportEmail={supportEmail} messages={copy.thanks.fulfill} />
        ) : (
          orderId && sessionId && (
            <OrderFulfiller orderId={orderId} sessionId={sessionId} supportEmail={supportEmail} messages={copy.thanks.fulfill} />
          )
        )}

        {/* Fire the funnel `purchase` event once. Only a confirmed order reaches
            this render, so it can never fire on a bogus session id. */}
        <PurchaseTracker
          selection={order.selection ?? ""}
          kitIds={order.analytics.kitIds}
          quantity={order.analytics.quantity}
        />

        {/* Order summary */}
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

        {/* All orders ship from St. Louis. */}
        <div
          className="mt-6 rounded-[24px] border-[3px] border-[#1e1b17] bg-[#fff9ec] px-6 py-6"
          style={{ boxShadow: "5px 5px 0 #1e1b17" }}
        >
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            {copy.thanks.shipping.heading}
          </h2>
          <p className="mt-2 text-base font-medium text-[#3a352c]">{copy.thanks.shipping.body}</p>
        </div>

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

        {/* Share prompt. */}
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
