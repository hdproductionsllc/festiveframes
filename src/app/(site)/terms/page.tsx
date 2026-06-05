import type { Metadata } from "next";
import { SITE_URL } from "@/config/season";

// Terms of Service at "/terms". Server Component in the (site) route group, so
// it inherits SiteHeader, SiteFooter, and .marketing-theme chrome and renders
// only the page content here.
//
// LEGAL NOTE: These are basic, plain-language Terms of Service for selling
// physical goods online. They are a starting template, not legal advice, and
// can be edited. The owner should have them reviewed by qualified counsel and
// update them whenever the business or practices change.

const TERMS_URL = `${SITE_URL}/terms`;
const CONTACT_EMAIL = "hello@festiveframes.co";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Festive Frames website and your purchase of our snap-on license plate frame kits.",
  alternates: { canonical: TERMS_URL },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="font-mkt-display text-3xl font-bold tracking-tight text-brand-navy-deep sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-brand-navy/70">Updated June 2026</p>
      </header>

      <div className="space-y-8 text-base leading-relaxed text-brand-navy/90">
        <section>
          <p>
            These Terms of Service govern your use of the Festive Frames website
            and your purchase of our products. By using this site or placing an
            order, you agree to these terms. Please read them carefully. If you
            have questions, contact us using the details at the end.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Our products
          </h2>
          <p className="mt-3">
            Festive Frames sells snap-on license plate frame kits and related
            accessories. We try to describe and show our products as accurately
            as possible. Colors and finishes may vary slightly between your
            screen and the physical item.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Orders and acceptance
          </h2>
          <p className="mt-3">
            When you place an order, you are making an offer to buy the items in
            your cart at the prices shown at checkout. We may accept or decline
            any order. If we cannot fulfill an order, or if it was placed in
            error, we will let you know and refund any amount charged.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Pricing and payment
          </h2>
          <p className="mt-3">
            Prices are shown in U.S. dollars and are calculated at checkout.
            Payment is processed securely by Stripe, our payment processor. You
            agree to provide current and accurate payment and contact
            information. We may correct any pricing or product errors and cancel
            affected orders with a refund.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Shipping and delivery
          </h2>
          <p className="mt-3">
            We ship to the addresses you provide at checkout. Delivery times are
            estimates and are not guaranteed. Risk of loss passes to you once the
            order is delivered to the carrier. Please make sure your shipping
            address is correct, as we are not responsible for orders sent to an
            incorrect address you provided.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Returns and refunds
          </h2>
          <p className="mt-3">
            Returns and refunds are handled under our Returns &amp; Refund
            policy, which forms part of these terms. Please review that policy
            for how to start a return, the return window, and refund timelines.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Acceptable use
          </h2>
          <p className="mt-3">
            You agree to use this site only for lawful purposes and not to
            interfere with its operation, attempt to access it in an
            unauthorized way, or use it in a way that could harm us or other
            users. All content on this site, including text, images, and logos,
            is owned by Festive Frames or its licensors and may not be used
            without permission.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Disclaimers and limitation of liability
          </h2>
          <p className="mt-3">
            The site and our products are provided on an as-is basis to the
            fullest extent permitted by law. We do not guarantee that the site
            will always be available or error-free. To the extent permitted by
            law, our total liability for any claim related to a product is
            limited to the amount you paid for that product.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Changes to these terms
          </h2>
          <p className="mt-3">
            We may update these terms from time to time as our business or the
            law changes. When we do, we will revise the date at the top of this
            page. Your continued use of the site after changes take effect means
            you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Contact us
          </h2>
          <p className="mt-3">
            Questions about these terms? Email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-brand-navy underline decoration-brand-gold underline-offset-2 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
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
