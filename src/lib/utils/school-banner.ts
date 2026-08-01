// ─── What the two banners say once the frame becomes a PERSON'S ─────────────
//
// The school frame ships reading as a school:
//
//     HOME OF THE
//     JR. BILLS
//     ST. LOUIS UNIVERSITY HIGH
//
// Three lines, one sentence. Then the intake writes the student onto the bottom
// headline and the class year onto the tagline, and the same frame reads:
//
//     HOME OF THE
//     OKAFOR
//     CLASS OF 2027
//
// which is "HOME OF THE OKAFOR" — a dangling fragment leading into a surname —
// and which no longer names the school anywhere on the frame. One edit caused
// both: the noun that completed the top line, and the school's own name, were
// the two things the student replaced.
//
// The fix is that the identity moves UP as the person moves in. The top strip
// stops being the first half of a sentence and becomes the school:
//
//     ST. LOUIS UNIVERSITY HIGH
//     OKAFOR
//     #12 · CLASS OF 2027
//
// which is how a real personalized plate frame is laid out, and which says the
// school, the student and the year exactly once each.

/**
 * Top lines this builder has SEEDED, which are therefore ours to replace.
 *
 * Same principle as LEGACY_SEEDED_BANNER_FONTS: match our own value exactly and
 * nothing else, so a top line the user typed themselves is never overwritten.
 * These are all sentence FRAGMENTS — they need the noun underneath them, which
 * is exactly why they cannot survive a surname landing there.
 */
export const SEEDED_TOP_FRAGMENTS: readonly string[] = [
  "HOME OF THE",
  "PROUD HOME OF THE",
  "GO",
];

/** Banner text comparison: case, padding and inner runs of space do not count. */
export function normalizeLine(text: string | null | undefined): string {
  return (text ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

export interface TopLineInput {
  /** The kit's banner seeds, when this builder is a school's own page. */
  kit?: { banners?: { bottom?: string; tagline?: string } } | null;
  /** What the top strip says right now. */
  currentTop?: string | null;
  /** What the bottom headline says right now — before the person is written. */
  currentBottom?: string | null;
  /** The person's name about to land on the bottom headline. */
  personName?: string | null;
}

/**
 * The line the TOP strip should carry once the bottom belongs to a person, or
 * null to leave the top exactly as it is.
 *
 * Null is returned far more often than a string, and deliberately: the top is
 * only touched when it is a fragment WE seeded and there is a real school line
 * to promote. Anything the user wrote survives untouched.
 */
export function schoolTopLine({
  kit,
  currentTop,
  currentBottom,
  personName,
}: TopLineInput): string | null {
  const top = normalizeLine(currentTop);
  // Their own words, or something already complete. Leave it.
  if (top && !SEEDED_TOP_FRAGMENTS.includes(top)) return null;

  const person = normalizeLine(personName);
  // The school's full name first: it is the thing a stranger in a car park reads
  // to place the frame, and the mascot is usually on the badges already. Then
  // the mascot line, for a kit with no full name. Then whatever the bottom said
  // before the student took it, which is how the kitless builder keeps WILDCATS.
  for (const candidate of [kit?.banners?.tagline, kit?.banners?.bottom, currentBottom]) {
    const line = normalizeLine(candidate);
    if (!line) continue;
    // Never echo the person onto the top — that is the failure this exists to
    // prevent, in a mirror. It happens when the bottom already holds a name from
    // an earlier visit.
    if (line === person) continue;
    if (SEEDED_TOP_FRAGMENTS.includes(line)) continue;
    if (line === top) continue;
    return line;
  }
  return null;
}
