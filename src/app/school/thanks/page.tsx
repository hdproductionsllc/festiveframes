import Link from "next/link";
import { MsfPageShell, msfMetadata } from "@/components/school/MsfPageShell";
import { ShareYourFrame } from "@/components/school/ShareYourFrame";
import { OrderFulfiller, type FulfillMessages } from "@/components/site/thanks/OrderFulfiller";
import { SITE_URL } from "@/config/season";
import { MSF_THANKS_PATH, MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { getSchoolKit } from "@/data/school-kits";
import { firstParam, getOrderView } from "@/lib/order/thanks-order";

// ─── Where a parent lands after paying for a school frame ────────────────────
//
// The school checkout's `success_url`. It used to be the holiday /thanks, in the
// Festive Frames sticker chrome with the holiday inbox in its footer: the first
// page every paying parent would see once SCHOOL_CHECKOUT_OPEN flips. Same order
// logic (`lib/order/thanks-order`), MySchoolFrame's own page.
//
// Only a session Stripe calls settled is spoken of as an order; anything else gets
// "we couldn't find that order" and a way back to the builder.

export const metadata = msfMetadata({
  title: "Your order",
  description: "Your MySchoolFrame order: what happens next, and who to write to.",
  path: MSF_THANKS_PATH,
  index: false,
});

// Per-request session id; never prerendered (and never calls Stripe at build).
export const dynamic = "force-dynamic";

const MESSAGES: FulfillMessages = {
  working: "Getting your proof ready and sending it to your inbox…",
  done: "Your proof is on its way to your email, and your frame is now in line to be printed.",
  failed:
    "Your payment went through and your order is with us. We're still getting your proof ready, so if it doesn't reach your inbox soon, just reply to your receipt or write to us at",
};

export default async function MsfThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[]; order?: string | string[] }>;
}) {
  const params = await searchParams;
  const sessionId = firstParam(params.session_id);
  const orderId = firstParam(params.order);
  const order = sessionId ? await getOrderView(sessionId) : null;

  if (!order || !order.schoolFrame) {
    return (
      <MsfPageShell title="We couldn't find that order">
        <p>
          This link doesn&apos;t carry an order we can look up. If you&apos;ve just
          checked out, your emailed receipt is the record of it, and if you send
          that to us we&apos;ll track the order down.
        </p>
        <p>
          You can write to us any time at{" "}
          <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a>.
        </p>
        <div className="msf-ctas">
          <Link href="/school#find-my-school" className="msf-btn msf-btn-primary">
            Find your school
          </Link>
        </div>
      </MsfPageShell>
    );
  }

  // Only when the school has a page to point at: sharing a link to a school whose
  // page does not exist is worse than not asking.
  const kit = order.school ? getSchoolKit(order.school) : undefined;
  const origin = (process.env.SITE_URL || SITE_URL).replace(/\/$/, "");

  return (
    <MsfPageShell eyebrow="Order confirmed" title="Thank you! Your order is in.">
      {orderId && sessionId && (
        <OrderFulfiller
          orderId={orderId}
          sessionId={sessionId}
          supportEmail={SCHOOL_CONTACT_EMAIL}
          messages={MESSAGES}
          className="msf-doc-card"
          style={{}}
        />
      )}
      <h2>What happens next</h2>
      <p>
        We print every frame to order in St.&nbsp;Louis, then ship it to the
        address you gave at checkout. Your emailed receipt has the details.
      </p>
      <p>
        Your frame is covered by our <a href={MSF_WARRANTY_PATH}>one-year warranty</a>.
        If anything goes wrong, write to us at{" "}
        <a href={`mailto:${SCHOOL_CONTACT_EMAIL}`}>{SCHOOL_CONTACT_EMAIL}</a> and
        we&apos;ll make it right.
      </p>
      {kit && (
        <div style={{ marginTop: 32 }}>
          <ShareYourFrame schoolShortName={kit.shortName} schoolUrl={`${origin}/s/${kit.slug}`} />
        </div>
      )}
    </MsfPageShell>
  );
}
