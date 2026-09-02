// ─── Screw slots in the top bar ──────────────────────────────────────────────
//
// A US plate's bolt holes are federally fixed: 7" apart, 0.625" down from the top
// edge (and up from the bottom). A top bar that is flush with the plate's top edge
// and 0.75" tall sits right over them, so the bar needs a slot at each hole or the
// frame cannot be screwed on. Every dealer frame solves it the same way — two slots
// 2.5" in from each side — and so does this one.
//
// One geometry, two renderers: the print composer punches these OUT of the banner
// (no ink where a hole will be, so the operator sees where it goes) and the canvas
// draws them as recesses. Same discipline as bottom-tab.ts, for the same reason.
// Imports only types and the row helper, so it stays a leaf.

import type { FrameConfig } from "@/lib/types";
import { plateTopCoverInches, plateTopInches, topBarHeightInches } from "@/lib/utils/rows";

/** Centre-to-centre distance between a plate's two top bolt holes, inches. */
export const PLATE_BOLT_SPACING_INCHES = 7;
/** Bolt-hole centre, in from the plate's top (or bottom) edge, inches. */
export const PLATE_BOLT_INSET_INCHES = 0.625;
/** A plate's bolt hole is about 5/16" to 3/8"; the rim starts ~0.46" from the edge. */
export const PLATE_BOLT_HOLE_INCHES = 0.34;
/** The slot: hole-width, and tall enough to take up a little mounting variance. */
export const SCREW_SLOT_WIDTH_INCHES = 0.34;
export const SCREW_SLOT_HEIGHT_INCHES = 0.5;
/** Material the slot must leave above and below itself in the bar. */
const SLOT_MARGIN_INCHES = 0.1;

/** A slot, in inches, x from the INNER frame's left edge (wings excluded), y from
 *  the frame's top edge. Axis-aligned; the ends are semicircles when drawn. */
export interface ScrewSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The top bar's screw slots, or none when the bar does not reach the bolt holes.
 *
 * A bar that stops short of the hole rim (the July ring covers 0.52", the rim
 * starts at 0.455") needs no slot: the screw goes through the plate below the bar,
 * as it always has. Only a bar that covers the hole gets one.
 */
export function topBarScrewSlots(config: FrameConfig): ScrewSlot[] {
  const cover = plateTopCoverInches(config);
  const rimTop = PLATE_BOLT_INSET_INCHES - PLATE_BOLT_HOLE_INCHES / 2;
  if (cover < rimTop) return [];

  const barH = topBarHeightInches(config);
  const height = Math.max(
    PLATE_BOLT_HOLE_INCHES,
    Math.min(SCREW_SLOT_HEIGHT_INCHES, barH - 2 * SLOT_MARGIN_INCHES),
  );
  // Centred on the hole when the bar has room for that; otherwise centred in the
  // bar, which still overlaps the hole because the bar covers it.
  const holeY = plateTopInches(config) + PLATE_BOLT_INSET_INCHES;
  const y = Math.min(Math.max(holeY - height / 2, SLOT_MARGIN_INCHES), barH - SLOT_MARGIN_INCHES - height);

  const plateLeft = (config.widthInches - config.plateWidthInches) / 2;
  const centreX = plateLeft + config.plateWidthInches / 2;
  const half = PLATE_BOLT_SPACING_INCHES / 2;
  return [centreX - half, centreX + half].map((cx) => ({
    x: cx - SCREW_SLOT_WIDTH_INCHES / 2,
    y,
    width: SCREW_SLOT_WIDTH_INCHES,
    height,
  }));
}
