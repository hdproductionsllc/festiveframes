import Link from "next/link";
import Image from "next/image";

// Server Component. Marketing site footer used by the (site) route group.
// No props. One natural, SEO-friendly product paragraph plus navigation and
// a contact email placeholder.
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="star-field border-t border-brand-navy-soft/60 text-brand-cream">
      <div className="candy-stripe" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <span className="mb-4 inline-flex rounded-md bg-brand-cream-soft px-3 py-2 shadow-sm ring-1 ring-brand-navy/10">
            <Image
              src="/brand/wordmark.png"
              alt="Festive Frames"
              width={176}
              height={60}
              className="h-14 w-auto"
            />
          </span>
          <p className="max-w-prose text-sm leading-relaxed text-brand-cream/80">
            Festive Frames makes customizable snap-on license plate frame kits.
            Each kit comes with decorative snap-on tiles you press into the frame
            to dress up your plate for the season, the road trip, or the everyday
            drive.
          </p>
        </div>

        <nav aria-label="Footer" className="text-sm">
          <p className="mb-3 font-mkt-display text-xs font-semibold uppercase tracking-widest text-brand-cream/60">
            Explore
          </p>
          <ul className="space-y-2">
            <li>
              <Link
                href="/buy"
                className="text-brand-cream/90 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                Shop kits
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-brand-cream/90 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/returns"
                className="text-brand-cream/90 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                Returns &amp; Refunds
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-brand-cream/90 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                Terms
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@festiveframes.co"
                className="text-brand-cream/90 transition-colors hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
              >
                hello@festiveframes.co
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-brand-navy-soft/40">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-brand-cream/60 sm:px-6">
          &copy; {year} Festive Frames. Proudly made in the USA in St. Louis, Missouri. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
