import type { FrameConfig } from "@/lib/types";
import type { SchoolKit } from "@/data/school-kits";
import { sideAnchors } from "@/data/school-presets";
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
// and one input the VARIANT knows: how many badges its side panel holds and how
// tall each is. Add a school, get a finished frame on every geometry; add a
// geometry, get a finished frame for every school. No per-school layout, ever.
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
 * which is most schools. Every one is still a SCHOOL shape; a stock trophy is not
 * on this list, because nobody earned it (school-presets.ts, rule 2).
 */
export const GENERIC_MARKS = ["hs:crest", "hs:honor-star", "hs:grad-cap"];

/**
 * The two marks a kit leads with.
 *
 * The fallbacks must dodge the kit's OWN signature. A school we could only partly
 * research carries deliberately non-claiming badges (honor roll, service) in its
 * signature, and the generic mark used to be `hs:honor-star` unconditionally —
 * which stacked an honor star directly on top of an honor star, the one thing the
 * badge rules forbid. The seeding test caught it on four kits at once.
 */
function kitMarks(kit: SchoolKit): [string, string] {
  const own = (kit.marks?.badges ?? []).map((b) => markPieceId(kit.slug, b.key));
  const signature = new Set(kit.signature ?? []);
  const generic = GENERIC_MARKS.filter((id) => !signature.has(id));
  // A signature that used up the whole generic list would leave nothing to pick
  // and seed `undefined` into two cells — an empty pocket on the frame, with
  // nothing failing anywhere, which is the exact failure mode this file exists
  // to have stopped. No kit in the catalogue does it (a thin kit spends at most
  // one), but the fallback is one line and the alternative is a silent hole.
  const pool = generic.length >= 2 ? generic : GENERIC_MARKS;
  const first = own[0] ?? pool[0];
  const second = own[1] ?? pool.find((id) => id !== first)!;
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
  const sigs = signature.length ? signature : ["hs:honor-star"];
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
 */
export function kitSeedTiles(
  kit: SchoolKit,
  config: FrameConfig,
  stack: number[],
): Record<string, SeedTile> {
  const marks = kitMarks(kit);
  const out: Record<string, SeedTile> = {};
  for (const [i, side] of (["wing-left", "wing-right"] as const).entries()) {
    const anchors = sideAnchors(config, side, stack);
    const pieces = columnPieces(anchors.length, marks, kit.signature ?? [], i as 0 | 1);
    anchors.forEach((slot, at) => {
      const pieceId = pieces[at];
      out[slot] = {
        pieceId,
        // The set id is the piece id's own namespace — `hs:soccer-patch` is in
        // the high-school set, `mark:sluh-jr-bills:billiken` in school marks.
        // Deriving it beats restating it, which is how a seed ends up naming a
        // set the piece is not in.
        setId: pieceId.split(":")[0],
        span: { cols: 2, rows: stack[at] },
      };
    });
  }
  return out;
}
