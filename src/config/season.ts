// ─────────────────────────────────────────────────────────────
// Season configuration. Everything that rotates per season or per
// promo lives here so future seasons are a config-only change.
//
// Current season: July 4, 2026.
//
// A LEAF MODULE: it imports nothing. Every /s/<slug> bundle reads SITE_URL from
// here, and when this file also imported content/copy.ts (for the OG alt text,
// now in copy.ts itself) every school page shipped the holiday product's
// marketing copy and inbox address to the browser.
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
// The store is served on the www subdomain (Railway can't verify the apex behind
// Cloudflare's CNAME flattening); the bare festiveframes.co 301-redirects to www at
// the Cloudflare edge.
// myschoolframe.com is the domain attached to Railway since the school pivot;
// festiveframes.co 301s here at the Cloudflare edge. Stripe return URLs,
// canonicals, sitemap, and og URLs all build from this.
export const SITE_URL = "https://www.myschoolframe.com";
