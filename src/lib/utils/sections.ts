// Section helpers for the school builder. A "section" is one of the four PANELS —
// the two side panels, the top banner, the bottom banner — that can be TILED or
// turned into ONE direct-to-print piece (text/image). A SectionId is a PANEL, NOT
// a SlotZone: the string values coincide with four zone names (a persistence
// convenience), but a panel is a grid RECTANGLE that OWNS ITS CORNERS, whereas the
// zone of the same name does not. See `panelOf`/`panelRects` in utils/panels.
//
// Absent section = tiles = the normal grid, so all of this is inert on /build,
// which never populates `sections`.

import type { FrameConfig, FrameSlot, SectionId, SectionState } from "@/lib/types";
import { panelOf } from "@/lib/utils/panels";
import { buildGrid } from "@/lib/utils/slot-generator";
import { badgeRule, squareSpansAt, type PlacementContext } from "@/lib/utils/snappet";

/** Section order for the picker (left → top → bottom → right reads naturally). */
export const SECTION_IDS: SectionId[] = ["wing-left", "top", "bottom", "wing-right"];

export const SECTION_LABELS: Record<SectionId, string> = {
  "wing-left": "Left panel",
  top: "Top bar",
  bottom: "Bottom banner",
  "wing-right": "Right panel",
};

/** Only the TOP and BOTTOM banners can become a text bar — the left/right side
 *  panels are tiles/art only (a text banner reads across the top or bottom, not down
 *  a narrow side). Used by the section UI and guarded in the store. */
export function sectionSupportsText(id: SectionId): boolean {
  return id === "top" || id === "bottom";
}

/**
 * Can this panel hold BADGES?
 *
 * Asked of the FRAME when it is given one: a panel supports tiles exactly when a
 * legal badge can anchor somewhere in it (`squareSpansAt` — the square rule and
 * the floor, enumerated). On the flush frame that is the two side columns only:
 * the 0.75" top bar is banner-only and the bottom runner is one 1" row, where the
 * only squares are 1x1s under the frame's floor. Offering tiles there would offer
 * a mode that cannot produce a badge.
 *
 * Without a frame (or on a frame with no square rule), the geometry-free answer
 * every frame before the rule shared: everything except the TOP strip, which is a
 * single row tall — a badge floors at 2x2 (MIN_ART_SPAN), so none can seat there.
 */
export function sectionSupportsTiles(id: SectionId, config?: FrameConfig): boolean {
  if (!config || config.badgeShape !== "square") return id !== "top";
  return panelHoldsBadge(id, config);
}

// One answer per (config, panel): the enumeration builds a grid, and callers ask
// on every render and every hydrate. Configs are treated as immutable values.
const badgeHolding = new WeakMap<FrameConfig, Map<SectionId, boolean>>();

function panelHoldsBadge(id: SectionId, config: FrameConfig): boolean {
  let byPanel = badgeHolding.get(config);
  if (!byPanel) badgeHolding.set(config, (byPanel = new Map()));
  const known = byPanel.get(id);
  if (known !== undefined) return known;
  const grid = buildGrid(config);
  // An empty design with every panel in tiles mode: the question is what the
  // FRAME allows, not what this design currently has on it.
  const ctx: PlacementContext = {
    grid,
    slots: {},
    sections: {},
    barCovered: new Set(),
    badges: badgeRule(config),
  };
  const holds = grid.slots.some(
    (cell) => grid.panelAt(cell.row, cell.col) === id && squareSpansAt(ctx, cell).length > 0,
  );
  byPanel.set(id, holds);
  return holds;
}

/**
 * Normalise every section to a mode that panel can actually express: out of text
 * where text is not allowed, and out of tiles where tiles cannot seat.
 *
 * Text bars were once allowed on every panel; they are a top/bottom affordance now,
 * so the Tiles/Text toggle no longer renders on the wings. A design saved before
 * that change keeps a wing in text mode and there is no control anywhere to free it
 * — the panel reads as permanently locked to text.
 *
 * An ABSENT panel means tiles. On a square-rule frame that is a claim the frame
 * can refute: a design restored or saved without a `sections` entry for the flush
 * bottom runner drew it as eleven empty 1" pockets no badge can fill. There, an
 * absent panel that cannot hold a badge is materialised as a (blank) text banner,
 * which the builder shows as "Add a phrase". Only on square-rule frames — /build
 * never populates `sections`, and its 1-row top strip holds 1x1 tiles.
 *
 * Returns the SAME object when nothing needs fixing, so callers can skip a write.
 */
export function repairSections<T extends Partial<Record<SectionId, { mode?: string }>>>(
  sections: T,
  /** The frame the sections sit on, so "can tiles seat here" is the frame's answer
   *  (see sectionSupportsTiles). Omitted = the geometry-free answer. */
  config?: FrameConfig,
): T {
  let changed = false;
  const out: Record<string, unknown> = {};
  for (const [id, sec] of Object.entries(sections)) {
    const key = id as SectionId;
    if (sec?.mode === "text" && !sectionSupportsText(key)) {
      out[id] = { mode: "tiles" };
      changed = true;
    } else if (sec?.mode === "tiles" && !sectionSupportsTiles(key, config)) {
      // No badge can seat in this panel (see sectionSupportsTiles). Keep whatever
      // text config is already there rather than discarding the user's copy.
      out[id] = { ...sec, mode: "text" };
      changed = true;
    } else {
      out[id] = sec;
    }
  }
  if (config?.badgeShape === "square") {
    for (const id of SECTION_IDS) {
      if (id in out || !sectionSupportsText(id) || sectionSupportsTiles(id, config)) continue;
      out[id] = { mode: "text" };
      changed = true;
    }
  }
  return changed ? (out as T) : sections;
}

/** Bounding box (px) of a section = the union of the rects of every slot the PANEL
 *  owns (resolved by `panelOf` on each slot's grid coord — NOT by zone, so the box
 *  covers the panel's corners too). Null when the panel has no slots. */
export function sectionBounds(
  id: SectionId,
  slots: FrameSlot[],
  config: FrameConfig,
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  let found = false;
  for (const s of slots) {
    if (panelOf(s.row, s.col, config) !== id) continue;
    found = true;
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxR) maxR = s.x + s.width;
    if (s.y + s.height > maxB) maxB = s.y + s.height;
  }
  return found ? { x: minX, y: minY, width: maxR - minX, height: maxB - minY } : null;
}

/** Whether a PANEL is in a NON-tile mode (so the tiles it owns are hidden). Null
 *  panel (plate / off-grid) is never suppressed. This is the primitive both the
 *  canvas and the placement gate resolve suppression through. */
export function panelSuppressed(
  panel: SectionId | null,
  sections: Partial<Record<SectionId, SectionState>>,
): boolean {
  if (panel == null) return false;
  const sec = sections[panel];
  return sec != null && sec.mode !== "tiles";
}

/** Whether the PANEL owning a slot is in a non-tile mode (its tile is hidden).
 *  Resolves the slot's owning panel via `panelOf` on its grid coord — so a corner
 *  cell is suppressed by its SIDE panel, not by the top/bottom banner. */
export function slotSuppressed(
  slot: Pick<FrameSlot, "row" | "col">,
  sections: Partial<Record<SectionId, SectionState>>,
  config: FrameConfig,
): boolean {
  return panelSuppressed(panelOf(slot.row, slot.col, config), sections);
}
