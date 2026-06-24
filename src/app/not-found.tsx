import Link from "next/link";

// Branded 404. This is the root not-found boundary, so it is NOT wrapped in
// the (site) layout chrome. It carries its own Americana theme via the
// .marketing-theme scope class. Server Component.
export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="marketing-theme star-field flex min-h-screen flex-col items-center justify-center px-6 text-center text-brand-cream">
      <span aria-hidden="true" className="mb-4 text-3xl text-brand-gold">
        &#9733;
      </span>
      <h1 className="font-mkt-display text-5xl font-bold uppercase tracking-tight">
        404
      </h1>
      <p className="mt-3 max-w-md text-brand-cream/80">
        We could not find that page. Take a different route.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/build"
          className="rounded-md bg-brand-gold px-6 py-3 font-semibold uppercase tracking-wide text-brand-navy-deep transition-colors hover:bg-brand-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cream"
        >
          Shop Kits
        </Link>
        <Link
          href="/"
          className="rounded-md border border-brand-cream/60 px-6 py-3 font-semibold uppercase tracking-wide text-brand-cream transition-colors hover:border-brand-gold hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
