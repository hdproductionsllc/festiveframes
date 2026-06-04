import type { Metadata } from "next";
import { SITE_URL } from "@/config/season";

// Privacy policy at "/privacy". Server Component. Inherits the (site) marketing
// chrome (SiteHeader, SiteFooter, .marketing-theme) from the route group layout,
// so this file renders only the page content.
//
// LEGAL NOTE: This is a plain-language, general-purpose privacy policy written
// to be accurate to the features this site actually uses today. It is a starting
// template, not legal advice. The owner should have it reviewed by qualified
// counsel before relying on it, and update it whenever the site's data practices
// change.

const PRIVACY_URL = `${SITE_URL}/privacy`;
const CONTACT_EMAIL = "hello@festiveframes.co";

export const metadata: Metadata = {
  title: "Privacy Policy | Festive Frames",
  description:
    "How Festive Frames collects, uses, and protects your information when you browse our site, join our email list, or place an order.",
  alternates: { canonical: PRIVACY_URL },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="font-mkt-display text-3xl font-bold tracking-tight text-brand-navy-deep sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-brand-navy/70">Updated June 2026</p>
      </header>

      <div className="space-y-8 text-base leading-relaxed text-brand-navy/90">
        <section>
          <p>
            Festive Frames makes snap-on license plate frame kits. This policy
            explains what information we collect when you visit our website, join
            our email list, or place an order, how we use that information, and
            the choices you have. We have tried to keep it short and clear. If
            anything is unclear, please reach out using the contact details at
            the end.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            What we collect
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Email address.</strong> If you join our email list, we
              collect the email address you give us so we can send you product
              news and seasonal updates.
            </li>
            <li>
              <strong>Order and payment details.</strong> When you buy a kit,
              checkout and payment are handled by Stripe, our payment processor.
              Stripe collects your name, shipping address, email, and payment
              card details to process your order and ship it to you. We do not
              see or store your full card number.
            </li>
            <li>
              <strong>Usage and analytics data.</strong> Like most websites, we
              collect basic, aggregated information about how the site is used,
              such as the pages you visit and the type of device or browser you
              are on. This helps us understand what is working and improve the
              site.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            How we use your information
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>To process, fulfill, and ship the orders you place.</li>
            <li>
              To send email updates you have asked for, such as product news and
              seasonal offers.
            </li>
            <li>
              To respond to questions or support requests you send us.
            </li>
            <li>
              To understand how the site is used and make it better and more
              reliable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Who we share it with
          </h2>
          <p className="mt-3">
            We do not sell your personal information. We share information only
            with the service providers that help us run the business, and only
            so they can perform their work for us:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Stripe</strong> processes payments and handles checkout,
              including your name, shipping address, and payment details.
            </li>
            <li>
              <strong>Our email provider</strong> stores list subscribers and
              delivers the email updates you sign up for.
            </li>
            <li>
              <strong>Railway</strong> hosts this website and the servers that
              run it.
            </li>
            <li>
              <strong>Our analytics provider</strong> helps us measure how the
              site is used in aggregate.
            </li>
          </ul>
          <p className="mt-3">
            These providers handle your information under their own privacy and
            security terms. We may also disclose information if required by law.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Cookies and local storage
          </h2>
          <p className="mt-3">
            Your browser stores a small amount of information on your device so
            the site can work and remember your preferences:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Your current kit selection, so it is remembered as you browse.</li>
            <li>
              Whether you have already seen or dismissed our seasonal popup, so
              we do not keep showing it.
            </li>
            <li>
              Analytics cookies that help us measure site usage in aggregate.
            </li>
          </ul>
          <p className="mt-3">
            You can clear or block this information through your browser
            settings. Some parts of the site may not remember your preferences
            if you do.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            How long we keep it
          </h2>
          <p className="mt-3">
            We keep order records for as long as we need them to fulfill orders,
            provide support, and meet our tax and legal obligations. We keep
            email list information until you unsubscribe or ask us to remove it.
            Analytics data is retained in aggregate to track trends over time.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Your choices
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Unsubscribe at any time.</strong> Every marketing email
              includes an unsubscribe link, or you can email us to be removed.
            </li>
            <li>
              <strong>Request access or deletion.</strong> You can ask us what
              information we hold about you and ask us to delete it, subject to
              records we must keep by law.
            </li>
          </ul>
          <p className="mt-3">
            To make any of these requests, contact us at the address below.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Children
          </h2>
          <p className="mt-3">
            Our site and products are not directed to children under 13, and we
            do not knowingly collect personal information from children under 13.
            If you believe a child has provided us information, please contact
            us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Changes to this policy
          </h2>
          <p className="mt-3">
            We may update this policy from time to time as our practices or the
            law change. When we do, we will revise the date at the top of this
            page.
          </p>
        </section>

        <section>
          <h2 className="font-mkt-display text-xl font-semibold text-brand-navy-deep">
            Contact us
          </h2>
          <p className="mt-3">
            Questions about this policy or your information? Email us at{" "}
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
