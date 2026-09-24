import {
  ART_FIT,
  ART_FIT_BINS,
  ART_FIT_DIGITS,
  ART_FIT_STEPS,
  type ArtFitEntry,
} from "@/data/sets/art-fit.generated";

// ─── Each artwork as big as its own ink allows ───────────────────────────────
//
// The question a badge asks of its art: how large can THIS art be drawn, centred in
// this box, before an opaque pixel crosses one of the box's rounded corners?
//
// A uniform answer has to assume art that reaches every corner, so a round softball
// paid for the palette's brushes. `scripts/art-fit.mjs` measures each PNG's ink once
// — its bounding box and a conservative silhouette from each side — and this module
// answers the question per art, exactly enough that art which never reaches a
// corner keeps its full size, and conservatively enough that nothing is ever cut.
//
// Pure geometry, no DOM and no canvas: tile-theme's `artRect` calls it for both
// renderers, which is what keeps the builder and the print file on one answer.

/** A rectangle in px. */
export interface ArtBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Corner radii of the region the INK must stay inside, in px. */
export interface ArtCorners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

interface Profile {
  entry: ArtFitEntry;
  t: Float64Array;
  r: Float64Array;
  b: Float64Array;
  l: Float64Array;
}

const decoded = new Map<string, Profile | null>();

function decode(s: string): Float64Array {
  const out = new Float64Array(ART_FIT_BINS);
  for (let i = 0; i < ART_FIT_BINS; i++) out[i] = ART_FIT_DIGITS.indexOf(s[i]) / ART_FIT_STEPS;
  return out;
}

function profileFor(url: string): Profile | null {
  let p = decoded.get(url);
  if (p === undefined) {
    const entry = ART_FIT[url];
    p = entry ? { entry, t: decode(entry.t), r: decode(entry.r), b: decode(entry.b), l: decode(entry.l) } : null;
    decoded.set(url, p);
  }
  return p;
}

/** Whether `url` has been measured. Uploads, remote marks and the holiday sets have not. */
export function hasArtFit(url: string | undefined | null): boolean {
  return !!url && !!ART_FIT[url];
}

/** A point `dx`, `dy` in from a corner lies in the part a radius-`r` corner cuts away. */
function cut(dx: number, dy: number, r: number): boolean {
  if (dx >= r || dy >= r) return false;
  const ex = r - dx;
  const ey = r - dy;
  return ex * ex + ey * ey > r * r;
}

/**
 * Whether the ink, drawn with its ink box `dw` x `dh` centred in `box`, clears every
 * rounded corner.
 *
 * Each corner is tested twice, once against the silhouettes seen from above/below
 * (column bins) and once against those seen from the sides (row bins). Each set is a
 * conservative stand-in for the ink, so either one clearing the corner proves the
 * real ink does — and taking the better of the two is what keeps a steep edge (a
 * brush handle running into the corner) from paying for a whole bin's width.
 */
function clears(p: Profile, box: ArtBox, dw: number, dh: number, rad: ArtCorners): boolean {
  const gx = (box.width - dw) / 2;
  const gy = (box.height - dh) / 2;
  const n = ART_FIT_BINS;
  // `vert` holds the top/bottom silhouette for that corner, `side` the left/right one;
  // `fromLeft` / `fromTop` say which way that corner's distances run.
  const corner = (r: number, vert: Float64Array, side: Float64Array, fromLeft: boolean, fromTop: boolean) => {
    if (r <= 0) return true;
    let byColumns = true;
    for (let i = 0; i < n && byColumns; i++) {
      // The bin's edge NEAREST this corner.
      const along = fromLeft ? i / n : 1 - (i + 1) / n;
      if (cut(gx + along * dw, gy + vert[i] * dh, r)) byColumns = false;
    }
    if (byColumns) return true;
    for (let j = 0; j < n; j++) {
      const along = fromTop ? j / n : 1 - (j + 1) / n;
      if (cut(gx + side[j] * dw, gy + along * dh, r)) return false;
    }
    return true;
  };
  return (
    corner(rad.tl, p.t, p.l, true, true) &&
    corner(rad.tr, p.t, p.r, false, true) &&
    corner(rad.br, p.b, p.r, false, false) &&
    corner(rad.bl, p.b, p.l, true, false)
  );
}

/**
 * Where to draw the WHOLE image `url` so that its ink is as large as it can be in
 * `box` without any opaque pixel crossing a corner of radius `corners`.
 *
 * The ink box is fitted `contain` into `box` (so the art's transparent margin costs
 * nothing), centred, then shrunk only as far as its own silhouette needs. The
 * returned rect has the image's own aspect, so a renderer drawing "contain" into it
 * draws exactly this. Returns null for art that was never measured — the caller's
 * uniform rule applies.
 */
export function fitArtInBox(url: string, box: ArtBox, corners: ArtCorners): ArtBox | null {
  const p = profileFor(url);
  if (!p || box.width <= 0 || box.height <= 0) return null;
  const { entry } = p;
  const [x0, y0, x1, y1] = entry.box;
  const bw = x1 - x0;
  const bh = y1 - y0;
  const k0 = Math.min(box.width / bw, box.height / bh);
  // A radius never exceeds half the box (CSS and canvas both clamp it there).
  const cap = Math.min(box.width, box.height) / 2;
  const rad: ArtCorners = {
    tl: Math.min(cap, Math.max(0, corners.tl)),
    tr: Math.min(cap, Math.max(0, corners.tr)),
    br: Math.min(cap, Math.max(0, corners.br)),
    bl: Math.min(cap, Math.max(0, corners.bl)),
  };
  const ok = (s: number) => clears(p, box, bw * k0 * s, bh * k0 * s, rad);
  let s = 1;
  if (!ok(1)) {
    // Shrinking about the centre only ever moves ink AWAY from a corner, so the
    // answer is monotone and a bisection finds it. `lo` is always a scale that
    // clears, so the result is never one that clips.
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    s = lo;
  }
  const k = k0 * s;
  const gx = (box.width - bw * k) / 2;
  const gy = (box.height - bh * k) / 2;
  return {
    x: box.x + gx - x0 * k,
    y: box.y + gy - y0 * k,
    width: entry.w * k,
    height: entry.h * k,
  };
}
