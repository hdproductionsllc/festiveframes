// ─────────────────────────────────────────────────────────────
// Season configuration. Everything that rotates per season or per
// promo lives here so future seasons are a config-only change.
//
// Current season: July 4, 2026.
// ─────────────────────────────────────────────────────────────

export interface Season {
  /** Stable theme key for this season's styling/content. */
  theme: string;
  /** Seasonal hero image path (placeholder until photography lands). */
  heroImage: string;
  /** Order-by date for guaranteed pre-event delivery (ISO 8601). */
  orderByDate: string;
  /** Headline event date (ISO 8601). */
  eventDate: string;
  /** Flat US shipping cost, in cents. */
  flatShippingCents: number;
  /** Label for the flat shipping option. */
  shippingLabel: string;
}

export const season: Season = {
  theme: "july4-2026",
  // PLACEHOLDER: seasonal hero, 2400x1350 (16:9 landscape)
  heroImage: "/season/july4-2026-hero.jpg",
  orderByDate: "2026-06-28",
  eventDate: "2026-07-04",
  flatShippingCents: 500,
  shippingLabel: "$5 flat US shipping",
};

/** Canonical site origin. Used for canonical URLs and QR codes. */
// STOPGAP: festiveframes.co serves a parked lander, so point canonicals/OG/sitemap
// at the live Railway origin. Revert to https://festiveframes.co once DNS points to Railway.
export const SITE_URL = "https://festiveframes-production.up.railway.app";
