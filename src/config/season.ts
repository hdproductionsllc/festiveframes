// ─────────────────────────────────────────────────────────────
// Season configuration. Everything that rotates per season or per
// promo lives here so future seasons are a config-only change.
//
// Current season: July 4, 2026.
// ─────────────────────────────────────────────────────────────

export interface SeasonPromo {
  /** Discount code customers enter at checkout. */
  code: string;
  /** Discount amount in cents. */
  amountOffCents: number;
  /** Short human label used in popup/banner copy. */
  label: string;
}

export interface SeasonPopup {
  /** Popup headline. */
  title: string;
  /** Popup body copy (reuses the promo label). */
  body: string;
}

export interface Season {
  /** Stable theme key for this season's styling/content. */
  theme: string;
  /** Seasonal hero image path (placeholder until photography lands). */
  heroImage: string;
  /** Active promo code config. */
  promo: SeasonPromo;
  /** Seasonal popup content. */
  popup: SeasonPopup;
  /** Order-by date for guaranteed pre-event delivery (ISO 8601). */
  orderByDate: string;
  /** Festival window start (ISO 8601). */
  festivalStart: string;
  /** Festival window end (ISO 8601). */
  festivalEnd: string;
  /** Headline event date (ISO 8601). */
  eventDate: string;
  /** Flat US shipping cost, in cents. */
  flatShippingCents: number;
  /** Label for the free in-person pickup option. */
  freePickupLabel: string;
  /** Label for the flat shipping option. */
  shippingLabel: string;
}

const promo: SeasonPromo = {
  code: "FOURTH",
  amountOffCents: 500,
  label: "code FOURTH for $5 off, today only.",
};

export const season: Season = {
  theme: "july4-2026",
  // PLACEHOLDER: seasonal hero, 2400x1350 (16:9 landscape)
  heroImage: "/season/july4-2026-hero.jpg",
  promo,
  popup: {
    title: "Happy Fourth of July!",
    body: `Use ${promo.label}`,
  },
  orderByDate: "2026-06-28",
  festivalStart: "2026-07-03",
  festivalEnd: "2026-07-04",
  eventDate: "2026-07-04",
  flatShippingCents: 500,
  freePickupLabel: "Free festival pickup July 3-4",
  shippingLabel: "$5 flat US shipping",
};

/** Canonical site origin. Used for canonical URLs and QR codes. */
export const SITE_URL = "https://festiveframes.co"; // confirmed domain: festiveframes.co (.co, not .com)
