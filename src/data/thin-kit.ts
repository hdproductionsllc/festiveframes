import type { RosterEntry } from "@/data/roster";
import type { SchoolKit } from "@/data/school-kits";

// ─── A kit for a school nobody has researched ────────────────────────────────
//
// 29,467 schools are on the roster and 27 have been researched. This turns one
// roster row — a name, a city, a state, an enrolment — into a `SchoolKit` the
// builder can open, so a parent from any school in the country reaches a working
// frame with their school's name on it instead of a 404.
//
// WHAT A THIN KIT DELIBERATELY DOES NOT DO IS CLAIM ANYTHING. The hand-authored
// kits carry facts with a source per fact, because a wrong fact costs more trust
// than the section earns. We have three facts about a roster school and they are
// all on the address label, so:
//
//   mascot     "" — we do not know it, and Wildcats-by-default is a guess
//                   printed on a product.
//   colours    neutral navy, with `colorSource` saying so out loud. Real colours
//              arrive through `lib/school-brand/cache.ts` when somebody scans the
//              school's website, and only then.
//   signature  four badges that are true of every high school (honours, service,
//              a diploma, a torch) rather than four guesses about this one.
//   welcome    names the school and the city and promises nothing else.
//
// It is the SAME `SchoolKit` shape as the 27, appearance and identity only — a
// thin kit cannot carry geometry any more than an authored one can, which is why
// `/s/<slug>` renders both through exactly the same component on exactly the same
// variant. The only field that is not appearance is `rosterId`, which is
// identity: which row this page is.

/**
 * The neutral pair, for a school whose own colours we have never seen.
 *
 * Navy body, white rim — the same shape as SLUH's `#183B67` / `#FFFFFF`, and
 * chosen because it is what `merrowThread` handles cleanly: white type on a navy
 * banner with a white rim override falls through to BRASS (the white override is
 * 0.00 from the type, the brass stop clears 0.25 from both the type and the
 * field), which is the thread every good-looking kit in the catalogue already
 * gets. Navy is also `DEFAULT_BOTTOM_BAR`'s own background, so a thin kit reads
 * as the product's stock colourway rather than as a broken school.
 */
const NEUTRAL_COLORS = { frame: "#1B2A4A", tileField: "#1B2A4A", rim: "#FFFFFF" } as const;

/**
 * Four badges that assert nothing about THIS school.
 *
 * The precedent is the two partly-researched authored kits (Kirkwood, MICDS),
 * whose last two signature badges are deliberately non-claiming for exactly this
 * reason. At most ONE of `GENERIC_MARKS` may appear here: `kitMarks` picks the
 * frame's two centre marks from whatever of that list the signature has not
 * already used, and a signature that swallowed all three would leave it nothing
 * to pick. (It is hardened against that now — see kit-seed.ts — but a kit that
 * needs the hardening is a kit with a badge stacked on itself.) `thin-kit.test.ts`
 * imports `GENERIC_MARKS` and asserts this list spends at most one of them, so
 * the rule is checked against the real list rather than restated here.
 */
//
// SQUARE ART, because every badge is a square. The first cut carried a 1.53 wide
// service ribbon, a 1.92 landscape diploma and a 0.33 upright torch — slivers in
// a 2.25" square. These four are the near-square non-claiming pieces (honor roll
// 1.04, cap & diploma 1.15, star 1.03, tassel 0.58 — the one concession, since
// the only other neutral near-squares are a stock trophy nobody earned and the
// crest, which `kitMarks` needs). Ordered so the cap & diploma lands on the LEFT
// column, away from the generic grad-cap mark the right column centres on.
const GENERIC_SIGNATURE = ["hs:honor-star", "hs:diploma-cap", "hs:star", "hs:grad-tassel"];

/**
 * Activity chips for the welcome band.
 *
 * These are NOT a claim that the school offers them: the band's own label is
 * "Tap an activity and we'll build the frame around it", so a chip is a picker for the
 * STUDENT's activity, not a fact about the school. Every one maps to a real
 * badge through `CHIP_PRESET_PIECE`, and the list stays short and ordinary —
 * naming a school's actual programmes is research, and research is what a thin
 * kit does not have.
 */
const GENERIC_CHIPS = [
  "Football",
  "Basketball",
  "Soccer",
  "Track",
  "Band",
  "Theater",
  "Service",
  "Honor Roll",
];

/**
 * The suffix that makes a school name a school name.
 *
 * Stripped for the BANNER only — `schoolName` keeps the directory's full
 * spelling. "Kirkwood" belongs across the bottom of a frame; "Kirkwood High
 * School" is a letterhead. The federal directories abbreviate the same suffix
 * six ways and all six are in this file: "High School" (9,480 rows), "High"
 * (4,180), "H S" (2,116), "Senior High School" (512), "Sr High" (318),
 * "Jr/Sr High" (243).
 *
 * "Academy" is NOT on this list, on purpose: it is part of the school's name the
 * way "High School" is not — "Lincoln Park" is not what anyone calls Lincoln
 * Park Academy.
 */
const HIGH_SCHOOL_SUFFIX =
  /[\s,]+(?:(?:jr\.?\s*\/?\s*)?(?:sr\.?|senior|junior)\s+)?h(?:igh)?\.?\s*(?:s\.?|school)?$/i;

/**
 * How many characters of banner text stay READABLE on the shipping frame.
 *
 * Neither renderer overflows — both auto-fit, so a long name simply gets
 * smaller — which is why this is a legibility number and not a geometry one, and
 * why it was set by rendering the frame and looking at it rather than by
 * measuring the bar. Past about this length the bottom banner's headline stops
 * being height-limited and starts shrinking to fit the 11" runner; the tagline
 * under it, which is already the smaller tier, goes first.
 */
export const MAX_BANNER_CHARS = 26;

/**
 * The cap for the long one-line school name — the top runner's full name now,
 * and the tagline tier before that. Larger because that line is set smaller.
 *
 * `bannerBands` gives the headline roughly two-thirds of the bottom banner's
 * height and the tagline the rest, so the tagline is drawn at about 60% of the
 * headline and carries proportionally more text at the same apparent size. Using
 * one cap for both produced the defect this number exists to fix: a 60-character
 * name truncated to the same 20 characters on both lines, and the frame said
 * "FAYETTEVILLE VIRTUAL" twice.
 */
export const MAX_TAGLINE_CHARS = 34;

/** Words no banner should end on. English plus the Spanish and French articles
 *  the directory carries ("Academia de la Esperanza", "Ecole des Arts"). */
const DANGLING = new Set([
  "of", "the", "and", "at", "for", "in", "on", "to", "a", "an", "&",
  "de", "del", "la", "las", "los", "el", "des", "du",
]);

/** Everything after the last comma-free school-name suffix, removed. */
export function stripHighSchool(name: string): string {
  const short = name.replace(HIGH_SCHOOL_SUFFIX, "").trim();
  // A name that IS the suffix ("High School", and the directory has a few) keeps
  // its own name rather than becoming an empty banner.
  return short || name.trim();
}

/**
 * A banner line trimmed until it fits, in the order that loses the least.
 *
 * Dropping "HIGH SCHOOL" costs nothing — everyone reading the frame knows. Then
 * "SAINT" for "ST.", which is how the schools themselves abbreviate it. Only
 * then does it truncate, and only on a word boundary: a banner reading
 * "ACADEMY OF OUR LADY OF PEA" is worse than one reading "ACADEMY OF OUR LADY".
 */
export function fitBanner(text: string, max = MAX_BANNER_CHARS): string {
  let out = text.trim().replace(/\s+/g, " ");
  if (out.length <= max) return out;

  out = stripHighSchool(out);
  if (out.length <= max) return out;

  // Case follows the input, because banner text arrives already upper-cased and
  // a lone "St." in a line of capitals reads as a typo.
  out = out.replace(/\bSAINT\b/g, "ST.").replace(/\bSaint\b/gi, "St.");
  if (out.length <= max) return out;

  const words = out.split(" ");
  const cut = [words[0]];
  for (let i = 1; i < words.length; i++) {
    if (`${cut.join(" ")} ${words[i]}`.length > max) break;
    cut.push(words[i]);
  }
  // A cut on a word boundary can still end mid-PHRASE. "Academy of Our Lady of
  // Peace" trimmed to fit came back "ACADEMY OF OUR LADY OF", which reads as a
  // banner that ran out of frame; "ACADEMY OF OUR LADY" reads as a name. Drop the
  // dangling connective, never the last real word.
  while (cut.length > 1 && DANGLING.has(cut[cut.length - 1].toLowerCase())) cut.pop();
  // A single word longer than the cap comes back whole and over it. The renderer
  // will shrink it, which is the right answer: half a word is not a school.
  return cut.join(" ");
}

/** "Albertville, AL" — the `city` field's shape across the whole catalogue, and
 *  what `kitPlateState` reads the plate's state out of. */
function cityLabel(entry: RosterEntry): string {
  return `${entry.city}, ${entry.state}`;
}

/**
 * A roster row, wearing the shape of a kit.
 *
 * Pure and cheap — called once per request on `/s/<slug>`, so it must not read a
 * file, hit a database or guess. Colour overrides from a completed brand scan are
 * layered on top by the route, not here.
 */
export function thinKitFromRoster(entry: RosterEntry): SchoolKit {
  const shortName = stripHighSchool(entry.name);
  // Same layout rule as the authored kits: the SCHOOL rides the top runner in
  // full — "KIRKWOOD HIGH SCHOOL". When the directory's name does not end in a
  // school suffix — an academy, a magnet centre — the full name is used as is,
  // because appending HIGH SCHOOL to a name that is not one is a small lie on the
  // product. The runner is one long condensed line, so it takes the wider cap.
  const isHighSchool = HIGH_SCHOOL_SUFFIX.test(entry.name);
  const top = fitBanner(
    (isHighSchool ? `${shortName} High School` : entry.name).toUpperCase(),
    MAX_TAGLINE_CHARS,
  );
  // An authored kit's bottom banner reads HOME OF THE / <MASCOT>. A thin kit has
  // no mascot, and "HOME OF THE ALBERTVILLE" is wrong on the first frame a parent
  // sees, so the bottom carries the name people actually say — "KIRKWOOD" — with
  // no tagline over it. The intake writes the student's line there anyway.
  // Two banners that say the same words are one banner and a mistake: when the
  // short name IS the full name (an academy), the bottom falls back to the town,
  // which is the only other fact on the address label.
  const short = fitBanner(shortName.toUpperCase());
  const bottom = short === top ? fitBanner(entry.city.toUpperCase()) : short;

  return {
    slug: entry.slug,
    rosterId: entry.id,
    schoolName: entry.name,
    shortName,
    // Unknown, and a guess here prints on a physical product. The banner and the
    // welcome band are both written to read correctly with it empty.
    mascot: "",
    city: cityLabel(entry),
    colors: { ...NEUTRAL_COLORS },
    // An EMPTY tagline, not an absent one: absent means "the kit default",
    // which is HOME OF THE over a mascot we do not have.
    banners: { top, bottom, tagline: "", text: "#FFFFFF" },
    signature: [...GENERIC_SIGNATURE],
    welcome: {
      headline: `${shortName}, on the back of the car.`,
      message: [
        `We have not built ${entry.name} out yet — no colors taken from ${shortName}'s own artwork, no badges for what ${shortName} is known for. What is here is the frame itself, in neutral navy.`,
        `You can add their class year and the things they do as badges, and choose a line for the bottom banner like SENIOR, #12 or PROUD PARENT. If you know ${shortName}'s website, paste it in and we'll bring in its colors.`,
      ],
      chips: [...GENERIC_CHIPS],
      // No donation line: that promise is made to a school we have an arrangement
      // with, and a thin kit is by definition a school we have never spoken to.
      ordering: `${shortName} families: design your frame and send it in, and we will follow up with ordering details.`,
    },
    status: "demo",
    colorSource:
      "Roster entry — no colours on file; neutral navy until the school's website is scanned.",
  };
}
