"use client";

import { useEffect, useState } from "react";

export interface CarouselReview {
  quote: string;
  name: string;
  role?: string;
  /** 1-5. Only set for genuine customer reviews — never for maker quotes. */
  rating?: number;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex justify-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i < n ? "text-brand-gold" : "text-brand-navy-soft/30"}>
          ★
        </span>
      ))}
    </div>
  );
}

// Auto-rotating quote carousel. All items are stacked in a single grid cell, so
// the container is always as tall as the LONGEST review — no layout shift as it
// rotates. Only the active item is visible (cross-fade). Stars show only for
// items with a rating (real customer reviews); maker quotes show name + role.
export function ReviewsCarousel({ reviews, intervalMs = 5000 }: { reviews: CarouselReview[]; intervalMs?: number }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const id = setInterval(() => setIdx((p) => (p + 1) % reviews.length), intervalMs);
    return () => clearInterval(id);
  }, [reviews.length, intervalMs]);

  if (reviews.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="grid">
        {reviews.map((r, n) => (
          <div
            key={n}
            aria-hidden={n !== idx}
            className={`col-start-1 row-start-1 transition-opacity duration-500 ${
              n === idx ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {typeof r.rating === "number" && <Stars n={r.rating} />}
            <blockquote className="mx-auto mt-4 text-xl leading-relaxed text-brand-ink/90 sm:text-2xl">
              &ldquo;{r.quote}&rdquo;
            </blockquote>
            <p className="mt-5 text-sm font-semibold text-brand-navy">
              {r.name}
              {r.role && <span className="block font-normal text-brand-ink/60">{r.role}</span>}
            </p>
          </div>
        ))}
      </div>

      {reviews.length > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {reviews.map((_, d) => (
            <button
              key={d}
              type="button"
              onClick={() => setIdx(d)}
              aria-label={`Show review ${d + 1}`}
              aria-current={d === idx}
              className={`h-2 w-2 rounded-full transition-colors ${
                d === idx ? "bg-brand-red" : "bg-brand-navy-soft/30 hover:bg-brand-navy-soft/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
