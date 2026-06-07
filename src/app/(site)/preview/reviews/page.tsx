import type { Metadata } from "next";
import { ReviewsCarousel, type CarouselReview } from "@/components/site/ReviewsCarousel";

// Internal preview of the star-review carousel layout. NOT linked, noindex.
// These are SAMPLE reviews to show the look only — they are not real and must
// never be presented to customers as genuine. The same component goes on the
// homepage with real reviews + AggregateRating schema once we have them.
export const metadata: Metadata = {
  title: "Reviews preview (sample)",
  robots: { index: false, follow: false },
};

const SAMPLE: CarouselReview[] = [
  { rating: 5, quote: "Took me literally ten seconds to pop the July 4 tiles on before the parade. Installing the base took two minutes with the screws that were already there.", name: "Marcus T., Kansas City" },
  { rating: 5, quote: "Ran it through the brush wash twice and nothing budged. Colors still look brand new.", name: "Dana R., St. Louis" },
  { rating: 5, quote: "Got the bundle so my wife's SUV matches mine. We've already planned out the Halloween swap.", name: "Greg P., O'Fallon" },
  { rating: 4, quote: "Love how fast it changes. Only complaint is I want every season pack now. The 40+ it comes with kept me busy though.", name: "Priya N., Columbia" },
  { rating: 5, quote: "Tired of cheap plastic junk. This feels solid and it's made an hour from me. The fireworks tiles look incredible at night.", name: "Tom B., Chesterfield" },
  { rating: 5, quote: "Let the kids arrange the stars and flags on the bottom bar. Now it's their car too.", name: "Sara L., Springfield" },
  { rating: 5, quote: "Checked before I drove since I was worried about legality. Sits on the border, numbers fully visible. No issues.", name: "Andre W., Florissant" },
  { rating: 5, quote: "Three people at the boat ramp asked where I got it. Sent them all the link.", name: "Becca M., Lake of the Ozarks" },
  { rating: 5, quote: "Exactly what they advertise. One install, endless swaps. Went from blank to St. Louis pride to full Fourth of July.", name: "Kevin H., Kirkwood" },
  { rating: 5, quote: "Knowing only 250 of these exist made it a fun gift for my dad, who decorates for every holiday. He loved it.", name: "Lauren D., Webster Groves" },
];

export default function ReviewsPreviewPage() {
  return (
    <section className="paper-grain">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 rounded-md border border-brand-gold bg-brand-gold/15 px-4 py-3 text-center text-sm font-semibold text-brand-navy-deep">
          Preview only — sample reviews to show the layout. Nothing here is a real customer review; this page is not linked or indexed.
        </div>
        <h2 className="text-center text-3xl font-bold uppercase tracking-tight text-brand-navy sm:text-4xl">
          What drivers are saying
        </h2>
        <div className="mt-3 text-center text-sm text-brand-ink/60">(sample layout)</div>
        <div className="mt-8">
          <ReviewsCarousel reviews={SAMPLE} intervalMs={4000} />
        </div>
      </div>
    </section>
  );
}
