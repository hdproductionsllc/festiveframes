import Link from "next/link";
import Image from "next/image";

// Server Component. Marketing site header used by the (site) route group.
// No props, no client interactivity (nav is plain links). Restrained
// Americana style: navy bar, cream wordmark, gold star accent.
export function SiteHeader() {
  return (
    <header className="star-field border-b border-brand-navy-soft/60 text-brand-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          aria-label="Festive Frames home"
        >
          <span className="inline-flex rounded-md bg-brand-cream-soft px-3 py-2 shadow-sm ring-1 ring-brand-navy/10">
            <Image
              src="/brand/wordmark.png"
              alt="Festive Frames"
              width={300}
              height={100}
              priority
              className="h-20 w-auto sm:h-24"
            />
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/buy"
            className="rounded-md border border-brand-gold/70 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-brand-gold transition-colors hover:bg-brand-gold hover:text-brand-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
          >
            Shop
          </Link>
        </nav>
      </div>
    </header>
  );
}
