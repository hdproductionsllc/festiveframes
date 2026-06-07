import { copy } from "@/content/copy";
import { ReviewsCarousel } from "@/components/site/ReviewsCarousel";

// Server Component. Real customer reviews (with star ratings) in an
// auto-rotating carousel. Backed by the same reviews used for the Review /
// AggregateRating schema, so the markup and the page always match.
export function CustomerReviews() {
  const reviews = copy.home.reviews;
  if (reviews.length === 0) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section className="paper-grain" aria-labelledby="reviews-heading">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2
          id="reviews-heading"
          className="text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl"
        >
          What drivers are saying
        </h2>
        <p className="mt-3 text-sm font-semibold text-brand-ink/70">
          {avg.toFixed(1)} out of 5 · {reviews.length} reviews
        </p>
        <div className="mt-8">
          <ReviewsCarousel reviews={reviews} />
        </div>
      </div>
    </section>
  );
}
