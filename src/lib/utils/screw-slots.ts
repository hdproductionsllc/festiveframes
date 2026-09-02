// ─── Screw notches in the runners ────────────────────────────────────────────
//
// A US plate's bolt holes are federally fixed: 7" apart, 0.625" in from the top
// edge and from the bottom edge. A runner that reaches over the plate face by more
// than the gap between the edge and a screw HEAD (about 0.6" across, so its rim
// starts ~0.325" in) collides with the screw, and the frame cannot be mounted
// flat. Every dealer frame solves it the same way: a notch (or, on a deep bar, a
// closed slot) in the runner's plate-side edge over each hole, 2.5" in from the
// plate's sides. So does this one.
//
// One geometry, two renderers: the print composer punches these OUT of the banner
// (no ink where a cut will be, so the operator sees where it goes) and the canvas
// draws them as recesses. Same discipline as bottom-tab.ts, for the same reason.
// Imports only types and the row helper, so it stays a leaf.

import type { FrameConfig } from "@/lib/types";
import { bannerRowBox, plateTopCoverInches, plateTopInches } from "@/lib/utils/rows";

/** Centre-to-centre distance between a plate's two bolt holes, inches. */
export const PLATE_BOLT_SPACING_INCHES = 7;
/** Bolt-hole centre, in from the plate's top (or bottom) edge, inches. */
export const PLATE_BOLT_INSET_INCHES = 0.625;
/** A plate screw's head is about this wide; the notch clears it with a little air. */
export const SCREW_HEAD_INCHES = 0.6;
export const SCREW_NOTCH_WIDTH_INCHES = 0.7;
/** Air between the screw head and the notch's inner end. */
const NOTCH_CLEARANCE_INCHES = 0.1;
/** Material a notch must leave on the runner's outer side — never cut through. */
const NOTCH_MIN_WEB_INCHES = 0.15;

/** A notch, in inches: x from the INNER frame's left edge (wings excluded), y from
 *  the frame's top edge. Open on the runner's plate-side edge, rounded at the
 *  other end when drawn. */
export interface ScrewNotch {
  bar: "top" | "bottom";
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The runners' screw notches: none unless the config asks (`screwNotches`), and
 * then only in a runner that reaches past a screw head's rim.
 *
 * `cover` is how far the runner reaches over the plate face from that edge. A
 * screw head's rim starts `PLATE_BOLT_INSET - SCREW_HEAD / 2` in. Past it, the
 * notch is as deep as the overlap plus clearance, and never deeper than leaves a
 * web of material on the runner's outer side. Opt-in rather than derived for
 * every frame because the July ring mounts as built at 0.52" of cover, and how
 * Bill's runners meet the screws is his detail to state, not ours to infer.
 */
export function screwNotches(config: FrameConfig): ScrewNotch[] {
  if (!config.screwNotches) return [];
  const headRim = PLATE_BOLT_INSET_INCHES - SCREW_HEAD_INCHES / 2;
  const plateTop = plateTopInches(config);
  const plateBottom = plateTop + config.plateHeightInches;
  const plateLeft = (config.widthInches - config.plateWidthInches) / 2;
  const centreX = plateLeft + config.plateWidthInches / 2;
  const half = PLATE_BOLT_SPACING_INCHES / 2;
  const xs = [centreX - half, centreX + half];

  const out: ScrewNotch[] = [];

  const top = bannerRowBox(config, "top");
  const topCover = plateTopCoverInches(config);
  if (topCover > headRim) {
    const depth = Math.min(topCover - headRim + NOTCH_CLEARANCE_INCHES, top.h - NOTCH_MIN_WEB_INCHES);
    if (depth > 0) {
      for (const cx of xs) {
        out.push({ bar: "top", x: cx - SCREW_NOTCH_WIDTH_INCHES / 2, y: top.y + top.h - depth, width: SCREW_NOTCH_WIDTH_INCHES, height: depth });
      }
    }
  }

  const bottom = bannerRowBox(config, "bottom");
  const bottomCover = plateBottom - bottom.y;
  if (bottomCover > headRim) {
    const depth = Math.min(bottomCover - headRim + NOTCH_CLEARANCE_INCHES, bottom.h - NOTCH_MIN_WEB_INCHES);
    if (depth > 0) {
      for (const cx of xs) {
        out.push({ bar: "bottom", x: cx - SCREW_NOTCH_WIDTH_INCHES / 2, y: bottom.y, width: SCREW_NOTCH_WIDTH_INCHES, height: depth });
      }
    }
  }

  return out;
}
