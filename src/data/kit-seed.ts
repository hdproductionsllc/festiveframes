import type { FrameConfig } from "@/lib/types";
import type { SchoolKit } from "@/data/school-kits";
import { GENERIC_MARKS as PRESET_GENERIC_MARKS, sideColumn } from "@/data/school-presets";
import { markPieceId } from "@/data/sets/school-marks";

// ─── The frame a school's parent lands on, DERIVED ───────────────────────────
//
// A kit used to carry a hand-written map of slot ids ("frame:wing-left-0": ...).
// That worked for exactly one geometry. The flush fork's side panels sit on three
// rows instead of nine, so every one of those ids either vanished or meant a
// different cell, and the seeding code's answer was to silently drop the ones
// that no longer existed — a school opening on a half-empty frame, with nothing
// failing anywhere.
//
// So the seed is computed, from two inputs the kit actually knows:
//
//   kit.signature — four badges that are TRUE of this school, most distinctive
//                   first. Not decoration: the selection is the homework. A
//                   school known for racquetball gets racquetball.
//   kit.marks     — its own crest/mascot art, when we have been given it and are
//                   allowed to use it. Absent for most schools, which is fine:
//                   the generic crest is still a school shape.
//
// and one input the FRAME knows: where its side badges go and how big each is —
// the squares the square rule declares down each side column (`sideColumn`). Add
// a school, get a finished frame on every geometry; add a geometry, get a finished
// frame for every school. No per-school layout, and no span written by hand.
//
// THE PATTERN obeys the same three rules the presets do (school-presets.ts):
// never the same badge twice in a row, nothing nobody earned, and each position
// answers a different question. Marks and activities alternate so the school's
// own mark is never stacked on itself, and the two sides start from different
// marks so the frame does not read as one column printed twice.

/** A seeded placement, in the shape the design store takes as initial state. */
export interface SeedTile {
  pieceId: string;
  setId: string;
  span: { cols: number; rows: number };
}

/**
 * Shapes that stand in for a school's own mark when we have not been given one —
 * which is most schools. ONE list, owned by school-presets.ts, so the landing
 * frame and a preset tap agree; see the note there on why "Honor Roll" left it.
 */
export const GENERIC_MARKS: readonly string[] = PRESET_GENERIC_MARKS;

/**
 * The two marks a kit leads with — THE rule, exported so the one-time logo
 * upgrade for saved designs (school-store.ts) lands exactly the frame a new
 * visitor is seeded with. It once re-derived the pair from `kitMarkIds`, whose
 * one-mark fallback is an ACTIVITY (for presets), and gave every returning pilot
 * parent the same sport badge twice and the logo once.
 *
 * The fallbacks must dodge the kit's OWN signature. A school we could only partly
 * research carries deliberately non-claiming badges (honor roll, service) in its
 * signature, and the generic mark used to be `hs:honor-star` unconditionally —
 * which stacked an honor star directly on top of an honor star, the one thing the
 * badge rules forbid. The seeding test caught it on four kits at once.
 *
 * `ownMarks: false` answers "what would this kit have been seeded with before it
 * had marks of its own" — the generic stand-ins the upgrade swaps out.
 */
export function kitMarkPair(
  kit: Pick<SchoolKit, "slug" | "marks" | "signature">,
  { ownMarks = true }: { ownMarks?: boolean } = {},
): [string, string] {
  const own = ownMarks ? (kit.marks?.badges ?? []).map((b) => markPieceId(kit.slug, b.key)) : [];
  const signature = new Set(kit.signature ?? []);
  const generic = GENERIC_MARKS.filter((id) => !signature.has(id));
  // A signature that used up the whole generic list would leave nothing to pick
  // and seed `undefined` into two cells — an empty pocket on the frame, with
  // nothing failing anywhere, which is the exact failure mode this file exists
  // to have stopped. No kit in the catalogue does it (a thin kit spends at most
  // one), but the fallback is one line and the alternative is a silent hole.
  const pool = generic.length >= 2 ? generic : GENERIC_MARKS;
  const first = own[0] ?? pool[0];
  // A school with ONE mark wears it in both mark positions rather than pairing it
  // with a generic navy shield that belongs to no school (owner, 2026-09-24). The
  // two positions are never adjacent — opposite columns on the flush frame, and
  // an activity between them on the four-high column — so this is symmetry, not
  // a repeat. Only a school with no marks at all falls back to the generic pair.
  const second = own[1] ?? own[0] ?? pool.find((id) => id !== first)!;
  return [first, second];
}

/**
 * Which positions in a column of `n` carry a MARK rather than an activity.
 *
 * An odd column puts the mark in the middle, where it reads as the centre of the
 * stack (the flush frame's three side badges: sport, crest, sport). An even
 * column alternates from the top, which is the live frame's four.
 */
function isMarkAt(i: number, n: number): boolean {
  return n % 2 === 1 ? i === (n - 1) / 2 : i % 2 === 0;
}

/** One side's pieces, top to bottom. `side` 0 is left, 1 is right. */
function columnPieces(n: number, marks: [string, string], signature: string[], side: 0 | 1): string[] {
  // No signature: the column's activity positions take the generic marks the
  // centre does not, never a badge that claims something (school-presets rule 2).
  const sigs = signature.length ? signature : GENERIC_MARKS.filter((id) => !marks.includes(id));
  // The right column starts further along both lists, so the two sides lead with
  // different marks and show different activities whenever the kit has enough of
  // them. Mirrored geometry, not mirrored content.
  const activityCount = Array.from({ length: n }, (_, i) => i).filter((i) => !isMarkAt(i, n)).length;
  let sigAt = side === 0 ? 0 : activityCount;
  let markAt = side;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    if (isMarkAt(i, n)) {
      out.push(marks[markAt % 2]);
      markAt += 1;
    } else {
      out.push(sigs[sigAt % sigs.length]);
      sigAt += 1;
    }
  }
  return out;
}

/**
 * The badges a kit's builder opens wearing, on THIS geometry.
 *
 * Initial state only — a returning visitor's saved design wins, per the kit
 * layering rule in school-kits.ts.
 *
 * Positions and spans are the frame's (`sideColumn`), and nothing else: a second
 * input that could disagree with the frame (it once took the variant's
 * `badgeStack` too) is how a seed came to name a span the frame would refuse.
 */
export function kitSeedTiles(kit: SchoolKit, config: FrameConfig): Record<string, SeedTile> {
  const marks = kitMarkPair(kit);
  const out: Record<string, SeedTile> = {};
  for (const [i, side] of (["wing-left", "wing-right"] as const).entries()) {
    const column = sideColumn(config, side);
    const pieces = columnPieces(column.length, marks, kit.signature ?? [], i as 0 | 1);
    column.forEach(({ slot, span }, at) => {
      const pieceId = pieces[at];
      out[slot] = {
        pieceId,
        // The set id is the piece id's own namespace — `hs:soccer-patch` is in
        // the high-school set, `mark:sluh-jr-bills:billiken` in school marks.
        // Deriving it beats restating it, which is how a seed ends up naming a
        // set the piece is not in.
        setId: pieceId.split(":")[0],
        span,
      };
    });
  }
  return out;
}
