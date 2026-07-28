// ─── Lifting a mark off its backdrop ─────────────────────────────────────────
//
// A school's crest almost never arrives cut out. It is a JPEG off the athletics
// page with a white card behind it, or a PNG whose "transparency" is a flat white
// rectangle. Dropped onto a navy banner or a coloured badge that reads as a white
// box with a logo inside it — which is the single most obvious way a custom frame
// looks homemade.
//
// This is the keyer from `tasks/art-samples/key-batch.mjs`, generalised and moved
// into the app so a parent's upload gets what the generated artwork already got.
//
// THE ONE THING THAT HAD TO CHANGE. The batch script measures distance in the
// CHROMA plane alone — (r−g, b−g) — because generated art sat on saturated magenta
// and only its hue separated backdrop from subject. That method cannot tell white
// from grey from black, since all three have zero chroma, so pointed at the crest
// on a white card it either removes everything or nothing. Distance here is chroma
// AND luma, weighted, which keys a white backdrop without flattening a shaded mark.
//
// Everything below is pure and operates on raw RGBA, so the same code runs in the
// browser (upload) and in node (tests), and neither can drift from the other.

/** Luma's share of the distance. Pure chroma (0) cannot see a white backdrop; pure
 *  luma keys any light area including the lit side of the subject. */
const LUMA_WEIGHT = 0.62;

/**
 * Where backdrop ends and subject begins, as a fraction of how far the subject
 * actually sits from the backdrop in this particular image.
 *
 * A FIXED pair of thresholds was the first attempt and it produced exactly the matte
 * fringe the working notes warn about. Measured on a red crest scanned on white: the
 * half-covered pixel at the edge of the stroke is (227,135,150), which is a long way
 * from white in the chroma plane even though it is half white by coverage — so a
 * fixed cut called it solid artwork and left a pale pink line round the mark.
 *
 * Scaling to the image's own contrast fixes the classification. The exact coverage of
 * those edge pixels is then solved for separately, below.
 */
const SPLIT_FRACTION = 0.35;

/** A floor under that split, so a picture with almost no contrast in it does not end
 *  up splitting its own sensor noise into "backdrop" and "subject". */
const MIN_SPLIT = 28;

/**
 * How far above the backdrop's OWN variation the split must sit.
 *
 * Sourced crests are JPEGs, and a JPEG's flat white card is not flat: 8x8 blocking
 * and chroma subsampling leave it wandering several levels either side of its mean.
 * Measured on a 240px q75 re-encode of a crest on a #E9E9E9 card, that wander was
 * enough to push whole blocks past a fixed split, and they survived keying as
 * speckle scattered across what should have been empty background.
 *
 * So the floor is measured from the card in front of us rather than assumed. A clean
 * PNG has almost no spread and keeps the fixed floor; a heavily compressed JPEG
 * raises its own bar.
 */
const NOISE_MARGIN = 2.4;


/** How far to look for a local foreground colour when solving an edge pixel's
 *  coverage. Two pixels covers ordinary antialiasing and JPEG ringing. */
const EDGE_RADIUS = 2;

/** Below this the border ring is not one flat colour — a photo, a gradient, a busy
 *  collage — and there is nothing here to key. Refusing is the correct answer. */
const MIN_FLATNESS = 0.72;

/** How close a ring sample must be to the median to count as agreeing with it. */
const FLATNESS_TOLERANCE = 26;

/** Under this the keyer did nothing worth showing; over the upper bound it ate the
 *  subject. Both are reported rather than silently applied. */
const MIN_REMOVED = 0.015;
const MAX_REMOVED = 0.93;

/**
 * An enclosed backdrop-coloured region smaller than this share of the image is
 * treated as a hole in the artwork rather than as part of the artwork.
 *
 * Connectivity alone gets the important case right — a white letter inside a navy
 * shield is not connected to the card outside, so it survives — but it also keeps
 * the COUNTERS of letters, the enclosed white inside an O or an A, which then print
 * as white blobs on a coloured banner. Those are small; a mascot's white body is not.
 *
 * There is no purely local rule that separates them, so this is a size judgement and
 * it can be wrong on a wordmark set very large. Erring toward KEEPING is deliberate:
 * a filled counter is a blemish, a vanished mascot is a ruined frame.
 */
const SMALL_HOLE_SHARE = 0.008;

export type KeyRefusal = "no-flat-backdrop" | "already-cut-out" | "would-erase-art";

export interface KeyReport {
  /** True when the image was actually changed. */
  keyed: boolean;
  /** Why not, when it wasn't. */
  reason?: KeyRefusal;
  /** The backdrop that was measured, `#RRGGBB` — worth showing so a surprising
   *  result is explicable rather than mysterious. */
  backdrop: string;
  /** Share of the border ring agreeing with that colour, 0–1. */
  flatness: number;
  /** Share of all pixels that became fully transparent, 0–1. */
  removed: number;
}

/** Minimal RGBA surface — `ImageData` in the browser, a plain object in a test. */
export interface RGBA {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** Distance from a pixel to the backdrop, in the mixed chroma/luma space. */
function distance(
  r: number, g: number, b: number,
  bgCr: number, bgCb: number, bgL: number,
): number {
  const dCr = r - g - bgCr;
  const dCb = b - g - bgCb;
  const dL = (luma(r, g, b) - bgL) * LUMA_WEIGHT;
  return Math.sqrt(dCr * dCr + dCb * dCb + dL * dL);
}

/**
 * What sits behind the subject, measured from a ring two pixels in from the edge.
 *
 * MEDIAN, not mean: one stray dark pixel in the corner — a stamp, a watermark, a
 * JPEG block — drags a mean far enough to miss the backdrop entirely, and then every
 * threshold below is measured from the wrong place.
 *
 * `flatness` is the share of ring samples that agree with the median. It is the
 * whole basis for refusing: a crest photographed on a gym floor has a ring of
 * floorboards, and no keyer should touch it.
 */
export function analyzeBackdrop(
  img: RGBA,
): { rgb: [number, number, number]; flatness: number; noise: number } {
  const { data: d, width: W, height: H } = img;
  const samples: [number, number, number][] = [];
  const stepX = Math.max(1, Math.floor(W / 64));
  const stepY = Math.max(1, Math.floor(H / 64));
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    if (d[k + 3] < 128) return; // an already-transparent margin is not a backdrop
    samples.push([d[k], d[k + 1], d[k + 2]]);
  };
  for (let x = 0; x < W; x += stepX) { push(x, 2); push(x, 3); push(x, H - 3); push(x, H - 4); }
  for (let y = 0; y < H; y += stepY) { push(2, y); push(3, y); push(W - 3, y); push(W - 4, y); }

  if (samples.length === 0) return { rgb: [255, 255, 255], flatness: 0, noise: 0 };

  const med = (k: 0 | 1 | 2) => {
    const v = samples.map((s) => s[k]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const rgb: [number, number, number] = [med(0), med(1), med(2)];
  const [R, G, B] = rgb;
  const bgCr = R - G, bgCb = B - G, bgL = luma(R, G, B);
  const spread = samples
    .map((s) => distance(s[0], s[1], s[2], bgCr, bgCb, bgL))
    .sort((a, b) => a - b);
  const agree = spread.filter((v) => v <= FLATNESS_TOLERANCE).length;
  // How far the card wanders from its own median. The 90th percentile rather than the
  // maximum, so one dark speck in a corner does not set the bar for the whole image.
  const noise = spread[Math.min(spread.length - 1, Math.floor(spread.length * 0.9))];
  return { rgb, flatness: agree / samples.length, noise };
}

/**
 * Scanline flood fill over the backdrop-ish mask, writing `to` into `label`.
 *
 * Spans rather than pixels on the stack: a full-resolution phone photo is ~12 MP, and
 * a pixel stack for that is tens of megabytes of transient allocation in a browser
 * tab that is also holding two canvases. A span stack stays in the hundreds.
 *
 * `from` is the label it may overwrite (0 = unvisited), which is what lets the second
 * sweep re-run over a component it has already measured and change its verdict.
 * Returns the number of pixels filled.
 */
function fill(
  alpha: Uint8Array, label: Uint8Array,
  W: number, H: number,
  seed: number, to: number, from = 0,
): number {
  const open = (q: number) => alpha[q] < 255 && label[q] === from;
  if (!open(seed)) return 0;
  let filled = 0;
  const stack: number[] = [seed];
  while (stack.length) {
    const p = stack.pop()!;
    if (label[p] === to) continue; // reached by an earlier span
    const y = (p / W) | 0;
    const rowStart = y * W;
    const rowEnd = rowStart + W - 1;
    // Walk left and right to the ends of this run.
    let l = p;
    while (l > rowStart && open(l - 1)) l--;
    let r = p;
    while (r < rowEnd && open(r + 1)) r++;
    for (let i = l; i <= r; i++) { label[i] = to; filled++; }
    // Seed the rows above and below, once per contiguous run so the stack stays small.
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      const base = ny * W;
      let inRun = false;
      for (let x = l - rowStart; x <= r - rowStart; x++) {
        const q = base + x;
        const isOpen = open(q);
        if (isOpen && !inRun) { stack.push(q); inRun = true; }
        else if (!isOpen) inRun = false;
      }
    }
  }
  return filled;
}

/** Is enough of the image already transparent that it has clearly been cut out? */
function alreadyCutOut(img: RGBA): boolean {
  const { data: d, width: W, height: H } = img;
  let clear = 0, seen = 0;
  const step = Math.max(1, Math.floor(Math.min(W, H) / 48));
  for (let x = 0; x < W; x += step) {
    for (const y of [1, H - 2]) {
      const k = (y * W + x) * 4;
      if (d[k + 3] < 32) clear++;
      seen++;
    }
  }
  return seen > 0 && clear / seen > 0.6;
}

/**
 * Key the flat backdrop out of `img`, IN PLACE, and say what happened.
 *
 * Refuses — leaving the pixels untouched — when the border is not one flat colour,
 * when the image is already cut out, or when the result would have erased almost
 * everything. A refusal is a real outcome here, not a failure: the caller shows the
 * original and says why, which is far better than handing back a hollowed-out crest
 * and letting someone print it.
 */
export function keyBackground(img: RGBA): KeyReport {
  const { rgb, flatness, noise } = analyzeBackdrop(img);
  const backdrop = hex(rgb[0], rgb[1], rgb[2]);

  if (alreadyCutOut(img)) {
    return { keyed: false, reason: "already-cut-out", backdrop, flatness, removed: 0 };
  }
  if (flatness < MIN_FLATNESS) {
    return { keyed: false, reason: "no-flat-backdrop", backdrop, flatness, removed: 0 };
  }

  const { data: d, width: W, height: H } = img;
  const total = W * H;
  const [R, G, B] = rgb;
  const bgCr = R - G, bgCb = B - G, bgL = luma(R, G, B);
  // Unit vector along the backdrop's hue, for despill. Zero-length on a white, grey
  // or black backdrop — which is right: there is no hue to spill, and the fringe
  // those leave is a brightness problem the de-matte below already solves.
  const chromaLen = Math.hypot(bgCr, bgCb);
  const uCr = chromaLen > 8 ? bgCr / chromaLen : 0;
  const uCb = chromaLen > 8 ? bgCb / chromaLen : 0;

  // PASS 1 — how far every pixel sits from the backdrop, and where to split.
  //
  // The split is scaled to THIS image's contrast rather than fixed: the 95th
  // percentile is a robust read of "how far the artwork is from the backdrop", and a
  // third of the way there separates the two cleanly whether the card is white or the
  // backdrop is saturated magenta. Colours are not touched yet — connectivity has not
  // decided which pixels are actually leaving.
  const dist = new Float32Array(total);
  const hist = new Uint32Array(512);
  for (let p = 0; p < total; p++) {
    const i = p << 2;
    const v = d[i + 3] === 0 ? 0 : distance(d[i], d[i + 1], d[i + 2], bgCr, bgCb, bgL);
    dist[p] = v;
    hist[Math.min(511, Math.round(v))]++;
  }
  let acc = 0, p95 = 0;
  const target = total * 0.95;
  for (let b = 0; b < 512; b++) {
    acc += hist[b];
    if (acc >= target) { p95 = b; break; }
  }
  // Two floors: one absolute, one measured from how much the card itself wanders.
  const split = Math.max(MIN_SPLIT, noise * NOISE_MARGIN, p95 * SPLIT_FRACTION);

  // Alpha starts BINARY. A soft drop shadow is the backdrop at lower brightness, so
  // it falls below the split and leaves with it — which is the point: left in, it
  // prints as a grey rectangle round the mark.
  const alpha = new Uint8Array(total);
  for (let p = 0; p < total; p++) alpha[p] = dist[p] >= split ? 255 : 0;

  // NO despeckle or majority filter here, deliberately. Both were written and then
  // removed: they were answering JPEG confetti that turned out to be an artifact of a
  // test harness passing quality 0.7 to an encoder that wanted 0-100, i.e. a 2.6 KB
  // file no site would ever serve. Re-measured across 400-800px JPEGs at q45-q80, an
  // off-white card, a grey card, a drop shadow and an 8-bit dithered GIF, they moved
  // the partial-pixel count by single digits and the edge colour not at all — while a
  // majority filter rounds off anything thinner than a pixel. If a real sourced logo
  // ever shows speckle, that is the evidence to add it back on.

  // PASS 2 — CONNECTIVITY. Only backdrop that reaches the edge of the picture is the
  // background. Judging by colour alone deletes every light detail INSIDE the mark
  // too, which on a school crest means the white letter in the middle of the shield:
  // rendered on a navy banner the shield came back as an outline with a hole in it.
  const OUTSIDE = 1, KEEP = 2, HOLE = 3;
  const label = new Uint8Array(total);
  const seeds: number[] = [];
  for (let x = 0; x < W; x++) { seeds.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seeds.push(y * W, y * W + W - 1); }
  for (const s of seeds) if (alpha[s] < 255 && label[s] === 0) fill(alpha, label, W, H, s, OUTSIDE);

  // Anything backdrop-coloured the flood never reached is enclosed by artwork. Small
  // ones are the counters of letters; large ones are artwork in the backdrop's colour.
  const smallHole = Math.max(16, Math.round(total * SMALL_HOLE_SHARE));
  for (let p = 0; p < total; p++) {
    if (alpha[p] === 255 || label[p] !== 0) continue;
    const area = fill(alpha, label, W, H, p, KEEP);
    if (area < smallHole) fill(alpha, label, W, H, p, HOLE, KEEP);
  }

  // PASS 3 — SOLVE THE EDGE, then apply.
  //
  // A binary mask alone leaves the halo, because the pixels straddling the boundary
  // are genuinely a mix and calling them all-or-nothing is what makes the mark look
  // cut out with scissors — or, worse, keeps a pale ring of the old card.
  //
  // For each pixel on the boundary the backdrop B is known and a local foreground F
  // can be read off the solid artwork a pixel or two away, and with both known the
  // coverage is just how far along the line from B to F the pixel sits. That is what
  // turns (227,135,150) — a half-covered pixel at the edge of a red stroke, which a
  // fixed threshold called solid red — into alpha 0.5 over the stroke's real colour.
  const out = new Uint8ClampedArray(d);
  let removed = 0;
  const solved = new Float32Array(total);
  const onBoundary = new Uint8Array(total);

  const isSolid = (p: number) => alpha[p] === 255 || label[p] === KEEP;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const solid = isSolid(p);
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (isSolid(ny * W + nx) !== solid) { touches = true; break; }
        }
      }
      if (touches) onBoundary[p] = 1;
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!onBoundary[p]) continue;
      // Local foreground: the mean of nearby SOLID pixels that are not themselves on
      // the boundary, so the estimate is taken from clean artwork rather than from
      // other mixed pixels.
      let fr = 0, fg = 0, fb = 0, n = 0;
      for (let dy = -EDGE_RADIUS; dy <= EDGE_RADIUS; dy++) {
        for (let dx = -EDGE_RADIUS; dx <= EDGE_RADIUS; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (!isSolid(q) || onBoundary[q]) continue;
          const j = q << 2;
          fr += d[j]; fg += d[j + 1]; fb += d[j + 2]; n++;
        }
      }
      if (n === 0) { solved[p] = isSolid(p) ? 1 : 0; continue; }
      fr /= n; fg /= n; fb /= n;

      const vr = fr - rgb[0], vg = fg - rgb[1], vb = fb - rgb[2];
      const len2 = vr * vr + vg * vg + vb * vb;
      if (len2 < 1) { solved[p] = isSolid(p) ? 1 : 0; continue; }
      const i = p << 2;
      const cr = d[i] - rgb[0], cg = d[i + 1] - rgb[1], cb = d[i + 2] - rgb[2];
      solved[p] = Math.max(0, Math.min(1, (cr * vr + cg * vg + cb * vb) / len2));
    }
  }

  for (let p = 0; p < total; p++) {
    const i = p << 2;
    const a = onBoundary[p] ? solved[p] : isSolid(p) ? 1 : 0;
    if (a >= 1) { out[i + 3] = 255; continue; }
    if (a <= 0) { out[i + 3] = 0; removed++; continue; }

    // DE-MATTE. A partial pixel is subject mixed with backdrop; undo the mix rather
    // than leave it, or every edge keeps a ring of the old background. This is the
    // fringe measurement in CLAUDE.md: edge pixels ramping toward the backdrop
    // instead of toward the art.
    for (let k = 0; k < 3; k++) {
      out[i + k] = (d[i + k] - (1 - a) * rgb[k]) / a;
    }
    // DESPILL. Dividing by a small alpha amplifies any error in the backdrop
    // estimate, and what survives is tinted toward the backdrop's own hue. Remove
    // only the component ALONG that hue, so a red mark keyed off green keeps its
    // red — the magenta-specific subtraction in the batch script is this same
    // operation with the direction hard-coded.
    if (uCr || uCb) {
      const dcr = out[i] - out[i + 1];
      const dcb = out[i + 2] - out[i + 1];
      const proj = dcr * uCr + dcb * uCb;
      if (proj > 0) {
        out[i] -= proj * uCr;
        out[i + 2] -= proj * uCb;
      }
    }
    out[i + 3] = Math.round(a * 255);
  }

  const share = removed / total;
  if (share > MAX_REMOVED) {
    return { keyed: false, reason: "would-erase-art", backdrop, flatness, removed: share };
  }
  if (share < MIN_REMOVED) {
    return { keyed: false, reason: "no-flat-backdrop", backdrop, flatness, removed: share };
  }

  d.set(out);
  return { keyed: true, backdrop, flatness, removed: share };
}

/** What to tell someone when the keyer declined. Plain language — a parent uploading
 *  a crest should learn what to do next, not read a diagnostic. */
export const KEY_REFUSAL_COPY: Record<KeyRefusal, string> = {
  "no-flat-backdrop":
    "This picture has a busy background, so there's nothing clean to remove. Crop in tighter, or use a version of the logo on a plain white background.",
  "already-cut-out": "This one already has its background removed.",
  "would-erase-art":
    "Removing the background would have taken the logo with it - the artwork is too close in colour to what's behind it.",
};
