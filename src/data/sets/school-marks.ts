import type { TilePiece, TileSet } from "@/lib/types";
import { TILE_BG } from "@/lib/utils/tile-theme";
import { allSchoolKits, type SchoolKit } from "@/data/school-kits";

// ─── School marks: a school's OWN badges ─────────────────────────────────────
//
// Every other set is artwork we can show anybody. These are trademarks — one
// school's Billiken, another's bulldog — so they are scoped to the kit that owns
// them and must never appear in a different school's palette.
//
// That scoping is a PRESENTATION rule, not a storage one. This set exists because
// both renderers resolve artwork through the single flat `getPiece()` map: a badge
// that is not registered there draws as nothing on screen and prints as nothing.
// So every kit's marks are registered globally (resolvable everywhere) and
// surfaced through `kitMarkPieces(kit)` alone (offered nowhere else). The set is
// deliberately absent from SURFACED_SET_IDS and SCHOOL_SURFACED_SET_IDS.
//
// Adding a school's marks is therefore a `marks` block on its kit and nothing
// else — no file here to keep in sync, which is what makes it work at national
// scale rather than per-school hand-wiring.

const M = "mark";

/** Piece id for a kit mark. seedSlots and presets name these, so it is a
 *  contract: `mark:<slug>:<key>`. */
export function markPieceId(slug: string, key: string): string {
  return `${M}:${slug}:${key}`;
}

/**
 * THE SCHOOL'S TWO MARKS, as piece ids: the mascot (its character) and the crest
 * (its shield).
 *
 * Presets alternate between them rather than repeating one, so a school with real
 * artwork gets a frame made entirely of its own marks. The mascot is whichever
 * badge is NOT a crest — SLUH has both a Billiken and a shield, and the Billiken
 * is the one a parent recognises across a car park. Either may be null;
 * `presetTiles` falls back to the generic crest.
 *
 * Lived inside SchoolDesigner as a memo, and the pilot sample sheets copied it
 * "verbatim" because it was not exported — two copies of which badge is the
 * school's. Now there is one.
 */
export function kitMarkIds(
  kit: Pick<SchoolKit, "slug" | "marks"> | null | undefined,
): { mascot: string | null; alt: string | null } {
  const badges = kit?.marks?.badges;
  if (!kit || !badges?.length) return { mascot: null, alt: null };
  const isCrest = (b: { key: string; name: string }) => /crest|shield|seal/i.test(`${b.key} ${b.name}`);
  const mascot = badges.find((b) => !isCrest(b)) ?? badges[0];
  const alt = badges.find((b) => b !== mascot && isCrest(b)) ?? badges.find((b) => b !== mascot);
  return {
    mascot: markPieceId(kit.slug, mascot.key),
    alt: alt ? markPieceId(kit.slug, alt.key) : null,
  };
}

/** The badge pieces a single kit contributes. Empty for kits without marks. */
export function kitMarkPieces(kit: SchoolKit | undefined): TilePiece[] {
  if (!kit?.marks?.badges?.length) return EMPTY;
  return kit.marks.badges.map((b) => ({
    id: markPieceId(kit.slug, b.key),
    setId: M,
    name: b.name,
    artworkUrl: b.artworkUrl,
    emoji: b.emoji,
    backgroundColor: b.field === "white" ? TILE_BG.white : TILE_BG.navy,
    // Same reasoning as the high-school collection: a mark with line work in it
    // is illegible at a single 0.991" cell. A preference, not a requirement, so
    // these stay eligible for Fill All and Random.
    defaultSpan: { cols: 2, rows: 2 },
  }));
}

/** Stable identity for the no-marks case, so callers can use it as a render prop
 *  without handing React a new array every pass. */
const EMPTY: TilePiece[] = [];

export const schoolMarksSet: TileSet = {
  id: M,
  name: "School Marks",
  icon: "🛡️",
  description: "Official school crests and mascots, scoped to each school's own kit.",
  price: 0,
  pieces: allSchoolKits().flatMap((k) => kitMarkPieces(k)),
  // No presets: a preset is a whole-frame layout offered in the palette, and this
  // set is never surfaced there. Kit layouts live in the kit's own seedSlots.
  presets: [],
};
