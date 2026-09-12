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
const GENERIC_SIGNATURE = ["hs:honor-star", "hs:service", "hs:diploma", "hs:torch"];

/**
 * Activity chips for the welcome band.
 *
 * These are NOT a claim that the school offers them: the band's own label is
 * "One tap builds the frame. Pick what they do", so a chip is a picker for the
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
 * The tagline's own cap, larger because the tagline is the SMALLER tier.
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
  const bottom = fitBanner(shortName.toUpperCase());
  // The tagline says the whole thing: "KIRKWOOD" over "KIRKWOOD HIGH SCHOOL".
  // When the directory's name does not end in a school suffix — an academy, a
  // magnet centre — the full name is the tagline, because appending HIGH SCHOOL
  // to a name that is not one is a small lie on the product.
  const isHighSchool = HIGH_SCHOOL_SUFFIX.test(entry.name);
  const full = fitBanner(
    (isHighSchool ? `${shortName} High School` : entry.name).toUpperCase(),
    MAX_TAGLINE_CHARS,
  );
  // Two tiers that say the same words are one tier and a mistake. When even the
  // wider cap cannot separate them, the banner drops to a single line — which is
  // what `drawTextBlock` does with an empty tagline, and is what the name wanted
  // in the first place.
  const tagline = full === bottom ? "" : full;

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
    // "HOME OF THE" is the authored kits' rule because their bottom banner is a
    // nickname. With no mascot the bottom banner is the school's NAME, and
    // "HOME OF THE ALBERTVILLE" is wrong on the first frame a parent sees.
    // "HOME OF" reads correctly over a name and over the nickname they may
    // type in its place.
    banners: { top: "HOME OF", bottom, tagline, text: "#FFFFFF" },
    signature: [...GENERIC_SIGNATURE],
    welcome: {
      headline: `${shortName}, on the back of the car.`,
      message: [
        `We have not built ${entry.name} out yet — no colours taken from ${shortName}'s own artwork, no badges for what ${shortName} is known for. What is here is the frame itself, in neutral navy, waiting for a name.`,
        `Put your student's last name across the bottom banner, pick badges for what they actually do, and set the class year. If you know ${shortName}'s website, paste it into the builder and we will pull the school's colours in — for you and for every ${entry.city} family after you.`,
      ],
      chips: [...GENERIC_CHIPS],
      ordering: `${shortName} families: design your frame and send it in, and we will follow up with ordering details. A set donation from every frame goes back to the school.`,
    },
    status: "demo",
    colorSource:
      "Roster entry — no colours on file; neutral navy until the school's website is scanned.",
  };
}
