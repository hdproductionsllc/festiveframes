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

/**
 * Lines that belong to the STUDENT and can never stand in for the school.
 *
 * The kitless builder seeds its tagline as "CLASS OF 2027" — a placeholder that
 * shows off the two-tier banner, not a school name — so a naive "promote the
 * tagline" would have put the class year in the top strip and left the frame
 * saying CLASS OF 2027 over OKAFOR over CLASS OF 2027.
 */
const STUDENT_LINE = /^CLASS OF\b|\b(18|19|20)\d{2}\b/;

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
    if (STUDENT_LINE.test(line)) continue;
    if (line === top) continue;
    return line;
  }
  return null;
}

/**
 * The same repair, for a design that is ALREADY SAVED reading "HOME OF THE
 * OKAFOR".
 *
 * Fixing the intake only fixes the next frame somebody makes. Every design saved
 * before it — which is every design anyone has made so far, including the one in
 * the owner's own browser — hydrates straight back into the broken state, because
 * nothing rewrites the banners on load.
 *
 * In MERGE and not `migrate`: migrate only runs when the stored version is behind,
 * and these blobs are at the current version, so migrate would never see the one
 * case the repair exists for. Returns the SAME object whenever there is nothing to
 * do, so an ordinary hydrate does not churn renders.
 *
 * The test for "this design has been personalized" is that its bottom headline is
 * no longer the one the builder seeded. An untouched HOME OF THE / JR. BILLS frame
 * is a complete sentence and is left exactly as it is.
 */
type BannerSections = Record<string, { mode?: string; text?: { text?: string; tagline?: string } } | undefined>;

export function repairDanglingTopLine<T extends BannerSections>(
  sections: T,
  seeded: BannerSections | undefined,
): T {
  const top = sections?.top?.text;
  const bottom = sections?.bottom?.text;
  const seededBottom = seeded?.bottom?.text;
  if (!top?.text || !bottom?.text || !seededBottom?.text) return sections;
  if (!SEEDED_TOP_FRAGMENTS.includes(normalizeLine(top.text))) return sections;
  // Still the mascot the builder put there: the sentence is intact, leave it.
  if (normalizeLine(bottom.text) === normalizeLine(seededBottom.text)) return sections;

  const promoted = schoolTopLine({
    // The identity as it was SEEDED — the persisted tagline has since become the
    // class year, so the school's own name only survives here.
    kit: { banners: { tagline: seededBottom.tagline, bottom: seededBottom.text } },
    currentTop: top.text,
    personName: bottom.text,
  });
  if (!promoted) return sections;
  return {
    ...sections,
    top: { ...sections.top, mode: "text", text: { ...top, text: promoted } },
  };
}
