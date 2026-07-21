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
