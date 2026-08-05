import { DEFAULT_FRAME_CONFIG } from "@/lib/constants/frame";
import { PLATE, type FitSpec, type KeystoneSpec } from "@/lib/fit/spec";
import type { FrameConfig } from "@/lib/types";

// ─── FitSpec <-> FrameConfig ────────────────────────────────────────────────
//
// The bench dials a FitSpec; the product ships a FrameConfig. Until this file
// existed, the crossing was a person reading numbers off the bench and typing
// them into constants/frame.ts — the exact motion CLAUDE.md names as the cause
// of the eufyMake stretch, sitting directly on the flip path the bench exists to
// serve. The July preset being a thousandth wrong in both dimensions was the
// same failure caught early.
//
// Nearly every FitSpec field is already IN the config, just spelled differently:
//
//   pitchInches         tileSizeInches
//   windowCols          topSlots - 2        (the two wing columns)
//   windowRows          leftSlots
//   sideBadgeCells      wingColumns + 1     (wing plus the rail column it sits on)
//   runnerHeightInches  (bottomRows ?? 1) * tileSizeInches
//   keystone            bottomTab
//
// EXACTLY ONE THING IS GENUINELY NEW, and naming it is most of the value here:
// how the frame's overlap of the plate divides between top and bottom. A
// FrameConfig cannot say — it describes a ring of cells, which implies the plate
// is centred in it. The bench must say, because that split IS the binding
// car-fit constraint: the same frame, hung a quarter inch lower, fails a Pilot.
// That is `PlateRegistration`.

/** Where the frame sits ON the plate. The one thing a FrameConfig cannot state.
 *  Each is measured from the plate's own edge, in inches. */
export interface PlateRegistration {
  /** How far the frame's bottom edge hangs below the plate's bottom edge. */
  bottomDropInches: number;
  /** How far the top rail reaches down over the plate face. */
  topInwardInches: number;
  /** How far the side pieces reach in over the plate face. */
  sideInwardInches: number;
}

/** Off the float grid, to a millionth of an inch — far below anything that can
 *  be printed or measured. Derived overlaps are differences of typed inches, so
 *  they land at 0.5495000000000001 and then fail to equal the same number
 *  written down. Same reason the readout snaps; see geometry.ts. */
const snap = (n: number): number => Math.round(n * 1e6) / 1e6;

/**
 * The registration a config IMPLIES if the plate is centred in its window — the
 * symmetric reading, which is the only one a FrameConfig can express on its own.
 * Useful as the starting point for a preset: state the config, then override
 * only the numbers that are deliberately asymmetric.
 */
export function centredRegistration(config: FrameConfig): PlateRegistration {
  const pitch = config.tileSizeInches;
  const windowW = (config.topSlots - 2) * pitch;
  const windowH = config.leftSlots * pitch;
  const sideInwardInches = (config.plateWidthInches - windowW) / 2;
  const vertical = (config.plateHeightInches - windowH) / 2;
  return {
    bottomDropInches: snap((config.bottomRows ?? 1) * pitch - vertical),
    topInwardInches: snap(vertical),
    sideInwardInches: snap(sideInwardInches),
  };
}

/** A FitSpec projected from a shipping config plus its registration on the plate.
 *  The presets are built through this so their cell counts cannot drift from the
 *  configs they claim to describe. */
export function specFromConfig(
  config: FrameConfig,
  registration: PlateRegistration = centredRegistration(config),
): FitSpec {
  const pitch = config.tileSizeInches;
  return {
    pitchInches: pitch,
    windowCols: config.topSlots - 2,
    windowRows: config.leftSlots,
    runnerHeightInches: snap((config.bottomRows ?? 1) * pitch),
    sideBadgeCells: config.wingColumns + 1,
    keystone: config.bottomTab
      ? ({
          ...config.bottomTab,
          cornerRadiusInches: config.bottomTab.cornerRadiusInches ?? 0,
        } as KeystoneSpec)
      : null,
    ...registration,
  };
}

/**
 * Why a dialled geometry could not be built as a FrameConfig.
 *
 * This is the half of the bridge that earns its keep. The bench's dials are
 * continuous; the printed product is a LATTICE, and a geometry can be perfectly
 * good on paper and impossible to express as a config. Before this existed, a
 * shippable geometry and an unshippable one produced identical readouts and
 * identical paper templates, so nothing told anyone which was which until the
 * numbers were being retyped.
 */
export function shippabilityRefusals(spec: FitSpec): string[] {
  const refusals: string[] = [];
  const pitch = spec.pitchInches;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

  if (pitch <= 0) {
    refusals.push("Tile pitch must be greater than zero.");
    return refusals;
  }

  const rows = spec.runnerHeightInches / pitch;
  if (!near(rows, Math.round(rows))) {
    refusals.push(
      `Bottom runner is ${spec.runnerHeightInches.toFixed(3)} in, which is ` +
        `${rows.toFixed(2)} rows at a ${pitch.toFixed(3)} in pitch. A config can only ` +
        `have whole bottom rows.`,
    );
  }

  // On the shipping lattice a side piece is grid-registered against the window,
  // so how far it reaches over the plate face is FORCED by the cell count. The
  // bench treats it as a free dial, which is legitimate on paper and has no
  // FrameConfig spelling.
  const forcedSide = (PLATE.widthInches - spec.windowCols * pitch) / 2;
  if (!near(spec.sideInwardInches, forcedSide)) {
    refusals.push(
      `Side reach is ${spec.sideInwardInches.toFixed(3)} in, but an ` +
        `${spec.windowCols}-cell window at ${pitch.toFixed(3)} in forces ` +
        `${forcedSide.toFixed(3)} in. Change the window, not the reach.`,
    );
  }

  // The stack has to close: what the window does not expose, the parts cover.
  const bannerInward = spec.runnerHeightInches - spec.bottomDropInches;
  const covered = spec.topInwardInches + bannerInward;
  const shouldCover = PLATE.heightInches - spec.windowRows * pitch;
  if (!near(covered, shouldCover)) {
    refusals.push(
      `Top and bottom cover ${covered.toFixed(3)} in of plate face, but a ` +
        `${spec.windowRows}-row window leaves ${shouldCover.toFixed(3)} in to cover. ` +
        `The frame does not close on its own grid.`,
    );
  }

  if (spec.sideBadgeCells < 1 || !near(spec.sideBadgeCells, Math.round(spec.sideBadgeCells))) {
    refusals.push("Side badge span must be a whole number of cells, at least 1.");
  }
  if (!near(spec.windowCols, Math.round(spec.windowCols)) || !near(spec.windowRows, Math.round(spec.windowRows))) {
    refusals.push("Window must be a whole number of cells.");
  }

  return refusals;
}

/** The shipping config for a dialled geometry, or the reasons there isn't one.
 *  `base` supplies everything the bench has no opinion about (fonts, gutters,
 *  minimum tile span); only the geometry is taken from the spec. */
export function configFromSpec(
  spec: FitSpec,
  base: FrameConfig = DEFAULT_FRAME_CONFIG,
): { config: FrameConfig } | { refusals: string[] } {
  const refusals = shippabilityRefusals(spec);
  if (refusals.length > 0) return { refusals };

  const pitch = spec.pitchInches;
  const cols = spec.windowCols + 2;
  const wingColumns = spec.sideBadgeCells - 1;
  const bottomRows = Math.round(spec.runnerHeightInches / pitch);

  return {
    config: {
      ...base,
      tileSizeInches: pitch,
      widthInches: snap(cols * pitch),
      // The BASE ring only: one top row, the window, one bottom row. A config's
      // `heightInches` is the ring it is cut from, and `bottomRows > 1` grows the
      // assembled part BELOW that — which is why Bill's FULL config reads 7 while
      // his frame stands 8 inches tall.
      heightInches: snap((spec.windowRows + 2) * pitch),
      topSlots: cols,
      bottomSlots: cols,
      leftSlots: spec.windowRows,
      rightSlots: spec.windowRows,
      wings: wingColumns > 0,
      wingColumns,
      wingWidthInches: wingColumns * pitch,
      bottomRows,
      bottomTab: spec.keystone ?? undefined,
    },
  };
}
