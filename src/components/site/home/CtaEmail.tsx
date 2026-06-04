import Link from "next/link";
import { copy } from "@/content/copy";
import { EmailCaptureForm } from "./EmailCaptureForm";

// Server Component wrapper. Closing call to action with both CTAs plus the
// email capture (a small client island). The form is the only interactive
// piece, so the rest of this section ships as static server-rendered markup.
export function CtaEmail() {
  const { ctaHeading, primaryCta, secondaryCta, emailCapturePrompt } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2
          id="cta-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          {ctaHeading}
        </h2>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href={primaryCta.href}
            className="inline-flex items-center justify-center rounded-md bg-brand-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            {primaryCta.label}
          </Link>
          <Link
            href={secondaryCta.href}
            className="inline-flex items-center justify-center rounded-md border border-brand-navy px-6 py-3 text-base font-semibold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-navy hover:text-brand-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            {secondaryCta.label}
          </Link>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <p className="mb-3 text-base text-brand-ink/80">{emailCapturePrompt}</p>
          <EmailCaptureForm />
        </div>
      </div>
    </section>
  );
}
