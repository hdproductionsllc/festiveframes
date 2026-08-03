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

import { DEFAULT_FRAME_CONFIG, SCHOOL_JULY_SLIM_FRAME_CONFIG } from "@/lib/constants/frame";
import type { BottomTab } from "@/lib/types";
import type { Pt } from "@/lib/utils/bottom-tab";

/** The plate the whole bench is measured against, from the frame configs' own
 *  source of truth rather than a second copy of 12 x 6. */
export const PLATE = {
  widthInches: DEFAULT_FRAME_CONFIG.plateWidthInches,
  heightInches: DEFAULT_FRAME_CONFIG.plateHeightInches,
} as const;

/** eufyMake E1 printable bed. These numbers MIRROR EUFY_BED_LONG_INCHES /
 *  EUFY_BED_SHORT_INCHES in `compose-school-frame.ts`; a follow-up will unify
 *  them in one constants module. They are not imported from there on purpose —
 *  that module drags in qrcode and IndexedDB, which this leaf must stay free of
 *  so the engine and its tests remain pure. */
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

// ─── Rule thresholds ────────────────────────────────────────────────────────
//
// These live HERE, not in the engine, because the bench's copy quotes them too:
// a dial hint that says one number while the flag fires at another is exactly
// the drift this file exists to prevent. Each is a physical fact, not a
// preference:
//  - belowPlate: the July ring's 0.469" is the most ever shown to fit a car.
//  - sideInward: embossed characters start ~0.75" in; 0.6" leaves margin.
//  - bottomFullWidth / topInward: full-width coverage past ~0.55" starts eating
//    registration stickers at the bottom and the state name at the top.
export const MAX_BELOW_PLATE_INCHES = 0.5;
export const MAX_SIDE_INWARD_INCHES = 0.6;
export const MAX_BOTTOM_FULL_WIDTH_INCHES = 0.55;
export const MAX_TOP_INWARD_INCHES = 0.55;

/**
 * The keystone, which is the product's `BottomTab` with nothing optional.
 *
 * NOT a second declaration of the same four fields: the bench dials a corner
 * radius that always has a value, so it is `Required<BottomTab>` and feeds
 * `tabPath` directly. One shape, one renderer, no chance of the bench drawing a
 * keystone the printer would not.
 */
export type KeystoneSpec = Required<BottomTab>;

/** The keystone the staged shipping config carries, so the bench's default IS
 *  the geometry on the table rather than a hand-copied echo of it. */
export const DEFAULT_KEYSTONE: KeystoneSpec = {
  ...SCHOOL_JULY_SLIM_FRAME_CONFIG.bottomTab!,
  cornerRadiusInches: SCHOOL_JULY_SLIM_FRAME_CONFIG.bottomTab!.cornerRadiusInches ?? 0.25,
};

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

/** A named, drawable piece of the assembled frame, in plate coordinates. The id
 *  union is exactly what `outlineParts` emits — the fabricator's four parts plus
 *  the optional keystone. A consumer that switches on it is total. */
export interface FitPart {
  id: "rail-top" | "runner-bottom" | "badges-left" | "badges-right" | "keystone";
  label: string;
  /** Axis-aligned parts use rect; the keystone uses polygon. Exactly one is set. */
  rect?: { x: number; y: number; w: number; h: number };
  polygon?: Pt[];
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
 *  banner height bought inward, keystone centre-deep, corners clear.
 *
 *  The runner is 1.0", NOT the 1.5" first proposed: the engine's own arithmetic
 *  caught that a 1.5" runner on a 0.5" drop intrudes a full 1.0" over the plate
 *  face and pushes the keystone centre past Missouri's 1.08" date line. At 1.0"
 *  the stack closes exactly (0.5 drop + 1.0 runner + 5 window + 1 top rail =
 *  7.00" with the rail's bottom edge meeting the window's top), face intrusion
 *  is 0.5", and the keystone centre reaches 1.05". Extra lockup height comes
 *  from the keystone, never from a taller full-width bar. */
export const CANDIDATE_SPEC: FitSpec = {
  pitchInches: 1,
  windowCols: 11,
  windowRows: 5,
  bottomDropInches: 0.5,
  runnerHeightInches: 1,
  keystone: { ...DEFAULT_KEYSTONE },
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

/** The FitSpec fields that are plain numbers — everything except `keystone`. */
type NumberKeyOf<T> = { [K in keyof T]-?: T[K] extends number ? K : never }[keyof T];
type FitSpecNumberKey = NumberKeyOf<FitSpec>;

const NUM_KEYS: Array<[FitSpecNumberKey, string]> = [
  ["pitchInches", "p"],
  ["windowCols", "wc"],
  ["windowRows", "wr"],
  ["bottomDropInches", "bd"],
  ["runnerHeightInches", "rh"],
  ["sideBadgeCells", "sb"],
  ["sideInwardInches", "si"],
  ["topInwardInches", "ti"],
];

/**
 * The spec as a query string.
 *
 * `kr` is ALWAYS written, 0 when there is no keystone. That one byte is what
 * makes the round trip lossless: without it a keystone-less spec was
 * indistinguishable from "said nothing about the keystone", so parsing a July
 * link against a keystone-bearing base handed it back a keystone it never had,
 * and every caller had to know to pass a keystone-nulled base. The codec owns
 * that now, not its callers.
 */
export function specToQuery(spec: FitSpec): string {
  const q = new URLSearchParams();
  for (const [field, key] of NUM_KEYS) q.set(key, String(spec[field]));
  q.set("kr", String(spec.keystone ? spec.keystone.riseInches : 0));
  if (spec.keystone) {
    q.set("kb", String(spec.keystone.baseInches));
    q.set("kt", String(spec.keystone.topInches));
    q.set("kc", String(spec.keystone.cornerRadiusInches));
  }
  return q.toString();
}

export function specFromQuery(q: URLSearchParams, base: FitSpec = CANDIDATE_SPEC): FitSpec {
  const num = (key: string, fallback: number) => {
    const raw = q.get(key);
    if (raw === null || raw === "") return fallback;
    const v = Number(raw);
    return Number.isFinite(v) ? v : fallback;
  };
  const spec: FitSpec = { ...base, keystone: base.keystone ? { ...base.keystone } : null };
  for (const [field, key] of NUM_KEYS) {
    spec[field] = num(key, spec[field]);
  }

  // Absent kr means an old link that predates the always-written key: keep the
  // base's keystone, which is what those links have always meant. Present and at
  // or below zero means "no keystone", explicitly.
  const kr = q.get("kr");
  if (kr !== null && kr !== "") {
    const rise = num("kr", 0);
    const from = base.keystone ?? DEFAULT_KEYSTONE;
    spec.keystone =
      rise > 0
        ? {
            riseInches: rise,
            baseInches: num("kb", from.baseInches),
            topInches: num("kt", from.topInches),
            cornerRadiusInches: num("kc", from.cornerRadiusInches),
          }
        : null;
  }
  return spec;
}
