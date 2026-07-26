import type { TileSpan } from "@/lib/types";

// ─── Artwork quality control ────────────────────────────────────────────────
//
// Art arrives from three places — a school's own website, an image search, or a
// manual upload — and none of them owe us a printable file. This module decides
// whether a candidate can go on a badge, repairs what is mechanically repairable,
// and warns about what is not.
//
// Everything here is PURE: it takes raw RGBA and returns a report or new RGBA. No
// decoding, no network, no canvas. That is what lets the whole thing be tested
// against constructed pixel data rather than against a fixture nobody can read.
//
// The checks are not hypothetical. Every one corresponds to a defect measured in
// the art already in this repo:
//   - a white matte fringe whose edge pixels ramp to (235,235,234) while the art
//     itself is (130,130,129) — invisible on white, a halo on navy
//   - 8-bit palette encoding, which dithers flat regions into speckle
//   - an opaque background that can never take a field colour

/** How much art a footprint needs, in real inches at real print resolution. */
export interface PrintRequirement {
  span: TileSpan;
  tileSizeInches: number;
  /** Target print resolution. 300 is the eufyMake sheet standard. */
  dpi: number;
}

export type QcCode =
  | "resolution-low"
  | "resolution-marginal"
  | "background-opaque"
  | "matte-fringe"
  | "palette-quantized"
  | "near-empty";

export type QcSeverity = "error" | "warning";

export interface QcFinding {
  code: QcCode;
  severity: QcSeverity;
  message: string;
  /** Whether `repairArtwork` can fix this one. */
  repairable: boolean;
}

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface QcReport {
  width: number;
  height: number;
  /** The pixel dimensions this footprint needs at the target dpi. */
  requiredWidth: number;
  requiredHeight: number;
  /** The dpi this art actually delivers at that footprint. */
  effectiveDpi: number;
  /** 0–1. How much of the image is fully transparent. */
  transparentFraction: number;
  /** Pixels with partial alpha — the anti-aliased edge. */
  partialAlphaPixels: number;
  /** Distinct RGB triples. <= 256 means it went through a palette. */
  distinctColours: number;
  /** Mean RGB of the faintest edge pixels, and of the solid art. A matte fringe is
   *  the gap between them: properly cut art converges on its own colour. */
  edgeMean: [number, number, number] | null;
  artMean: [number, number, number] | null;
  findings: QcFinding[];
}

/** Below this the art cannot be printed at the size asked of it. */
export const MIN_DPI = 150;
/** Below this it prints, but softly. */
export const TARGET_DPI = 300;
/** Fraction of pixels that must be opaque before the background counts as baked in. */
const OPAQUE_LIMIT = 0.95;
/** RGB distance between edge and art means that reads as a matte rather than noise. */
const MATTE_DISTANCE = 45;
/** An image with less art than this is probably a failed fetch (a spacer, a 1px gif). */
const MIN_INK_FRACTION = 0.01;
/**
 * How well the alpha ramp must explain the edge's colour variation before we trust
 * the fitted matte enough to subtract it. Below this the image has more than one
 * art colour under the edge and the intercept is not a background colour at all.
 */
const MATTE_FIT_FLOOR = 0.6;

const dist = (a: [number, number, number], b: [number, number, number]): number =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/**
 * Measure a candidate against what the badge needs. Reports; never mutates.
 */
export function analyzeArtwork(px: Pixels, req: PrintRequirement): QcReport {
  const { data, width, height } = px;
  const total = width * height;

  const requiredWidth = Math.round(req.span.cols * req.tileSizeInches * req.dpi);
  const requiredHeight = Math.round(req.span.rows * req.tileSizeInches * req.dpi);
  // The binding dimension, not the flattering one: art that is wide enough but too
  // short still prints short.
  const effectiveDpi = Math.min(
    width / (req.span.cols * req.tileSizeInches),
    height / (req.span.rows * req.tileSizeInches),
  );

  let clear = 0;
  let opaque = 0;
  let partial = 0;
  const colours = new Set<number>();
  // Edge pixels bucketed at the faint end, versus the solid art. Mean RGB of each.
  let edgeN = 0, edgeR = 0, edgeG = 0, edgeB = 0;
  let artN = 0, artR = 0, artG = 0, artB = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) {
      clear++;
      continue; // fully transparent RGB is undefined — reading it is how a bogus
      // 49/255 error once got measured. Skip it.
    }
    colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (a >= 250) {
      opaque++;
      artN++; artR += data[i]; artG += data[i + 1]; artB += data[i + 2];
    } else {
      partial++;
      if (a <= 64) {
        edgeN++; edgeR += data[i]; edgeG += data[i + 1]; edgeB += data[i + 2];
      }
    }
  }

  const edgeMean: [number, number, number] | null =
    edgeN > 0 ? [edgeR / edgeN, edgeG / edgeN, edgeB / edgeN] : null;
  const artMean: [number, number, number] | null =
    artN > 0 ? [artR / artN, artG / artN, artB / artN] : null;

  const findings: QcFinding[] = [];

  if (effectiveDpi < MIN_DPI) {
    findings.push({
      code: "resolution-low",
      severity: "error",
      message: `Only ${Math.round(effectiveDpi)} DPI at this size — needs ${requiredWidth}x${requiredHeight}px, got ${width}x${height}px.`,
      // Upscaling invents detail it does not have. The honest answer is a better file.
      repairable: false,
    });
  } else if (effectiveDpi < TARGET_DPI) {
    findings.push({
      code: "resolution-marginal",
      severity: "warning",
      message: `${Math.round(effectiveDpi)} DPI — prints, but softer than the ${TARGET_DPI} DPI target.`,
      repairable: false,
    });
  }

  const inkFraction = (opaque + partial) / total;
  if (inkFraction < MIN_INK_FRACTION) {
    findings.push({
      code: "near-empty",
      severity: "error",
      message: "Almost nothing in this image — likely a spacer or a failed download.",
      repairable: false,
    });
  }

  if (opaque / total >= OPAQUE_LIMIT) {
    findings.push({
      code: "background-opaque",
      severity: "warning",
      message: "Background is baked in, so the badge's field colour cannot show through.",
      repairable: true,
    });
  }

  if (edgeMean && artMean && dist(edgeMean, artMean) > MATTE_DISTANCE) {
    // Only claim it is repairable if the matte can actually be IDENTIFIED. On
    // multi-coloured art the fit is ambiguous (see `estimateMatte`), and subtracting
    // a guessed colour repaints the edge rather than cleaning it. Saying so is the
    // difference between a warning someone can act on and one that quietly lies.
    const matte = estimateMatte(px);
    const [r, g, b] = (matte ?? edgeMean).map(Math.round);
    findings.push({
      code: "matte-fringe",
      severity: "warning",
      message: matte
        ? `Edge pixels carry their old background (${r},${g},${b}) — a halo once the badge sits on a coloured field.`
        : `Edge pixels look like they carry an old background (around ${r},${g},${b}), but the art has too many colours under the edge to identify it confidently. Needs a human eye, or a copy cut from the original.`,
      repairable: matte != null,
    });
  }

  // A palette only matters where there is soft alpha to quantize; a flat logo with
  // 12 colours is not a defect, it is a flat logo.
  if (colours.size <= 256 && partial > total * 0.01) {
    findings.push({
      code: "palette-quantized",
      severity: "warning",
      message: `Only ${colours.size} colours — an 8-bit palette, which dithers flat areas into speckle.`,
      // The lost colours cannot be recovered; re-encoding only stops further loss.
      repairable: false,
    });
  }

  return {
    width,
    height,
    requiredWidth,
    requiredHeight,
    effectiveDpi,
    transparentFraction: clear / total,
    partialAlphaPixels: partial,
    distinctColours: colours.size,
    edgeMean,
    artMean,
    findings,
  };
}

/** True when nothing found is fatal — the art may be used, warnings and all. */
export function isUsable(report: QcReport): boolean {
  return !report.findings.some((f) => f.severity === "error");
}

export interface RepairResult {
  pixels: Pixels;
  /** Human-readable list of what was actually changed. */
  repairs: string[];
}

/**
 * Fix what is mechanically fixable, and say what was done.
 *
 * Two repairs, in the order they have to happen: cut an opaque background (which
 * CREATES the soft edge), then de-matte that edge (which cleans it). Running them
 * the other way round would de-matte an edge that does not exist yet.
 *
 * Deliberately does NOT upscale. Resolution cannot be repaired, only reported —
 * inventing pixels would turn a visible warning into an invisible quality loss.
 */
export function repairArtwork(px: Pixels, report: QcReport): RepairResult {
  const repairs: string[] = [];
  let out: Pixels = { data: new Uint8ClampedArray(px.data), width: px.width, height: px.height };

  const has = (code: QcCode) => report.findings.some((f) => f.code === code);

  if (has("background-opaque")) {
    const bg = cutBackground(out);
    if (bg.cut > 0) {
      out = bg.pixels;
      repairs.push(
        `Cut the baked-in background (${Math.round((bg.cut / (px.width * px.height)) * 100)}% of the image) so the field colour shows.`,
      );
    }
  }

  // Re-measure: cutting the background is what produces the fringe, so the matte
  // estimate has to come from the pixels as they are NOW.
  const matte = estimateMatte(out);
  if (matte && (has("matte-fringe") || has("background-opaque"))) {
    const n = deMatte(out, matte);
    if (n > 0) {
      const [r, g, b] = matte.map(Math.round);
      repairs.push(`Removed the (${r},${g},${b}) matte from ${n} edge pixels.`);
    }
  }

  return { pixels: out, repairs };
}

/**
 * The colour the soft edge is blended WITH, found by EXTRAPOLATING to zero alpha.
 *
 * A matted pixel is `O = M + a(C - M)`: observed colour is linear in alpha, running
 * from the matte at a=0 to the art at a=1. So a least-squares fit of O against a
 * gives the matte as its intercept, which is the quantity we actually need.
 *
 * Averaging the faintest bucket instead — the obvious approach, and the one tried
 * first — systematically UNDERSHOOTS, because the bucket spans a range of alphas
 * rather than the limit. On a white matte it returned 239 instead of 255, and
 * de-matting with a matte that is too dark over-corrects: the recovered colour
 * overshoots past white and clamps, leaving the very halo the repair was for. The
 * error grows as alpha falls, so it ruins precisely the faintest pixels.
 *
 * Returns null when the fit lands on the art's own colour — correctly cut art has
 * no matte to remove.
 */
export function estimateMatte(px: Pixels): [number, number, number] | null {
  const { data } = px;
  // Accumulators for a per-channel least-squares fit of colour against alpha.
  let n = 0, sa = 0, saa = 0;
  const sc = [0, 0, 0];
  const sac = [0, 0, 0];
  const scc = [0, 0, 0];
  let artN = 0;
  const artSum = [0, 0, 0];

  for (let i = 0; i < data.length; i += 4) {
    const a8 = data[i + 3];
    if (a8 === 0) continue; // undefined colour — never read it
    if (a8 >= 250) {
      artN++;
      for (let c = 0; c < 3; c++) artSum[c] += data[i + c];
      continue;
    }
    const a = a8 / 255;
    n++; sa += a; saa += a * a;
    for (let c = 0; c < 3; c++) {
      sc[c] += data[i + c];
      sac[c] += a * data[i + c];
      scc[c] += data[i + c] * data[i + c];
    }
  }
  if (n < 16 || artN === 0) return null;

  // Needs a spread of alphas to fit a line through; a single alpha has no slope.
  const varA = saa / n - (sa / n) ** 2;
  if (varA < 1e-4) return null;

  const matte = [0, 0, 0] as [number, number, number];
  let worstFit = 1;
  for (let c = 0; c < 3; c++) {
    const meanA = sa / n;
    const meanC = sc[c] / n;
    const slope = (sac[c] / n - meanA * meanC) / varA;
    matte[c] = Math.max(0, Math.min(255, meanC - slope * meanA));
    // How much of the colour variation the alpha ramp actually explains.
    const varC = scc[c] / n - meanC * meanC;
    const r2 = varC > 1e-6 ? Math.min(1, (slope * slope * varA) / varC) : 1;
    worstFit = Math.min(worstFit, r2);
  }

  // The model assumes ONE matte behind ONE art colour. On multi-coloured art each
  // pixel has its own C, that variation lands in the intercept, and the fit returns
  // a colour that was never the background — the real collection produced a blue
  // "matte" for a navy-on-white logo that way. De-matting with a wrong colour does
  // not clean an edge, it repaints it, so a weak fit must decline to repair and let
  // the warning stand instead.
  if (worstFit < MATTE_FIT_FLOOR) return null;

  const art: [number, number, number] = [
    artSum[0] / artN, artSum[1] / artN, artSum[2] / artN,
  ];
  return dist(matte, art) > MATTE_DISTANCE ? matte : null;
}

/**
 * Recover each partial pixel's true colour by removing the matte's contribution.
 *
 * A matted pixel is what you get from compositing: `observed = a*C + (1-a)*M`.
 * Solving for C is the whole repair. Without it the edge stays background-coloured
 * and reads as a halo the moment the badge sits on a different field.
 *
 * Returns how many pixels were changed. Mutates in place.
 */
export function deMatte(px: Pixels, matte: [number, number, number]): number {
  const { data } = px;
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a >= 250) continue;
    const alpha = a / 255;
    for (let c = 0; c < 3; c++) {
      const recovered = (data[i + c] - (1 - alpha) * matte[c]) / alpha;
      data[i + c] = Math.max(0, Math.min(255, Math.round(recovered)));
    }
    changed++;
  }
  return changed;
}

/**
 * Make an opaque background transparent by flooding INWARD from the border.
 *
 * Edge-connected on purpose, not a global colour match: a region that happens to
 * share the background's colour but is enclosed by art — the white inside a letter,
 * the gap in a logo's counter — must survive. A global match punches holes through
 * the artwork.
 *
 * Two thresholds rather than one hard cut, so anti-aliased edges fade instead of
 * leaving a 1px ring of background-coloured pixels.
 */
export function cutBackground(
  px: Pixels,
  near = 42,
  far = 96,
): { pixels: Pixels; cut: number } {
  const { width: W, height: H } = px;
  const data = new Uint8ClampedArray(px.data);
  const total = W * H;
  if (total === 0) return { pixels: { data, width: W, height: H }, cut: 0 };

  // Background colour: the corner that at least two others agree with, so a corner
  // holding artwork cannot decide it alone.
  const corner = (x: number, y: number): [number, number, number] => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const corners: [number, number, number][] = [
    corner(0, 0), corner(W - 1, 0), corner(0, H - 1), corner(W - 1, H - 1),
  ];
  const bg =
    corners.find((c) => corners.filter((o) => dist(o, c) < near).length >= 3) ?? corners[0];

  const at = (p: number): [number, number, number] => {
    const i = p * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };

  const seen = new Uint8Array(total);
  const stack: number[] = [];
  for (let x = 0; x < W; x++) { stack.push(x, x + (H - 1) * W); }
  for (let y = 0; y < H; y++) { stack.push(y * W, W - 1 + y * W); }

  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    if (dist(at(p), bg) > far) continue;
    seen[p] = 1;
    const x = p % W;
    const y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  let cut = 0;
  for (let p = 0; p < total; p++) {
    if (!seen[p]) continue;
    const d = dist(at(p), bg);
    const i = p * 4;
    if (d <= near) {
      data[i + 3] = 0;
      cut++;
    } else if (d < far) {
      data[i + 3] = Math.round(255 * ((d - near) / (far - near)));
      cut++;
    }
  }
  return { pixels: { data, width: W, height: H }, cut };
}
