// Section helpers for the school builder. A "section" is a frame zone that can be
// tiled or turned into one direct-to-print piece (text/image). SectionId maps 1:1
// to a SlotZone (`bottom` covers all bottom rows). Absent section = tiles = the
// normal grid, so this is inert on /build (which never populates `sections`).

import type { FrameSlot, SectionId, SectionState } from "@/lib/types";

/** Section order for the picker (left → top → bottom → right reads naturally). */
export const SECTION_IDS: SectionId[] = ["wing-left", "top", "bottom", "wing-right"];

export const SECTION_LABELS: Record<SectionId, string> = {
  "wing-left": "Left panel",
  top: "Top bar",
  bottom: "Bottom banner",
  "wing-right": "Right panel",
};

/** Bounding box (px) of a section = the union of its zone's slot rects. Null when
 *  the zone has no slots (e.g. wings off). Exact for the full-width top + 2-row
 *  bottom because it's derived from the SAME slots the tiles render at. */
export function sectionBounds(
  id: SectionId,
  slots: FrameSlot[],
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  let found = false;
  for (const s of slots) {
    if (s.zone !== id) continue;
    found = true;
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxR) maxR = s.x + s.width;
    if (s.y + s.height > maxB) maxB = s.y + s.height;
  }
  return found ? { x: minX, y: minY, width: maxR - minX, height: maxB - minY } : null;
}

/** Whether a slot's zone is a section in a NON-tile mode (so its tile is hidden). */
export function slotSuppressed(
  zone: string,
  sections: Partial<Record<SectionId, SectionState>>,
): boolean {
  const sec = sections[zone as SectionId];
  return sec != null && sec.mode !== "tiles";
}
