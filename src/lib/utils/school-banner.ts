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
//
// Kits now SEED that layout (2026-09-23): the school on the top runner and
// "HOME OF THE" as the bottom tagline, over the mascot. The fragment moved, it
// did not go away — a name on the headline would read "HOME OF THE / OKAFOR" —
// so the same repair drops a seeded tagline fragment once the headline is no
// longer the mascot.

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

/**
 * What a parent's typing can put on a banner: the banner faces are type, not
 * emoji, so a pasted "GO STANG🐎 🏒" drew full-colour emoji on the frame that the
 * print cannot reproduce — and each one spent two of the line's characters.
 * Pictographs (with their joiners, skin tones and presentation selectors) are
 * dropped and line breaks become spaces.
 */
export function bannerTypeable(raw: string): string {
  return raw
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(/[\r\n\t]+/g, " ");
}

/**
 * `text` in at most `max` characters, cut at a WORD boundary when it has to be
 * cut. A pasted long name was sliced mid-word ("MARY ANNE SMITH-JONES LO").
 * A single word longer than `max` is the one case that still has to be sliced.
 */
export function fitAtWord(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  if (max <= 0) return "";
  const cut = t.slice(0, max + 1).lastIndexOf(" ");
  return (cut > 0 ? t.slice(0, cut) : t.slice(0, max)).trim();
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
  if (!bottom?.text || !seededBottom?.text) return sections;
  // Still the mascot the builder put there: the sentence is intact, leave it.
  if (normalizeLine(bottom.text) === normalizeLine(seededBottom.text)) return sections;

  let out = sections;

  // NO BOTTOM-FRAGMENT REPAIR, deliberately. Kits now seed HOME OF THE as the
  // bottom tagline over the mascot, and a name on that headline would dangle the
  // same way — but that case is closed at WRITE time (`writePersonOnBanner`), and
  // no design was ever saved under that layout before the write-time rule
  // existed. A hydrate repair could not tell MILLER from a parent's own
  // LADY WILDCATS under HOME OF THE, and would have erased the second between
  // visits with nothing in the session to show why.

  // THE TOP FRAGMENT, in designs saved under the old layout (HOME OF THE on top).
  if (top?.text && SEEDED_TOP_FRAGMENTS.includes(normalizeLine(top.text))) {
    const promoted = schoolTopLine({
      // The identity as it was SEEDED — the persisted tagline has since become the
      // class year, so the school's own name only survives in the seed: on the
      // seeded top runner (today's kits), or as the seeded tagline (older ones).
      kit: {
        banners: {
          tagline: [seeded?.top?.text?.text, seededBottom.tagline].find(
            (l) => l && !SEEDED_TOP_FRAGMENTS.includes(normalizeLine(l)),
          ),
          bottom: seededBottom.text,
        },
      },
      currentTop: top.text,
      personName: bottom.text,
    });
    if (promoted) {
      out = { ...out, top: { ...out.top, mode: "text", text: { ...top, text: promoted } } };
    }
  }
  return out;
}

/** What `writePersonOnBanner` needs of the design store — the store satisfies it. */
export interface BannerWriteTarget {
  sections?: BannerSections;
  setSectionText: (id: "top" | "bottom", updates: { text?: string; tagline?: string }) => void;
}

/**
 * Put the PERSON on the bottom banner and move the SCHOOL up to the top.
 *
 * THE builder's banner write — every intake field, banner-line chip and preset
 * goes through it (SchoolDesigner's `writePerson`), and so do the pilot sample
 * sheets, so a sample can never say something a parent's frame would not.
 *
 * The two halves are one operation: a name on the headline under a seeded
 * fragment reads "HOME OF THE / MILLER", so the school is promoted to the top
 * strip when the top is ours to replace (`schoolTopLine`) and the seeded bottom
 * fragment goes when the name arrives with no line of its own. That half lives
 * ONLY here, at write time — the hydrate repair (`repairDanglingTopLine`) cannot
 * tell a name from a parent's own headline, so it does not try.
 */
export function writePersonOnBanner(
  api: BannerWriteTarget,
  kit: TopLineInput["kit"],
  person: { name?: string; tagline?: string },
): void {
  const name = (person.name ?? "").trim().toUpperCase();
  const tagline = person.tagline ?? "";
  if (!name && !tagline) return;
  if (name) {
    const promoted = schoolTopLine({
      kit,
      currentTop: api.sections?.top?.text?.text,
      currentBottom: api.sections?.bottom?.text?.text,
      personName: name,
    });
    if (promoted) api.setSectionText("top", { text: promoted });
  }
  const dangling =
    name && !tagline && SEEDED_TOP_FRAGMENTS.includes(normalizeLine(api.sections?.bottom?.text?.tagline));
  api.setSectionText("bottom", {
    ...(name ? { text: name } : {}),
    ...(tagline ? { tagline } : dangling ? { tagline: "" } : {}),
  });
}
