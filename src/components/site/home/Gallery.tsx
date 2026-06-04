import Image from "next/image";

// Server Component. Gallery of real lifestyle shots plus a placeholder for the
// post-launch festival booth photo. Every image carries descriptive, SEO-rich
// alt text; below-the-fold images lazy-load by default via next/image.

interface Slot {
  /** Short on-tile label (used as caption / placeholder text). */
  label: string;
  /** Descriptive, SEO-friendly alt text. */
  alt: string;
  /** Local image path; when omitted the slot renders as a labeled placeholder. */
  src?: string;
  /** Whether the slot spans two columns on larger screens. */
  wide?: boolean;
}

const slots: Slot[] = [
  {
    label: "Fourth of July cookout",
    alt: "A car wearing a Festive Frames kit parked at a backyard Fourth of July cookout strung with warm lights",
    src: "/gallery/cookout.jpg",
    wide: true,
  },
  {
    label: "Snap a tile on",
    alt: "Hands snapping a decorative tile onto a Festive Frames snap-on license plate frame",
    src: "/gallery/install.jpg",
  },
  {
    label: "Driveway, golden hour",
    alt: "A car with a decorated Festive Frames license plate frame in a driveway at golden hour",
    src: "/gallery/driveway.jpg",
  },
  {
    label: "Out on the street",
    alt: "A Festive Frames kit on the back of a parked car on a tree-lined St. Louis street",
    src: "/gallery/on-car.jpg",
  },
];

export function Gallery() {
  return (
    <section className="star-field text-brand-cream" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="gallery-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-cream sm:text-4xl"
        >
          On the road
        </h2>

        <div className="mt-10 grid auto-rows-[200px] grid-cols-2 gap-4 sm:auto-rows-[240px] lg:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.label}
              className={`relative overflow-hidden rounded-lg border border-brand-navy-soft/50 ${
                slot.wide ? "col-span-2" : ""
              } ${slot.src ? "" : "flex items-end justify-center bg-brand-navy-soft/30 p-3"}`}
            >
              {slot.src ? (
                <Image
                  src={slot.src}
                  alt={slot.alt}
                  fill
                  sizes={
                    slot.wide
                      ? "(min-width: 1024px) 66vw, 100vw"
                      : "(min-width: 1024px) 33vw, 50vw"
                  }
                  className="object-cover vintage-photo"
                />
              ) : (
                <span className="text-center font-mkt-display text-xs font-semibold uppercase tracking-widest text-brand-cream/50">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
