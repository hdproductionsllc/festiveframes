// ─── eufyMake E1 jig geometry ───────────────────────────────
//
// Ground truth for the physical 3D-printed tray that holds blank tiles on the
// eufyMake E1 UV printer bed. These numbers were measured directly from
// `Popsicle 9x3 Test.ai` (the jig proof): a 9.9" x 3.3" sheet with a 3-row x
// 9-col grid of pockets, each holding one square tile face-up.
//
// The print-sheet renderer lands each tile's artwork on these exact centers so
// the printed PNG registers to the physical tray. The prototype tray matches
// these values; when the tray is refined, edit ONLY this file — nothing else in
// the print pipeline hard-codes geometry.

export interface EufyJigConfig {
  /** Jig sheet size in inches (also the printable PNG size at `dpi`). */
  sheetWidthInches: number;
  sheetHeightInches: number;
  /** Output resolution. 720 matches the tile art's native ~651px square. */
  dpi: number;
  /** Printable square face per tile, inches (slightly inset from the 0.991" tile edge). */
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
  tileFaceInches: 0.946,
  // Measured from the .ai (pt ÷ 72, averaged across the three rows).
  colCentersInches: [0.5625, 1.6458, 2.7639, 3.8472, 4.9444, 6.0278, 7.1458, 8.2292, 9.3472],
  // Top-left origin: top row first, then middle, then bottom.
  rowCentersInches: [0.5556, 1.65, 2.7444],
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
