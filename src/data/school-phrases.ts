// Templated, categorized quick-pick phrases for a SCHOOL section (spirit / grad /
// achievement / family / alumni). Modeled on the Foundry banner families but with a
// bit more festive spirit — curated UPPERCASE voice, not stale one-off strings.
//
// Two things are TEMPLATED so a chip stays fresh forever:
//   • {year} / {yy}  — resolved to the UPCOMING graduating class at tap time. NEVER
//                      hardcode a year; `getGradYear()` computes it from the date so a
//                      2026-built frame that sells into 2027 defaults to 2027.
//   • [MASCOT] / [#]  — placeholders. [MASCOT] is filled with the school's own
//                      mascot when the page knows it (`withMascot`), so a Marquette
//                      parent sees "GO MUSTANGS"; otherwise it stays literal for the
//                      parent to overwrite, as [#] always does.
//
// Every phrase is ONE line (see the templates below) and every resolved phrase stays
// within SectionEditor's MAX_CHARS.

/**
 * The upcoming graduating class year. A U.S. school year that starts in the fall
 * graduates the FOLLOWING spring, so once we're past the spring ceremonies (~June)
 * the "current" class to sell is next calendar year's. Computed once per load.
 */
export function getGradYear(now: Date = new Date()): number {
  const year = now.getFullYear();
  // getMonth() is 0-indexed: 5 = June. From June onward, roll to next year's class.
  return now.getMonth() >= 5 ? year + 1 : year;
}

/** Two-digit form of a year, e.g. 2027 → "27" (for CLASS OF '27). */
function shortYear(year: number): string {
  return String(year % 100).padStart(2, "0");
}

/** Resolve a template's {year}/{yy} tokens against a grad year. Placeholders like
 *  [MASCOT] and [#] are intentionally left untouched for the user to overwrite. */
export function resolvePhrase(template: string, year: number = getGradYear()): string {
  return template
    .replace(/\{year\}/g, String(year))
    .replace(/\{yy\}/g, `'${shortYear(year)}`);
}

/** The longest banner line the editor accepts. One line on an 11" bar; the
 *  renderers auto-fit, so this is a ceiling on legibility, not on layout. */
export const BANNER_MAX_CHARS = 60;

/** Fill [MASCOT] with this school's mascot ("MUSTANGS"). A blank mascot (a roster
 *  school we know nothing about) leaves the placeholder for the parent to type over. */
export function withMascot(phrase: string, mascot?: string | null): string {
  const m = mascot?.trim().toUpperCase();
  return m ? phrase.replace(/\[MASCOT\]/g, m) : phrase;
}

export interface SchoolPhraseGroup {
  /** Short UPPERCASE category label shown above its chips. */
  category: string;
  /** Resolved phrases ({year} substituted; [MASCOT]/[#] left as editable placeholders). */
  phrases: string[];
}

// ─── Templates (raw, with {year}/{yy}/[MASCOT]/[#] tokens) ──────────────────────
// ONE LINE EACH. The banners are single-line parts (the top runner, and the bottom
// bar / keystone on the flush frame), and a phrase with a break in it printed as a
// cramped second row. The store flattens any break that reaches it (see `oneLine`
// in utils/sections), and school-phrases.test.ts fails on a template carrying one.
const PHRASE_TEMPLATES: { category: string; phrases: string[] }[] = [
  {
    category: "Class",
    phrases: ["CLASS OF {year}", "SENIOR {year}", "CLASS OF {yy}", "GRADUATE", "FUTURE GRAD"],
  },
  {
    category: "Spirit",
    phrases: ["GO [MASCOT]", "[MASCOT] PRIDE", "HOME OF THE [MASCOT]", "SCHOOL SPIRIT", "GO BIG OR GO HOME"],
  },
  {
    category: "Honors",
    phrases: ["HONOR ROLL", "SCHOLAR ATHLETE", "STATE CHAMPS", "ALL-STATE", "VARSITY", "HONOR SOCIETY"],
  },
  {
    category: "Roles",
    phrases: ["CAPTAIN", "SENIOR", "DRUM MAJOR", "#[#]"],
  },
  {
    category: "Family",
    phrases: ["PROUD PARENT", "PROUD MOM", "PROUD DAD", "#1 FAN"],
  },
  {
    category: "Alumni",
    phrases: ["ALUMNI", "[MASCOT] FOR LIFE", "CLASS OF {yy} ALUMNI"],
  },
];

/** Categorized phrase library, {year} resolved once at module load. */
export const SCHOOL_PHRASE_GROUPS: SchoolPhraseGroup[] = PHRASE_TEMPLATES.map((g) => ({
  category: g.category,
  phrases: g.phrases.map((p) => resolvePhrase(p)),
}));

/** Flat resolved list — backward-compatible with the old SCHOOL_PHRASES export. */
export const SCHOOL_PHRASES: string[] = SCHOOL_PHRASE_GROUPS.flatMap((g) => g.phrases);
