import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import { offer, formatUsd } from "@/config/offers";

// Served at /llms.txt — a concise, factual brief for AI answer engines.
// Built from the same config/copy as the site so it never drifts.
export const dynamic = "force-static";

export function GET() {
  const single = formatUsd(offer.singlePrice);
  const bundle = formatUsd(offer.bundlePrice);

  const body = `# Festive Frames

> ${copy.home.metaDescription}

## Product: Freedom Frame Set
- A customizable, snap-on license plate frame with interchangeable decorative tiles.
- Tiles: 40+ patriotic tiles (American flags, stars, stripes, chevrons, firework bursts) plus ready-made bottom-bar phrases like LAND OF THE FREE and HOME OF THE BRAVE.
- Fit: all standard US license plates, all 50 states.
- Install: uses your existing two plate screws - no drilling, no new hardware. Tiles snap on and off by hand, no tools.
- Legal: sits on the plate border only; never covers the plate number, registration sticker, or state name.
- Durability: vetted for highway speeds, automatic car washes, and all weather. Tiles are UV printed so colors stay bright.
- Made in: St. Louis, USA.
- Price: one set ${single}, two sets ${bundle} (USD).
- Fulfillment: free pickup at the St. Louis festival booth July 3-4, 2026, or $5 flat-rate US shipping.
- Returns: 30-day guarantee.

## What people search for that this answers
- custom / personalized / decorative license plate frame
- snap-on / interchangeable / swappable license plate frame with tiles
- patriotic / American flag / red, white and blue / stars and stripes license plate frame
- 4th of July / Independence Day car decoration
- made in USA license plate frame
- car gift

## Links
- Home: ${SITE_URL}/
- Shop: ${SITE_URL}/buy

## Brand
- Tagline: ${copy.site.tagline}
- Founder: Henry David. Tile artist: Becky Newman.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
