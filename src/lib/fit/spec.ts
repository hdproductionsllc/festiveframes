// ─── The geometry bench's shared contract ────────────────────────────────────
//
// /lab/fit is the tool for CONVERGING the physical frame geometry with Bill:
// every free variable the two sides have been trading by text is a dial here,
// every consequence is a live readout, and the whole state lives in the URL so
// a configuration can be texted as a link.
//
// This file is the boundary three parallel workstreams build against:
//   src/lib/fit/geometry.ts        computeFit / outlineParts (pure, tested)
//   src/app/lab/fit/page.tsx       the interactive bench UI
//   src/app/lab/fit/print/page.tsx the 1:1 paper calibration sheet
//
// Coordinate convention for outlines: INCHES, origin at the PLATE's top-left
// corner, x rightward, y DOWNWARD (the same handedness as every canvas and CSS
// surface in this codebase). The plate occupies (0,0)..(12,6).
//
// GROUND TRUTH this encodes (see CLAUDE.md "Geometry GROUND TRUTH"):
//  · Only the July 4 build ever completed design -> physical part. Its ring put
//    ~0.47" below the plate's bottom edge, and that is the most that has ever
//    been shown to fit a car.
//  · The BOTTOM edge is the binding car-fit constraint (owner-confirmed). The
//    bottom banner buys height INWARD over the plate face, never downward.
//  · Snap-ins register by a stud at the CENTER of a rail cell; oversize pieces
//    split their overhang inward/outward, and the split is a per-edge choice.

export const PLATE = { widthInches: 12, heightInches: 6 } as const;
export const BED = { longInches: 16.5, shortInches: 13 } as const;
/** US quarter diameter — the field fit test. */
export const QUARTER_INCHES = 0.955;
/** Embossed plate characters typically begin about this far in from the plate's
 *  side edges; side intrusion past it starts covering registration text. */
export const CHARACTER_MARGIN_INCHES = 0.75;
/** Registration stickers live in the plate's corners; keep a square roughly this
 *  size clear at each corner. */
export const STICKER_ZONE_INCHES = 1.75;
/** Missouri's bicentennial plate prints its date line about this far up from the
 *  plate's bottom edge — the deepest the keystone may reach on an MO plate. */
export const MO_DATE_LINE_INCHES = 1.08;
/** The Honda Pilot ceiling: total frame height at or under this has a chance;
 *  Bill's 8.0" and ~7.5" builds both failed, 7" (July) is believed good. */
export const PILOT_HEIGHT_CEILING_INCHES = 7;

export interface KeystoneSpec {
  riseInches: number;
  baseInches: number;
  topInches: number;
  cornerRadiusInches: number;
}

/** One candidate physical geometry. Everything the bench can dial. */
export interface FitSpec {
  /** Tile pitch. Bill's parts read as 1.000; July files were 0.991; 0.875 is the
   *  four-badges-in-seven-inches option. */
  pitchInches: number;
  /** Plate window, in cells. */
  windowCols: number;
  windowRows: number;
  /** How far the frame's bottom edge hangs BELOW the plate's bottom edge.
   *  0 = flush. July was ~0.47. The Pilot punishes this number. */
  bottomDropInches: number;
  /** Total height of the bottom banner part. Anything beyond
   *  (bottomDropInches + one rail row's share) intrudes over the plate face. */
  runnerHeightInches: number;
  keystone: KeystoneSpec | null;
  /** Side snap-in span in cells (2 = a 2x2 badge column). */
  sideBadgeCells: number;
  /** How far side pieces reach in over the plate face, from the plate's side edge. */
  sideInwardInches: number;
  /** How far the top rail reaches down over the plate face. */
  topInwardInches: number;
}

/** A named, drawable piece of the assembled frame, in plate coordinates. */
export interface FitPart {
  id:
    | "rail-top"
    | "rail-bottom"
    | "rail-left"
    | "rail-right"
    | "runner-bottom"
    | "badges-left"
    | "badges-right"
    | "keystone";
  label: string;
  /** Axis-aligned parts use rect; the keystone uses polygon. Exactly one is set. */
  rect?: { x: number; y: number; w: number; h: number };
  polygon?: Array<{ x: number; y: number }>;
}

/** Everything the readout panel shows. All inches unless named otherwise. */
export interface FitReadout {
  totalWidthInches: number;
  totalHeightInches: number;
  belowPlateInches: number;
  abovePlateInches: number;
  /** Plate-face coverage, per edge. bottomCenter includes the keystone. */
  faceCoverage: {
    left: number;
    right: number;
    top: number;
    bottomFullWidth: number;
    bottomCenter: number;
  };
  /** Smallest clear margin left at any plate corner (sticker zones). */
  cornerClearInches: number;
  fitsBedRotated: boolean;
  underPilotCeiling: boolean;
  /** Human-readable rule violations, empty when the spec is clean. Each one names
   *  the rule and the number that broke it. No em dashes (user-facing copy). */
  flags: string[];
}

/** The verified July 4 ring, as built (0.991 pitch files). */
export const JULY_SPEC: FitSpec = {
  pitchInches: 0.991,
  windowCols: 11,
  windowRows: 5,
  bottomDropInches: 0.469,
  runnerHeightInches: 0.991,
  keystone: null,
  sideBadgeCells: 1,
  sideInwardInches: 0.55,
  topInwardInches: 0.522,
};

/** Bill's current parts per his 2026-08-02 text: 1" grid, 11x2 bottom runner. */
export const BILL_CURRENT_SPEC: FitSpec = {
  pitchInches: 1,
  windowCols: 11,
  windowRows: 5,
  bottomDropInches: 1.5,
  runnerHeightInches: 2,
  keystone: null,
  sideBadgeCells: 2,
  sideInwardInches: 0.5,
  topInwardInches: 0.5,
};

/** The recommendation on the table: 7" total, bottom edge AT the July line,
 *  banner height bought inward, keystone centre-deep, corners clear. */
export const CANDIDATE_SPEC: FitSpec = {
  pitchInches: 1,
  windowCols: 11,
  windowRows: 5,
  bottomDropInches: 0.5,
  runnerHeightInches: 1.5,
  keystone: { riseInches: 0.55, baseInches: 6, topInches: 5, cornerRadiusInches: 0.25 },
  sideBadgeCells: 2,
  sideInwardInches: 0.5,
  topInwardInches: 0.5,
};

export const PRESETS: Array<{ key: string; label: string; spec: FitSpec }> = [
  { key: "july", label: "July 4 (verified)", spec: JULY_SPEC },
  { key: "bill", label: "Bill today", spec: BILL_CURRENT_SPEC },
  { key: "candidate", label: "Candidate", spec: CANDIDATE_SPEC },
];

// URL round-trip, so a dialled-in configuration is a textable link. Short keys on
// purpose; the URL is the interchange format between Henry's phone and Bill's.
const NUM_KEYS: Array<[keyof FitSpec & string, string]> = [
  ["pitchInches", "p"],
  ["windowCols", "wc"],
  ["windowRows", "wr"],
  ["bottomDropInches", "bd"],
  ["runnerHeightInches", "rh"],
  ["sideBadgeCells", "sb"],
  ["sideInwardInches", "si"],
  ["topInwardInches", "ti"],
];

export function specToQuery(spec: FitSpec): string {
  const q = new URLSearchParams();
  for (const [field, key] of NUM_KEYS) q.set(key, String(spec[field]));
  if (spec.keystone) {
    q.set("kr", String(spec.keystone.riseInches));
    q.set("kb", String(spec.keystone.baseInches));
    q.set("kt", String(spec.keystone.topInches));
    q.set("kc", String(spec.keystone.cornerRadiusInches));
  }
  return q.toString();
}

export function specFromQuery(q: URLSearchParams, base: FitSpec = CANDIDATE_SPEC): FitSpec {
  const num = (key: string, fallback: number) => {
    const v = Number(q.get(key));
    return Number.isFinite(v) && q.get(key) !== null && q.get(key) !== "" ? v : fallback;
  };
  const spec: FitSpec = { ...base, keystone: base.keystone ? { ...base.keystone } : null };
  for (const [field, key] of NUM_KEYS) {
    (spec as unknown as Record<string, number>)[field] = num(key, spec[field] as number);
  }
  const kr = q.get("kr");
  if (kr !== null) {
    spec.keystone = {
      riseInches: num("kr", 0.55),
      baseInches: num("kb", 6),
      topInches: num("kt", 5),
      cornerRadiusInches: num("kc", 0.25),
    };
    if (spec.keystone.riseInches <= 0) spec.keystone = null;
  }
  return spec;
}
