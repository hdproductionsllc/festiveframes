// ─────────────────────────────────────────────────────────────
// Storefront kit catalog (the curated BUYING layer).
//
// NOTE: This is deliberately SEPARATE from the designer's TileSet
// data in src/data/sets/. Kits are marketing/commerce SKUs; tile
// sets are the build-tool inventory. Do not couple the two.
//
// PRICING AUTHORITY: every kit is 3900 cents ($39). The server is
// the only real pricing authority in a later phase; never hardcode
// any other per-kit price here.
// ─────────────────────────────────────────────────────────────

export type KitTier = 1 | 2;

export interface Kit {
  /** Stable kebab-case identifier. Used in ?kit=<id> and Stripe metadata. */
  id: string;
  /** Display name, e.g. "American Classic Kit". */
  name: string;
  /** The "that's me" one-liner that names the buyer's identity. */
  identityLine: string;
  /** The 2-second hook shown on the catalog card (verbatim, locked). */
  cardLine: string;
  /** Sort/grouping tier. Tier 1 leads, tier 2 follows. */
  tier: KitTier;
  /** Price in CENTS. Always 3900 for launch kits. */
  price: number;
  /** Stripe Price ID. Empty until products are created in Stripe. */
  stripePriceId: string;
  /** Plain-language list of what is physically in the kit. */
  contents: string[];
  /** Primary product/hero image path (placeholder until photography lands). */
  heroImage: string;
  /** Catalog thumbnail image path (placeholder until photography lands). */
  thumbnailImage: string;
  /** Limited/scarcity flag (the July 4 dated variant). Still 3900 cents. */
  limited: boolean;
  /** Whether the kit is live in the storefront. */
  active: boolean;
}

/** Standard launch price for every kit, in cents. */
const KIT_PRICE_CENTS = 3900;

export const kits: Kit[] = [
  // ─── TIER 1 ────────────────────────────────────────────────
  {
    id: "american-classic",
    name: "Freedom Frame Set",
    identityLine: "For everyone who celebrates the Fourth out loud.",
    cardLine: "July 4 ready in 10 seconds.",
    tier: 1,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for american-classic
    contents: [
      "50+ red, white, and blue tiles",
      "Ready-made slogans like USA and LAND OF THE FREE",
      "Stars, stripes, and fireworks tiles",
      "More tiles than pictured, so you can mix and match",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/american-classic-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/american-classic-thumb.jpg",
    limited: false,
    active: true,
  },
  {
    id: "merica-mode",
    name: "Merica Mode Kit",
    identityLine: "For people who wear their patriotism with a grin.",
    cardLine: "This one is for the fun people.",
    tier: 1,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for merica-mode
    contents: [
      "MERICA word tiles",
      "HONK IF YOU LOVE FREEDOM word set",
      "FAST NOT FURIOUS word set",
      "Distressed flag tiles",
      "Eagle and star icon tiles",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/merica-mode-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/merica-mode-thumb.jpg",
    limited: false,
    active: false,
  },
  {
    id: "stl-pride",
    name: "STL Pride Kit",
    identityLine: "For people who rep the 314 wherever they drive.",
    cardLine: "If you're from here, this one hits.",
    tier: 1,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for stl-pride
    contents: [
      "STL word tiles",
      "GAME DAY word set",
      "Red and navy solid tiles",
      "Subtle arch icon tile",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/stl-pride-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/stl-pride-thumb.jpg",
    limited: false,
    active: false,
  },
  {
    id: "game-day",
    name: "Game Day Kit",
    identityLine: "For the fans who live for the next matchup.",
    cardLine: "For Saturdays, Sundays, and rivalry days.",
    tier: 1,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for game-day
    contents: [
      "GAME DAY word tiles",
      "DEFENSE WINS word set",
      "TAILGATE MODE word set",
      "Red, navy, and white solid tiles",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/game-day-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/game-day-thumb.jpg",
    limited: false,
    active: false,
  },

  // ─── TIER 2 ────────────────────────────────────────────────
  {
    id: "family-ride",
    name: "Family Ride Kit",
    identityLine: "For parents who let the kids in on the fun.",
    cardLine: "Kids pick the tiles. Parents end up smiling.",
    tier: 2,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for family-ride
    contents: [
      "DAD'S CAR word tiles",
      "MOM MOBILE word set",
      "FAMILY RIDE word set",
      "ROAD TRIP CREW word set",
      "KID APPROVED word set",
      "Star and stripe icon tiles",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/family-ride-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/family-ride-thumb.jpg",
    limited: false,
    active: false,
  },
  {
    id: "july-4-limited",
    name: "July 4 Limited Edition Kit",
    identityLine: "For people who want the one that won't come back.",
    cardLine: "The 2026 tile is printed once. When it's gone, it's gone.",
    tier: 2,
    price: KIT_PRICE_CENTS, // still 3900: this is a $39 variant, NOT a $49 SKU
    stripePriceId: "", // TODO: set after creating the Stripe price for july-4-limited
    contents: [
      "JULY 4 2026 dated tile",
      "Exclusive fireworks tile",
      "USA and flag variant tiles",
      "Full red, white, and blue solid set",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/july-4-limited-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/july-4-limited-thumb.jpg",
    limited: true,
    active: false,
  },

  // ─── FUTURE (not yet live) ─────────────────────────────────
  {
    id: "road-trip",
    name: "Road Trip Kit",
    identityLine: "For the ones who measure life in miles.",
    cardLine: "Pack the car. Pick a direction.",
    tier: 2,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for road-trip
    contents: [
      "ROAM word tiles",
      "DRIVE word set",
      "EXPLORE word set",
      "A LITTLE LOST word set",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/road-trip-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/road-trip-thumb.jpg",
    limited: false,
    active: false,
  },
  {
    id: "minimalist-blackout",
    name: "Minimalist Blackout Kit",
    identityLine: "For people who like it clean and quiet.",
    cardLine: "Less noise. Just clean lines.",
    tier: 2,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for minimalist-blackout
    contents: [
      "Black solid tiles",
      "White solid tiles",
      "Navy solid tiles",
      "DRIVE word set",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/minimalist-blackout-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/minimalist-blackout-thumb.jpg",
    limited: false,
    active: false,
  },
  {
    id: "midwest-clean",
    name: "Midwest Clean Kit",
    identityLine: "For people rooted in the middle of the map.",
    cardLine: "Plain-spoken pride from the middle.",
    tier: 2,
    price: KIT_PRICE_CENTS,
    stripePriceId: "", // TODO: set after creating the Stripe price for midwest-clean
    contents: [
      "MIDWEST word tiles",
      "EST. 2026 word set",
      "Muted texture tiles",
    ],
    // PLACEHOLDER: product hero, 1200x1500 (4:5 portrait)
    heroImage: "/kits/midwest-clean-hero.jpg",
    // PLACEHOLDER: catalog thumbnail, 800x1000 (4:5 portrait)
    thumbnailImage: "/kits/midwest-clean-thumb.jpg",
    limited: false,
    active: false,
  },
];

/** Look up a single kit by its stable id. Returns undefined if not found. */
export function getKit(id: string): Kit | undefined {
  return kits.find((kit) => kit.id === id);
}

/**
 * Active storefront kits, sorted by tier (1 before 2) then by their
 * original array order within each tier. Use this for catalog rendering.
 */
export function getActiveKits(): Kit[] {
  return kits
    .map((kit, index) => ({ kit, index }))
    .filter(({ kit }) => kit.active)
    .sort((a, b) => a.kit.tier - b.kit.tier || a.index - b.index)
    .map(({ kit }) => kit);
}
