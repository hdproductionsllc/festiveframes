import { SITE_URL } from "@/config/season";
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

  // MySchoolFrame ONLY: this file is served on www.myschoolframe.com, and a brief
  // that named the holiday kit taught answer engines that this site sells it. The
  // holiday shop is closed (config/holiday-shop.ts, 2026-09-26), so it is not here.
  const body = `# MySchoolFrame

> Custom school-spirit license plate frames for high school families, designed online in the school's colors and UV-printed in St. Louis, USA.

## Product: MySchoolFrame
- Custom school-spirit license plate frames for high school families: the parent designs the frame in an online builder in the school's colors, with badge tiles for the student's activities (${ACTIVITY_COUNT_LABEL}) — orchestra, marching band, theater, science, yearbook, robotics, debate, soccer, football, volleyball and more — and uploaded photos.
- Badges: every badge is square, uploaded photos included; the frame seats ${badgeCount} of them.
- Banners: the school's name across the top; "HOME OF THE [mascot]" across the bottom. One tap swaps the small line for the class year, the student's number, SENIOR, PROUD PARENT or PROUD GRANDPARENT, an achievement (VARSITY, CAPTAIN, STATE CHAMPIONS, STATE QUALIFIER, ALL-STATE, SCHOLAR ATHLETE), or the buyer's own words. A name is optional and never required.
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

## About
- Founder: Henry David.
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
