// Templated, categorized quick-pick phrases for a SCHOOL section (spirit / grad /
// achievement / family / alumni). Modeled on the Foundry banner families but with a
// bit more festive spirit — curated UPPERCASE voice, not stale one-off strings.
//
// Two things are TEMPLATED so a chip stays fresh forever:
//   • {year} / {yy}  — resolved to the UPCOMING graduating class at tap time. NEVER
//                      hardcode a year; `getGradYear()` computes it from the date so a
//                      2026-built frame that sells into 2027 defaults to 2027.
//   • [MASCOT] / [#]  — bracketed placeholders the user overwrites in the textarea
//                      after tapping (e.g. "GO [MASCOT]" → "GO WILDCATS"). Kept literal
//                      here; the free-typed textarea + tap-to-fill flow is unchanged.
//
// `\n` = a line break — stacks nicely in the tall vertical side panels. Every resolved
// phrase stays within SectionEditor's MAX_CHARS (60).

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

export interface SchoolPhraseGroup {
  /** Short UPPERCASE category label shown above its chips. */
  category: string;
  /** Resolved phrases ({year} substituted; [MASCOT]/[#] left as editable placeholders). */
  phrases: string[];
}

// ─── Templates (raw, with {year}/{yy}/[MASCOT]/[#] tokens) ──────────────────────
const PHRASE_TEMPLATES: { category: string; phrases: string[] }[] = [
  {
    category: "Class / Grad",
    phrases: ["CLASS OF\n{year}", "SENIOR\n{year}", "CLASS OF {yy}", "GRADUATE", "FUTURE\nGRAD"],
  },
  {
    category: "Spirit",
    phrases: ["GO\n[MASCOT]", "[MASCOT]\nPRIDE", "HOME OF\nTHE [MASCOT]", "SCHOOL\nSPIRIT", "GO BIG\nOR GO HOME"],
  },
  {
    category: "Achievement",
    phrases: ["HONOR\nROLL", "SCHOLAR\nATHLETE", "STATE\nCHAMPS", "ALL-STATE", "VARSITY", "NHS"],
  },
  {
    category: "Roles",
    phrases: ["CAPTAIN", "SENIOR", "DRUM\nMAJOR", "#[#]"],
  },
  {
    category: "Family",
    phrases: ["PROUD\nPARENT", "PROUD\nMOM", "PROUD\nDAD", "#1 FAN"],
  },
  {
    category: "Alumni",
    phrases: ["ALUMNI", "ONCE A [MASCOT]\nALWAYS A [MASCOT]", "CLASS OF {yy}\nALUMNI"],
  },
];

/** Categorized phrase library, {year} resolved once at module load. */
export const SCHOOL_PHRASE_GROUPS: SchoolPhraseGroup[] = PHRASE_TEMPLATES.map((g) => ({
  category: g.category,
  phrases: g.phrases.map((p) => resolvePhrase(p)),
}));

/** Flat resolved list — backward-compatible with the old SCHOOL_PHRASES export. */
export const SCHOOL_PHRASES: string[] = SCHOOL_PHRASE_GROUPS.flatMap((g) => g.phrases);
