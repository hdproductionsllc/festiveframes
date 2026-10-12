import { allSchoolKits, type SchoolKit } from "@/data/school-kits";

// ─── The pilot: St. Louis, on purpose ────────────────────────────────────────
//
// The national roster (29,467 schools, data/roster) is built and stays built:
// every `/s/<slug>` still resolves by direct URL, noindexed. What the pilot changes
// is what we OFFER. The owner's rule for this phase (2026-09-23) is to get in front
// of real PTOs and booster clubs in one metro and learn what makes them say yes —
// and a front door that says "every school is on it" claims a relationship with
// 29,000 schools we have never spoken to.
//
// It began as six schools (2026-09-23) and became every authored St. Louis kit on
// 2026-10-11, once each had the pilot treatment: colours measured from its own
// logo, its mascot on the builder, sourced welcome copy and its own plate. A school
// joins this list only with all of that done — the tests that iterate it hold
// every entry to the pilot six's standard.
//
// So the finder offers exactly these, and says so. ONE switch reopens the
// national search: set `SCHOOL_FINDER_SCOPE` to "national". Nothing was deleted to
// get here, so nothing has to be rebuilt to go back.

export const SCHOOL_FINDER_SCOPE: "pilot" | "national" = "pilot";

/** The pilot group: the first six in the order the owner named them, then the
 *  rest of St. Louis in catalogue order. */
export const PILOT_SCHOOL_SLUGS = [
  "marquette-mustangs",
  "eureka-wildcats",
  "lafayette-lancers",
  "parkway-west-longhorns",
  "parkway-central-colts",
  "ladue-rams",
  "kirkwood-pioneers",
  "sluh-jr-bills",
  "micds-rams",
  "cbc-cadets",
  "de-smet-spartans",
  "chaminade-red-devils",
  "vianney-griffins",
  "st-josephs-academy-angels",
  "nerinx-hall-markers",
  "cor-jesu-academy-chargers",
  "incarnate-word-academy-red-knights",
  "webster-groves-statesmen",
  "clayton-greyhounds",
  "lindbergh-flyers",
  "john-burroughs-bombers",
  "saint-louis-priory-ravens",
  "whitfield-warriors",
  "fort-zumwalt-west-jaguars",
  "mehlville-panthers",
  "oakville-tigers",
  "pattonville-pirates",
  "francis-howell-vikings",
] as const;

/** One row the finder can offer. */
export interface FinderSchool {
  slug: string;
  schoolName: string;
  shortName: string;
  mascot: string;
  city: string;
}

function toChoice(k: SchoolKit): FinderSchool {
  return { slug: k.slug, schoolName: k.schoolName, shortName: k.shortName, mascot: k.mascot, city: k.city };
}

/** The pilot kits, in pilot order. Throws on a slug with no kit: a pilot school
 *  that silently vanished from the finder is the failure nobody would notice. */
export function pilotSchoolKits(): SchoolKit[] {
  const bySlug = new Map(allSchoolKits().map((k) => [k.slug, k]));
  return PILOT_SCHOOL_SLUGS.map((slug) => {
    const kit = bySlug.get(slug);
    if (!kit) throw new Error(`pilot school "${slug}" has no kit in data/school-kits.ts`);
    return kit;
  });
}

/**
 * Does `/s/<slug>` open a BUILDER for this school, or the "not ready yet" page?
 *
 * The finder only offers the pilot, but every other school is still reachable by
 * URL — an old link, a typed slug, a roster school's page. Serving those a
 * working builder in the school's name, with "a donation goes back to the school"
 * under it, claims a relationship we do not have. So during the pilot a school
 * outside the pilot gets an honest page that takes a request instead (Bill's idea,
 * 2026-09-23). The pilot schools are unaffected.
 *
 * Same switch as the finder, on purpose: set `SCHOOL_FINDER_SCOPE` to "national"
 * and every authored kit and roster school opens its builder again.
 */
export function isBuilderOpen(slug: string): boolean {
  return SCHOOL_FINDER_SCOPE === "national" || (PILOT_SCHOOL_SLUGS as readonly string[]).includes(slug);
}

/** What every finder on the site is handed: the pilot, or every authored kit
 *  when the national search is open. */
export function finderSchools(): FinderSchool[] {
  return (SCHOOL_FINDER_SCOPE === "pilot" ? pilotSchoolKits() : allSchoolKits()).map(toChoice);
}
