// ─── eufyMake E1 jig geometry ───────────────────────────────
//
// Ground truth for the physical 3D-printed tray that holds blank tiles on the
// eufyMake E1 UV printer bed. A 9.9" x 3.3" sheet with a 3-row x 9-col grid of
// round pockets, each holding one square tile face-up.
//
// IMPORTANT: pocket centers are derived from the ROUND POCKET outlines in
// `Popsicle 9x3 Test.ai`, not the popsicle artwork (which the designer placed
// off-center inside each pocket with a few thou of jitter). The 27 circle rings
// were detected from a 720-DPI render and least-squares fit to a perfectly even
// grid (col pitch 1.097", row pitch 1.095", max residual 0.02"). Pocket
// diameter measured 0.837". This is what makes the print register to the tray.
//
// The print-sheet renderer centers each tile's artwork on these points. The
// prototype tray matches these values; when the tray is refined, edit ONLY this
// file — nothing else in the print pipeline hard-codes geometry.

export interface EufyJigConfig {
  /** Jig sheet size in inches (also the printable PNG size at `dpi`). */
  sheetWidthInches: number;
  sheetHeightInches: number;
  /** Output resolution. 720 matches the tile art's native ~651px square. */
  dpi: number;
  /** Printable square face per tile, inches. Fills the full tile top (no inset margin). */
  tileFaceInches: number;
  /** Pocket center X positions, inches from the sheet's top-left, left → right. */
  colCentersInches: number[];
  /** Pocket center Y positions, inches from the sheet's top-left, top → bottom. */
  rowCentersInches: number[];
}

export const EUFY_JIG: EufyJigConfig = {
  sheetWidthInches: 9.9,
  sheetHeightInches: 3.3,
  dpi: 720,
  // Matches the artwork square in the .ai proof, so each tile keeps the frame-lip
  // border the jig has (~0.08" from the outer tiles to the 9.9x3.3 sheet edge).
  // The jig's outer footprint IS 9.9x3.3, so this PNG aligns corner-to-corner.
  tileFaceInches: 0.946,
  // Even-grid fit through the 27 detected pocket circles, top-left origin.
  colCentersInches: [0.5573, 1.6545, 2.7517, 3.849, 4.9462, 6.0435, 7.1407, 8.2379, 9.3352],
  // Top row first, then middle, then bottom.
  rowCentersInches: [0.5546, 1.6494, 2.7443],
};

// ─── 3×12 jig (Bill's Snappet UV Printer Organizer Tray, 2026-06-20) ─────────
//
// Bill rebuilt the tray as a 3 x 12 set to fill more of the printer bed per pass
// and tightened the snappet pockets. His specs (email 2026-06-20):
//   • pocket pitch  1.06" center-to-center (both axes)
//   • pocket face   0.992" square (the physical tile top)
//   • PRINT image   1.02" square — intentionally larger than the pocket so a little
//     overspray hides the unprinted snappet edge. 1.02" < 1.06" pitch, so the
//     renderer's per-pocket clip still keeps art out of the neighbouring pocket.
//
// The sheet equals the TRAY FOOTPRINT (pocket-face margins, like the 3x9), so it
// imports corner-to-corner and every pocket registers. A consequence: the outer
// edge of the edge tiles' 1.02" overspray runs ~0.014" past the sheet and is
// clipped at the canvas boundary — intended (don't overspray off the tray onto
// the bed; enlarging the sheet would mis-register all 36 pockets instead).
//
// The tray file (`LPF FF Snappet UV Printer Organizer Tray 062026.AI`) is a
// page-fit bitmap, not a real-scale vector, so it can't be measured for true
// inches like the 3x9 was — BUT analysing it confirmed the grid is a perfectly
// even, square, centered 3 x 12 (fit residual 0.03 px). That settles Bill's
// inconsistent arithmetic: it's a clean centered grid, so the geometry is fully
// determined by the single 1.06" pitch he measured. When a real-scale vector/CAD
// of the tray arrives, re-measure and replace the numbers below — one edit.

/**
 * Build a jig config for a clean, evenly-spaced, centered pocket grid. Pocket
 * centers sit on `pitchInches`; the sheet extends half a `pocketFaceInches`
 * beyond the outer centers (the frame-lip border the tray has).
 */
export function makeGridJig(opts: {
  rows: number;
  cols: number;
  /** Center-to-center spacing, inches (both axes). */
  pitchInches: number;
  /** Printed image square per tile, inches (cover-fit + clipped). */
  faceInches: number;
  /** Physical pocket face, inches — sets the edge margin (half a pocket). */
  pocketFaceInches: number;
  dpi?: number;
}): EufyJigConfig {
  const { rows, cols, pitchInches, faceInches, pocketFaceInches, dpi = 720 } = opts;
  const margin = pocketFaceInches / 2;
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  const colCentersInches = Array.from({ length: cols }, (_, i) => round(margin + i * pitchInches));
  const rowCentersInches = Array.from({ length: rows }, (_, j) => round(margin + j * pitchInches));
  return {
    sheetWidthInches: round(2 * margin + (cols - 1) * pitchInches),
    sheetHeightInches: round(2 * margin + (rows - 1) * pitchInches),
    dpi,
    tileFaceInches: faceInches,
    colCentersInches,
    rowCentersInches,
  };
}

/** Bill's 3×12 tray: 36 pockets, 1.06" pitch, 1.02" print face → 12.652" × 3.112". */
export const EUFY_JIG_3X12: EufyJigConfig = makeGridJig({
  rows: 3,
  cols: 12,
  pitchInches: 1.06,
  faceInches: 1.02,
  pocketFaceInches: 0.992,
  dpi: 720,
});

/** Total tile pockets on one jig sheet (reading order: row-major, top row first). */
export function jigPocketCount(jig: EufyJigConfig = EUFY_JIG): number {
  return jig.colCentersInches.length * jig.rowCentersInches.length;
}

/** Pocket centers in reading order, as inches from the sheet's top-left. */
export function jigPocketCenters(jig: EufyJigConfig = EUFY_JIG): Array<{ xIn: number; yIn: number }> {
  const centers: Array<{ xIn: number; yIn: number }> = [];
  for (const yIn of jig.rowCentersInches) {
    for (const xIn of jig.colCentersInches) {
      centers.push({ xIn, yIn });
    }
  }
  return centers;
}
