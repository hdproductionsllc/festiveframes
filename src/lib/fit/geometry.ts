import {
  BED,
  CHARACTER_MARGIN_INCHES,
  JULY_SPEC,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  PLATE,
  STICKER_ZONE_INCHES,
  type FitPart,
  type FitReadout,
  type FitSpec,
} from "@/lib/fit/spec";

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
// the point of the bench; it is not reconciled away silently. The candidate
// closes exactly (rail bottom edge == window top edge); July misses by 0.001",
// which is the 3dp rounding in its quoted numbers, not a real gap.
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

/** Rule thresholds. Each is a physical fact, not a preference:
 *  - belowPlate: the July ring's 0.469" is the most ever shown to fit a car.
 *  - sideInward: embossed characters start ~0.75" in; 0.6" leaves margin.
 *  - bottomFullWidth / topInward: full-width coverage past ~0.55" starts eating
 *    registration stickers at the bottom and the state name at the top. */
const MAX_BELOW_PLATE_INCHES = 0.5;
const MAX_SIDE_INWARD_INCHES = 0.6;
const MAX_BOTTOM_FULL_WIDTH_INCHES = 0.55;
const MAX_TOP_INWARD_INCHES = 0.55;

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
  frameTop: number;
  frameBottom: number;
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
    frameTop: topRailTop,
    frameBottom,
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
  const totalHeightInches = box.frameBottom - box.topRailTop;

  // Union of the actual parts. The side columns are always the widest thing now
  // that the runners stop at the window's edges, but taking the union keeps this
  // honest if a spec ever puts a runner outboard of its own side pieces.
  const leftExtent = Math.min(box.windowLeft, box.badgeLeftX);
  const rightExtent = Math.max(box.windowRight, box.badgeRightX + box.badgeWidth);
  const totalWidthInches = rightExtent - leftExtent;

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

  return {
    totalWidthInches,
    totalHeightInches,
    belowPlateInches,
    abovePlateInches,
    faceCoverage,
    cornerClearInches,
    fitsBedRotated,
    underPilotCeiling,
    flags,
  };
}

/**
 * The assembled frame as drawable pieces, in plate coordinates.
 *
 * There is no `rail-bottom`: the banner IS the bottom part. Bill's parts list
 * reads "bottom 11 x 2", one piece, and splitting it into a rail plus a runner
 * here would invent a seam the printed part does not have.
 *
 * Side rails and side badge columns both span the WINDOW's vertical extent,
 * because that is what "flanking the window" means. The top rail is on its own
 * dial and may therefore overlap them or leave a gap; see the header note.
 */
export function outlineParts(spec: FitSpec): FitPart[] {
  const box = frameBox(spec);
  const outerWidth = box.outerRight - box.outerLeft;

  const parts: FitPart[] = [
    {
      id: "rail-top",
      label: "Top rail",
      rect: { x: box.outerLeft, y: box.topRailTop, w: outerWidth, h: box.pitch },
    },
    {
      id: "rail-left",
      label: "Left rail",
      rect: { x: box.outerLeft, y: box.windowTop, w: box.pitch, h: box.windowHeight },
    },
    {
      id: "rail-right",
      label: "Right rail",
      rect: { x: box.windowRight, y: box.windowTop, w: box.pitch, h: box.windowHeight },
    },
    {
      id: "runner-bottom",
      label: "Bottom banner",
      rect: {
        x: box.outerLeft,
        y: box.bannerTop,
        w: outerWidth,
        h: spec.runnerHeightInches,
      },
    },
    {
      id: "badges-left",
      label: "Left badge column",
      rect: { x: box.badgeLeftX, y: box.windowTop, w: box.badgeWidth, h: box.windowHeight },
    },
    {
      id: "badges-right",
      label: "Right badge column",
      rect: { x: box.badgeRightX, y: box.windowTop, w: box.badgeWidth, h: box.windowHeight },
    },
  ];

  if (spec.keystone) {
    // A plain 4-point trapezoid standing on the banner's top edge, centred on the
    // plate. The spec's cornerRadiusInches is IGNORED here on purpose: the bench
    // is a fitment tool and 0.25" of corner radius changes no number it reports.
    // `bottom-tab.ts` owns the sampled, rounded outline that actually prints.
    const { riseInches, baseInches, topInches } = spec.keystone;
    const cx = PLATE.widthInches / 2;
    const apexY = box.bannerTop - riseInches;
    parts.push({
      id: "keystone",
      label: "Keystone",
      polygon: [
        { x: cx - baseInches / 2, y: box.bannerTop },
        { x: cx + baseInches / 2, y: box.bannerTop },
        { x: cx + topInches / 2, y: apexY },
        { x: cx - topInches / 2, y: apexY },
      ],
    });
  }

  return parts;
}
