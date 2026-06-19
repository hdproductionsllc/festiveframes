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
