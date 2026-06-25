import type { Metadata } from "next";
import { SITE_URL } from "@/config/season";

// Returns & Refund policy at "/returns". Server Component in the (site) route
// group, so it inherits SiteHeader, SiteFooter, and .sticker-theme chrome and
// renders only the page content here.
//
// LEGAL NOTE: This is a plain-language Returns & Refund policy written with
// reasonable direct-to-consumer defaults to back the 30-day guarantee. It is a
// starting template, not legal advice, and can be edited. The owner should have
// it reviewed by qualified counsel and update it whenever practices change.

const RETURNS_URL = `${SITE_URL}/returns`;
const CONTACT_EMAIL = "hello@festiveframes.co";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "Our 30-day returns and refund policy for Festive Frames kits: how to start a return, the return window, refund timelines, and condition requirements.",
  alternates: { canonical: RETURNS_URL },
};

export default function ReturnsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <span
          className="mb-4 inline-flex items-center gap-2 rounded-full border-[3px] border-[#1e1b17] bg-[#fff9ec] px-4 py-[7px] text-sm font-extrabold tracking-[0.3px] text-[#1e1b17]"
          style={{ boxShadow: "3px 3px 0 #1e1b17" }}
        >
          <span className="inline-block h-[11px] w-[11px] rounded-full bg-[#f8c53b]" />
          30-day guarantee
        </span>
        <h1 className="s-display text-[clamp(32px,6vw,48px)] font-bold leading-[1] tracking-[-1.5px] text-[#1e1b17]">
          Returns &amp; Refunds
        </h1>
        <p className="mt-2 text-sm font-bold text-[#6a6354]">Updated June 2026</p>
      </header>

      <div
        className="space-y-8 rounded-[24px] border-[4px] border-[#1e1b17] bg-[#fff9ec] px-6 py-7 text-base font-medium leading-relaxed text-[#3a352c] sm:px-8 sm:py-8"
        style={{ boxShadow: "8px 8px 0 #1e1b17" }}
      >
        <section>
          <p>
            We want you to love your Festive Frames kit. If it is not right, you
            can return it within 30 days of delivery for a refund. This page
            explains how returns and refunds work. If anything is unclear, reach
            out using the contact details at the end.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Our 30-day guarantee
          </h2>
          <p className="mt-3">
            You have 30 days from the date your order is delivered to request a
            return. As long as you contact us within that window and the kit
            meets the condition requirements below, we will refund the price you
            paid for the returned items.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            How to start a return
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Email us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold text-[#1e1b17] underline decoration-[#ed5aa0] decoration-2 underline-offset-2 transition-colors hover:text-[#ed5aa0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3fb0e6]"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              with your order number and the items you want to return.
            </li>
            <li>
              We will reply with return instructions and the address to ship the
              kit back to.
            </li>
            <li>
              Pack the items securely and send them back within the return
              window. We recommend a tracked shipping method so you have proof of
              return.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Condition of returned items
          </h2>
          <p className="mt-3">
            Items should be returned in their original condition, unused and with
            all snap-on tiles and frame pieces included. We may reduce or decline
            a refund for items that come back damaged, missing pieces, or showing
            signs of use beyond a reasonable inspection.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Refund timeline
          </h2>
          <p className="mt-3">
            Once we receive and inspect your return, we will process your refund
            within 5 to 7 business days to your original payment method. After
            that, it can take a few additional days for your bank or card issuer
            to post the credit. Original shipping charges are not refundable.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Who pays return shipping
          </h2>
          <p className="mt-3">
            You are responsible for the cost of return shipping unless the item
            arrived damaged or we sent the wrong item. If your kit arrived
            damaged or incorrect, email us and we will cover the return shipping
            and send a replacement or refund.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Damaged or incorrect orders
          </h2>
          <p className="mt-3">
            If your order arrives damaged, defective, or is not what you ordered,
            contact us within 30 days of delivery with a photo if you can. We
            will make it right with a replacement or a full refund, including
            shipping, at no cost to you.
          </p>
        </section>

        <section>
          <h2 className="s-display text-xl font-bold tracking-[-0.5px] text-[#1e1b17]">
            Contact us
          </h2>
          <p className="mt-3">
            Questions about a return or refund? Email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-bold text-[#1e1b17] underline decoration-[#ed5aa0] decoration-2 underline-offset-2 transition-colors hover:text-[#ed5aa0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3fb0e6]"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
