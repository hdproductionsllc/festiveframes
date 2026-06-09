import Image from "next/image";

// Server Component. Real frame designs exported from the builder, shown as
// product images so visitors see the actual look (and tile variety) of the kit.
// Transparent PNGs sit on the cream card so the frames read cleanly.

const FEATURED = {
  src: "/designs/design-250.png",
  alt: "Festive Frames license plate frame for America's 250th, with a 250 YEARS top bar and patriotic flag, star, firework, and 1776 to 2026 tiles",
};

const DESIGNS = [
  {
    src: "/designs/design-1.png",
    alt: "Festive Frames license plate frame with firework bursts, American flags, stars and chevron tiles around a Missouri plate",
  },
  {
    src: "/designs/design-2.png",
    alt: "Red, white and blue Festive Frames license plate frame with pinwheel tiles and a LET FREEDOM RING bottom bar",
  },
  {
    src: "/designs/design-4.png",
    alt: "Festive Frames license plate frame with a bold red and white star border and a HOME OF THE BRAVE bottom bar",
  },
  {
    src: "/designs/design-5.png",
    alt: "Festive Frames license plate frame with eagle, American flag and liberty bell tiles, a 1776 top bar and a USA bottom bar",
  },
];

export function DesignShowcase() {
  return (
    <section className="paper-grain" aria-labelledby="designs-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2
            id="designs-heading"
            className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
          >
            One frame, endless looks
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-ink/90">
            Every Freedom Frame Set comes with 50+ snap-on tiles, so you can restyle the same frame
            as often as you like. Here are a few looks built right from the kit.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-lg border border-brand-navy-soft/20 bg-brand-cream-soft p-3 sm:p-4">
          <Image
            src={FEATURED.src}
            alt={FEATURED.alt}
            width={1100}
            height={592}
            sizes="(min-width: 1024px) 1000px, 100vw"
            className="h-auto w-full rounded"
          />
        </div>

        <ul className="mt-5 grid gap-5 sm:grid-cols-2">
          {DESIGNS.map((d) => (
            <li
              key={d.src}
              className="overflow-hidden rounded-lg border border-brand-navy-soft/20 bg-brand-cream-soft p-3"
            >
              <Image
                src={d.src}
                alt={d.alt}
                width={1100}
                height={592}
                sizes="(min-width: 640px) 50vw, 100vw"
                className="h-auto w-full rounded"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
