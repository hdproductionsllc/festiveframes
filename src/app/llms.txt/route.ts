import { SITE_URL } from "@/config/season";
import { copy } from "@/content/copy";
import { offer, formatUsd } from "@/config/offers";
import { pilotSchoolKits } from "@/data/school-pilot";
import { ACTIVITY_COUNT_LABEL } from "@/content/school-activity-count";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { badgeSpots } from "@/lib/utils/snappet";
import { SCHOOL_CHECKOUT_OPEN } from "@/config/school-checkout";
import { MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_WARRANTY_PATH } from "@/content/msf-pages";

// Served at /llms.txt — a concise, factual brief for AI answer engines.
// Built from the same config/copy as the site so it never drifts.
export const dynamic = "force-static";

export function GET() {
  const single = formatUsd(offer.singlePrice);
  const bundle = formatUsd(offer.bundlePrice);
  // The pilot schools, from the same list the finder offers, so this brief can
  // never name a school the site does not (or miss one it does).
  const pilot = pilotSchoolKits().map((k) => `${k.schoolName} (${k.city})`);
  const pilotList = `${pilot.slice(0, -1).join(", ")} and ${pilot[pilot.length - 1]}`;
  // Read off the frame every /s/<slug> builder ships, never typed in.
  const badgeCount = badgeSpots(schoolVariant(SCHOOL_SHIPPING_VARIANT).config, {
    slots: {},
    sections: {},
    textBars: [],
  }).length;

  // MySchoolFrame FIRST: this file is served on www.myschoolframe.com (the holiday
  // domain 301s there), and a brief that opened "# Festive Frames" taught answer
  // engines that myschoolframe.com IS Festive Frames. The holiday kit is still
  // sold, at /build, so it follows as a second product under its own name.
  const body = `# MySchoolFrame

> Custom school-spirit license plate frames for high school families, designed online in the school's colors and UV-printed in St. Louis, USA.

## Product: MySchoolFrame
- Custom school-spirit license plate frames for high school families: the parent designs the frame in an online builder in the school's colors, with badge tiles for the student's activities (${ACTIVITY_COUNT_LABEL}) — orchestra, marching band, theater, science, yearbook, robotics, debate, soccer, football, volleyball and more — and uploaded photos.
- Badges: every badge is square, uploaded photos included; the frame seats ${badgeCount} of them.
- Banners: the school's name across the top; "HOME OF THE [mascot]" across the bottom. One tap swaps the small line for the class year, the student's number, SENIOR, PROUD PARENT or PROUD GRANDPARENT, or the buyer's own words. A name is optional and never required.
- Currently a pilot with ${pilot.length} St. Louis-area high schools: ${pilotList}. Other schools can request to be added.
- Fundraising: a set dollar donation from every frame goes to the school. No inventory, no order forms, no upfront cost for the school — parents deal with MySchoolFrame directly, and MySchoolFrame prints and ships to their door.
- Ordering: ${SCHOOL_CHECKOUT_OPEN ? "design the frame in the builder and order it there." : "design the frame in the builder and send it in; MySchoolFrame follows up with ordering details. Nothing prints until the buyer has seen the design and said yes."}
- Warranty: one year on every MySchoolFrame frame (${SITE_URL}${MSF_WARRANTY_PATH}).
- Made: UV-printed and assembled in St. Louis, USA.
- Good for: senior night gifts, graduation gifts for high school seniors, sports/band/club parent gifts, booster club fundraisers with no upfront cost.

## MySchoolFrame links
- Home: ${SITE_URL}/
- Find your school: ${SITE_URL}/#find-my-school
- Warranty: ${SITE_URL}${MSF_WARRANTY_PATH}
- Terms: ${SITE_URL}${MSF_TERMS_PATH}
- Privacy: ${SITE_URL}${MSF_PRIVACY_PATH}

## Also from the same St. Louis shop: Festive Frames (holiday frame kit)
> ${copy.home.metaDescription}

- Product: Freedom Frame Set, a customizable, snap-on license plate frame with interchangeable decorative tiles.
- Tiles: 50+ patriotic tiles (American flags, stars, stripes, chevrons, firework bursts) plus ready-made bottom-bar phrases like LAND OF THE FREE and HOME OF THE BRAVE.
- Fit: all standard US license plates, all 50 states.
- Install: uses your existing two plate screws - no drilling, no new hardware. Tiles snap on and off by hand, no tools.
- Legal: sits on the plate border only; never covers the plate number, registration sticker, or state name.
- Durability: vetted for highway speeds, automatic car washes, and all weather. Tiles are UV printed so colors stay bright.
- Price: one set ${single}, two sets ${bundle} (USD). $5 flat-rate US shipping. Made to order by hand in St. Louis.
- Returns: 30-day guarantee.
- Design & buy: ${SITE_URL}/build
- Tagline: ${copy.site.tagline}
- Searches it answers: custom / snap-on / interchangeable license plate frame with tiles; patriotic, American flag, red white and blue or 4th of July license plate frame; made in USA license plate frame; car gift.

## About
- Founder: Henry David.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
