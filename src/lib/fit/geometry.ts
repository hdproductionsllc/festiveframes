import {
  BED,
  CHARACTER_MARGIN_INCHES,
  JULY_SPEC,
  MAX_BELOW_PLATE_INCHES,
  MAX_BOTTOM_FULL_WIDTH_INCHES,
  MAX_SIDE_INWARD_INCHES,
  MAX_TOP_INWARD_INCHES,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  PLATE,
  STICKER_ZONE_INCHES,
  type FitPart,
  type FitBox,
  type FitReadout,
  type FitSpec,
} from "@/lib/fit/spec";
import { tabPath } from "@/lib/utils/bottom-tab";

export type { FitBox } from "@/lib/fit/spec";

// ─── The fitment bench's geometry engine ────────────────────────────────────
//
// Pure arithmetic: a FitSpec in, a readout and a set of drawable parts out. No
// canvas, no DOM, no React — the bench UI and the 1:1 print sheet are two
// renderers over THIS, for the same reason `tile-theme` and `bottom-tab` exist.
// Two renderers deriving their own geometry is how the gold-flooded banners
// happened.
//
// Everything is inches with the origin at the PLATE's top-left corner, x right,
// y DOWN. The plate is (0,0)..(12,6).
//
// WHY THE MODEL STACKS FROM THE BOTTOM: the bottom edge is the binding car-fit
// constraint (owner-confirmed). Material below the plate's bottom edge is what
// failed the Pilot, so the one number that is pinned first is the frame's bottom
// edge at y = 6 + bottomDrop, and every other row is measured UP from there. A
// taller banner therefore buys its height inward over the plate face rather than
// downward — which is exactly the trade the bench exists to price.
//
// The top rail is the one part NOT in that stack. It is placed by its own dial
// (topInward), because how far the frame comes down over the state name is an
// independent question from how the bottom is packed. When the two do not close
// the parts overlap or gap on screen and the readout shows the numbers. That is
// the point of the bench; it is not reconciled away silently. Every preset now
// closes exactly (rail bottom edge == window top edge) — July used to miss by
// 0.001", and that was written off here as harmless 3dp rounding rather than
// chased. It was not harmless: it made the one verified build measure 12.882 x
// 6.938 against a real 13 x 7 ring of 12.883 x 6.937. `every preset closes on
// its own grid` in the tests now enforces what this paragraph used to excuse.
//
// PART BREAKDOWN follows the fabricator's actual parts, not an idealised ring:
// the runners are the WINDOW's width and run BETWEEN the side columns (his
// "11 long"), and each side column is one full-height piece spanning the whole
// frame (his "8 x 2") that already contains the rail column. So there is no
// separate rail-left / rail-right — emitting them would invent seams the printed
// parts do not have, and would double-count material at the four corners.

/** Float slop guard. Specs land exactly ON thresholds by design (the candidate's
 *  0.5" drop IS the July line), and a spec that sits on the line must not trip
 *  the flag that watches it. */
const EPS = 1e-9;

/**
 * Snap a readout number off the float grid.
 *
 * Every number here is a sum or difference of inch values a human typed, so the
 * arithmetic leaves dust in the sixteenth decimal place: the July ring's below-
 * plate came out 0.4684999999999997 while its above-plate — the same distance,
 * by construction — came out exactly 0.4685. At three decimals the readout then
 * showed 0.468 against 0.469 for one physical measurement, which on a bench
 * whose entire claim is dimensional truth reads as a bug in the frame rather
 * than in the printf. Snapping to a millionth of an inch is far below anything
 * that can be printed, measured, or meant.
 */
function snap(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** A part's bounding box, rect or polygon. The one place either shape is turned
 *  into a box, so the bench, the print sheet and the readout all measure the
 *  same thing. */
export function partBox(part: FitPart): FitBox {
  if (part.rect) return { ...part.rect };
  const pts = part.polygon;
  if (!pts || pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** The smallest box containing them all, optionally around a seed box (the plate,
 *  a centreline, a page origin). Empty and seedless gives a zero box. */
export function unionBoxes(boxes: FitBox[], seed?: FitBox): FitBox {
  const all = seed ? [seed, ...boxes] : boxes;
  if (all.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const x = Math.min(...all.map((b) => b.x));
  const y = Math.min(...all.map((b) => b.y));
  const right = Math.max(...all.map((b) => b.x + b.w));
  const bottom = Math.max(...all.map((b) => b.y + b.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** Every derived edge, once, so computeFit and outlineParts cannot disagree
 *  about where a part is. */
interface FrameBox {
  pitch: number;
  windowWidth: number;
  windowHeight: number;
  windowLeft: number;
  windowRight: number;
  windowTop: number;
  windowBottom: number;
  frameBottom: number;
  frameHeight: number;
  bannerTop: number;
  topRailTop: number;
  topRailBottom: number;
  badgeWidth: number;
  badgeLeftX: number;
  badgeRightX: number;
}

function frameBox(spec: FitSpec): FrameBox {
  const pitch = spec.pitchInches;
  const windowWidth = spec.windowCols * pitch;
  const windowHeight = spec.windowRows * pitch;

  // The window is centred on the plate, so its edges straddle nothing on their
  // own — but the side columns registered against them do sit half outboard.
  const windowLeft = (PLATE.widthInches - windowWidth) / 2;
  const windowRight = windowLeft + windowWidth;

  // Pinned first, then stack up: banner, window, and the top rail on its own dial.
  const frameBottom = PLATE.heightInches + spec.bottomDropInches;
  const bannerTop = frameBottom - spec.runnerHeightInches;
  const windowBottom = bannerTop;
  const windowTop = windowBottom - windowHeight;

  const topRailBottom = spec.topInwardInches;
  const topRailTop = topRailBottom - pitch;

  // Snap-in side columns register on a stud at the centre of a rail cell, but an
  // oversize piece splits its overhang inward/outward and the split is a per-edge
  // choice (see spec.ts). sideInward IS that choice: it fixes the piece's inboard
  // edge over the plate face and lets the remainder hang outboard.
  const badgeWidth = spec.sideBadgeCells * pitch;
  const badgeLeftX = spec.sideInwardInches - badgeWidth;
  const badgeRightX = PLATE.widthInches - spec.sideInwardInches;

  return {
    pitch,
    windowWidth,
    windowHeight,
    windowLeft,
    windowRight,
    windowTop,
    windowBottom,
    frameBottom,
    // The side columns span the whole frame: from the top rail's top edge down to
    // the pinned bottom. Derived once here, because outlineParts sizing a column
    // and computeFit reporting a height must be the same number.
    frameHeight: frameBottom - topRailTop,
    bannerTop,
    topRailTop,
    topRailBottom,
    badgeWidth,
    badgeLeftX,
    badgeRightX,
  };
}

export function computeFit(spec: FitSpec): FitReadout {
  const box = frameBox(spec);

  const belowPlateInches = box.frameBottom - PLATE.heightInches;
  // The top rail can sit below the plate's top edge (topInward > pitch), in which
  // case nothing is above the plate at all — hence the floor at 0. totalHeight
  // stays the frame's true extent either way.
  const abovePlateInches = Math.max(0, -box.topRailTop);

  // The frame's extent IS the union of the parts that get drawn, measured off the
  // same list the renderers draw. Deriving it separately is how a readout and a
  // picture start disagreeing about the same frame.
  const extent = unionBoxes(outlineParts(spec).map(partBox));
  const totalWidthInches = extent.w;
  const totalHeightInches = extent.h;

  // Face coverage per edge. The side number is the worse of the two things that
  // reach in from that side: the rail cell itself (windowLeft, because the window
  // is centred) and the snap-in column on top of it.
  const sideCoverage = Math.max(box.windowLeft, spec.sideInwardInches);
  const bottomFullWidth = Math.max(0, PLATE.heightInches - box.bannerTop);
  const keystoneRise = spec.keystone ? spec.keystone.riseInches : 0;
  const bottomCenter = bottomFullWidth + keystoneRise;

  const faceCoverage = {
    left: sideCoverage,
    right: sideCoverage,
    top: Math.max(0, spec.topInwardInches),
    bottomFullWidth,
    bottomCenter,
  };

  // CORNER CLEARANCE, exact definition: the registration sticker wants a
  // STICKER_ZONE_INCHES square clear at each plate corner. Every part that
  // reaches into a corner square does so as a straight edge parallel to one of
  // the plate's edges, so the clear margin left at a corner is the sticker zone
  // minus the deepest such reach. We report the WORST corner, i.e. the sticker
  // zone minus the largest edge coverage anywhere, floored at 0.
  //
  // The keystone is excluded unless it is wide enough to actually touch a corner
  // square: it stands centred on the plate, so its nearest edge is (12 - base)/2
  // from the plate's side edge. At the candidate's 6" base that is 3", well clear
  // of the 1.75" zone, and the corner sees only the full-width banner. A base
  // over 8.5" would reach in, and then the corner sees bottomCenter instead.
  const keystoneReachesCorners =
    spec.keystone !== null &&
    (PLATE.widthInches - spec.keystone.baseInches) / 2 < STICKER_ZONE_INCHES - EPS;
  const bottomAtCorner = keystoneReachesCorners ? bottomCenter : bottomFullWidth;
  const worstCornerReach = Math.max(bottomAtCorner, faceCoverage.left, faceCoverage.right, faceCoverage.top);
  const cornerClearInches = Math.max(0, STICKER_ZONE_INCHES - worstCornerReach);

  // "Rotated" because a plate frame is always wider than it is tall: the only
  // orientation that has ever mattered is the long axis on the bed's long axis.
  const fitsBedRotated =
    totalWidthInches <= BED.longInches + EPS && totalHeightInches <= BED.shortInches + EPS;
  const underPilotCeiling = totalHeightInches <= PILOT_HEIGHT_CEILING_INCHES + EPS;

  // User-facing copy: each flag names the rule AND the number that broke it, so a
  // screenshot of the readout is a complete argument. No em dashes; the numbers
  // that appear as literals are interpolated from the constants that define them
  // so the copy cannot drift from the rule.
  const flags: string[] = [];
  const n = (v: number) => v.toFixed(2);

  if (belowPlateInches > MAX_BELOW_PLATE_INCHES + EPS) {
    flags.push(
      `Bottom edge hangs ${n(belowPlateInches)} in below the plate. The July build's ` +
        `${n(JULY_SPEC.bottomDropInches)} in is the most ever shown to fit a car.`,
    );
  }
  if (totalHeightInches > PILOT_HEIGHT_CEILING_INCHES + EPS) {
    flags.push(
      `Total height ${n(totalHeightInches)} in exceeds the ${PILOT_HEIGHT_CEILING_INCHES} in Pilot ceiling.`,
    );
  }
  if (faceCoverage.left > MAX_SIDE_INWARD_INCHES + EPS) {
    flags.push(
      `Side pieces reach ${n(faceCoverage.left)} in over the plate face. Embossed characters ` +
        `start about ${n(CHARACTER_MARGIN_INCHES)} in from the edge.`,
    );
  }
  if (bottomFullWidth > MAX_BOTTOM_FULL_WIDTH_INCHES + EPS) {
    flags.push(
      `The full width banner covers ${n(bottomFullWidth)} in of plate face. Corner registration ` +
        `stickers are at risk.`,
    );
  }
  if (spec.keystone !== null && bottomCenter > MO_DATE_LINE_INCHES + EPS) {
    flags.push(
      `The keystone reaches ${n(bottomCenter)} in up the plate. Missouri prints its date line ` +
        `at about ${n(MO_DATE_LINE_INCHES)} in.`,
    );
  }
  if (faceCoverage.top > MAX_TOP_INWARD_INCHES + EPS) {
    flags.push(
      `Top rail covers ${n(faceCoverage.top)} in of the plate. Some states prohibit covering ` +
        `the state name.`,
    );
  }
  if (!fitsBedRotated) {
    flags.push(
      `Does not fit the ${BED.longInches} x ${BED.shortInches} in printer bed in any rotation.`,
    );
  }

  // Snapped on the way OUT only: the flags above compare raw values against
  // their thresholds with EPS, so rounding cannot flip a rule verdict.
  return {
    totalWidthInches: snap(totalWidthInches),
    totalHeightInches: snap(totalHeightInches),
    windowWidthInches: snap(box.windowWidth),
    windowHeightInches: snap(box.windowHeight),
    belowPlateInches: snap(belowPlateInches),
    abovePlateInches: snap(abovePlateInches),
    faceCoverage: {
      left: snap(faceCoverage.left),
      right: snap(faceCoverage.right),
      top: snap(faceCoverage.top),
      bottomFullWidth: snap(faceCoverage.bottomFullWidth),
      bottomCenter: snap(faceCoverage.bottomCenter),
    },
    cornerClearInches: snap(cornerClearInches),
    fitsBedRotated,
    underPilotCeiling,
    flags,
  };
}

/**
 * The assembled frame as drawable pieces, in plate coordinates. FOUR parts plus
 * an optional keystone, matching what actually gets printed:
 *
 *  · Two runners, the WINDOW's width, top and bottom. The fabricator's are "11
 *    long" at a 1" pitch on an 11-cell window; they butt against the side
 *    columns rather than running over them.
 *  · Two full-height side columns, one per side, each spanning the frame's whole
 *    height. His is "8 x 2": the 2" is the badge column, and its height is the
 *    frame, not the window.
 *
 * There is no `rail-bottom` (the banner IS the bottom part, one piece) and no
 * `rail-left` / `rail-right` (the side column already contains the rail cell).
 */
export function outlineParts(spec: FitSpec): FitPart[] {
  const box = frameBox(spec);

  const parts: FitPart[] = [
    {
      id: "rail-top",
      label: "Top runner",
      rect: { x: box.windowLeft, y: box.topRailTop, w: box.windowWidth, h: box.pitch },
    },
    {
      id: "runner-bottom",
      label: "Bottom banner",
      rect: {
        x: box.windowLeft,
        y: box.bannerTop,
        w: box.windowWidth,
        h: spec.runnerHeightInches,
      },
    },
    {
      id: "badges-left",
      label: "Left badge column",
      rect: { x: box.badgeLeftX, y: box.topRailTop, w: box.badgeWidth, h: box.frameHeight },
    },
    {
      id: "badges-right",
      label: "Right badge column",
      rect: { x: box.badgeRightX, y: box.topRailTop, w: box.badgeWidth, h: box.frameHeight },
    },
  ];

  if (spec.keystone) {
    // THE REAL OUTLINE, from the module that draws the shipping part: `tabPath`
    // at one unit per inch hands back inches, so the bench's template carries the
    // same rounded top corners the physical keystone has instead of a hand-built
    // trapezoid that would print a different silhouette. `rim` runs base corner
    // to base corner, so it already is the closed polygon — the base itself is
    // the implicit closing edge, and it is never a drawn line.
    const path = tabPath(spec.keystone, PLATE.widthInches / 2, box.bannerTop, 1, 0);
    parts.push({
      id: "keystone",
      label: "Keystone",
      polygon: path.rim.map((pt) => ({ x: pt.x, y: pt.y })),
    });
  }

  return parts;
}
