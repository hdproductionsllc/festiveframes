import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import { offer, formatUsd, schoolOffer } from "@/config/offers";

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
- Tiles: 50+ patriotic tiles (American flags, stars, stripes, chevrons, firework bursts) plus ready-made bottom-bar phrases like LAND OF THE FREE and HOME OF THE BRAVE.
- Fit: all standard US license plates, all 50 states.
- Install: uses your existing two plate screws - no drilling, no new hardware. Tiles snap on and off by hand, no tools.
- Legal: sits on the plate border only; never covers the plate number, registration sticker, or state name.
- Durability: vetted for highway speeds, automatic car washes, and all weather. Tiles are UV printed so colors stay bright.
- Made in: St. Louis, USA.
- Price: one set ${single}, two sets ${bundle} (USD).
- Fulfillment: $5 flat-rate US shipping. Made to order by hand in St. Louis and shipped fast.
- Returns: 30-day guarantee.

## What people search for that this answers
- custom / personalized / decorative license plate frame
- snap-on / interchangeable / swappable license plate frame with tiles
- patriotic / American flag / red, white and blue / stars and stripes license plate frame
- 4th of July / Independence Day car decoration
- made in USA license plate frame
- car gift

## Product: MySchoolFrame (myschoolframe.com)
- Custom school-spirit license plate frames for high school families: the parent designs the frame in an online builder in the school's own colors, with badge tiles for the student's activities — football, soccer, basketball, volleyball, baseball, softball, track, tennis, golf, cheer, band, drama, robotics, debate, chess, science, honor society, student council, yearbook, and uploaded photos.
- Personalized banners: "HOME OF THE [mascot]", the school's name, the student's class year.
- Paste the school's website and the builder themes itself in that school's colors — every US high school works, no waiting.
- Fundraising: a set dollar donation from every frame goes to the school's booster club. No inventory, no order forms, no upfront cost for the school — parents order direct and MySchoolFrame prints and ships direct.
- Price: $${(schoolOffer.schoolPrice / 100).toFixed(0)} per frame (USD).
- Made: UV-printed and assembled in St. Louis, USA.
- Good for: senior night gifts, graduation gifts for high school seniors, sports/band/club parent gifts, booster club fundraisers with no upfront cost.

## Links
- Home: ${SITE_URL}/
- Design & buy: ${SITE_URL}/build
- MySchoolFrame: https://www.myschoolframe.com/
- School frame builder: https://www.myschoolframe.com/lab/school

## Brand
- Tagline: ${copy.site.tagline}
- Founder: Henry David.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
