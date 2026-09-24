import type { PlacedTile, SectionId, SectionState } from "@/lib/types";

// ─── Bring a saved design up to its school's own marks, ONCE ─────────────────
//
// A kit is initial state only: a returning visitor's saved design always wins on
// hydrate. That is right for everything a parent chose, and it is exactly why the
// pilot schools' official logos (added 2026-09-24) never reached anyone who had
// opened a builder before them. Their saved frame still carried the generic navy
// shield and star in the school's positions and a bare bottom banner (owner,
// 2026-09-24: "Parkway Central doesn't immediately populate with its logo").
//
// So a saved design is upgraded ONCE, then marked. The mark is what keeps the
// parent in charge afterwards: remove the crest or swap the logo badge out on
// purpose and it stays that way, because the upgrade never runs again.
//
// What it touches, and nothing else:
//   - the bottom banner's crest, when the banner has none;
//   - a badge that is one of the GENERIC stand-ins, which only ever meant "this
//     school has no marks yet", swapped for the school's own piece.
// Everything a parent picked (activities, photos, words, colours) is left alone.

export interface KitMarkUpgrade {
  /** The kit's bottom-banner crest, exactly as a fresh design seeds it. */
  crestLogo?: NonNullable<SectionState["text"]>["logo"];
  /** Generic stand-in piece id → the school's own tile to put there instead. */
  replace: Record<string, Pick<PlacedTile, "pieceId" | "setId">>;
}

interface Upgradable {
  slots: Record<string, PlacedTile>;
  sections: Partial<Record<SectionId, SectionState>>;
  kitMarksApplied?: boolean;
}

/** The upgraded design, or the SAME object when there is nothing to do, so a
 *  hydrate with nothing to fix does not churn renders. */
export function upgradeKitMarks<T extends Upgradable>(state: T, upgrade: KitMarkUpgrade | undefined): T {
  if (!upgrade || state.kitMarksApplied) return state;

  let slots = state.slots;
  for (const [id, tile] of Object.entries(state.slots ?? {})) {
    const to = upgrade.replace[tile?.pieceId];
    if (!to || to.pieceId === tile.pieceId) continue;
    if (slots === state.slots) slots = { ...state.slots };
    // Keep the tile's own settings (span, per-tile colour); only the art changes.
    slots[id] = { ...tile, pieceId: to.pieceId, setId: to.setId };
  }

  let sections = state.sections;
  const bottom = state.sections?.bottom;
  if (upgrade.crestLogo && bottom?.text && !bottom.text.logo) {
    sections = { ...state.sections, bottom: { ...bottom, text: { ...bottom.text, logo: upgrade.crestLogo } } };
  }

  return { ...state, slots, sections, kitMarksApplied: true };
}
