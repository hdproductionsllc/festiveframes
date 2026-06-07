import { copy } from "@/content/copy";
import { ReviewsCarousel } from "@/components/site/ReviewsCarousel";

// Server Component. Real maker + artist voices (Becky, Bill, Henry) in an
// auto-rotating carousel. Honestly attributed, NOT customer reviews, so no
// star ratings. Real customer reviews + stars get their own module once we
// have them.
export function Testimonials() {
  const { testimonials } = copy.home;

  return (
    <section className="paper-grain" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <h2
          id="testimonials-heading"
          className="text-center text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          From the people who make it
        </h2>
        <div className="mt-10">
          <ReviewsCarousel reviews={testimonials} />
        </div>
      </div>
    </section>
  );
}
