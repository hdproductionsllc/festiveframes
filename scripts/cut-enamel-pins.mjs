#!/usr/bin/env node
// ─── Cut die-struck enamel pin renders into badge art ────────────────────────
//
//   node scripts/cut-enamel-pins.mjs <src-dir> <out-dir>
//
// The intake for the enamel badge library. Ideogram returns a pin photographed on
// a magenta sweep (see tasks/enamel-pin-ideogram-prompts.md); this turns that into
// a cut-out, despilled, print-gated PNG.
//
// GLOBAL CHROMA KEY, not the edge-connected fill that scripts/make-tiles-
// transparent.mjs uses. That distinction is the whole reason this script exists
// separately, so it is worth stating plainly:
//
//   Edge-connected fill protects regions that SHARE the background's colour but
//   are enclosed by art. For a pin that protection is exactly wrong — a pin has
//   real HOLES in it (the gap between the goggle lenses), an enclosed hole is
//   unreachable from the border, and the fill therefore leaves it filled. It did,
//   and the despill then turned it maroon.
//
//   Here the backdrop is a DEDICATED CHROMA the artwork is forbidden to contain,
//   so any pixel matching it is backdrop wherever it sits. That makes the global
//   key both safe and correct, and it is what cuts the holes.
//
// DESPILL is not optional either: magenta bouncing off a plated edge leaves a red
// rim that reads as a dirty outline once the badge sits on a navy field.

import sharp from "sharp";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const NEAR = 62;    // <= this distance from the backdrop: fully background
const FAR = 132;    // >= this: fully art. Between: proportional feather.
const ERODE = 3;    // px of matte shaved off the silhouette — see below.
const TARGET = 1000; // long side. The 2x2 print floor is 595px; this keeps 1.7x.
const TILE_INCHES = 0.991;
const PRINT_FLOOR = Math.ceil(TILE_INCHES * 2 * 300);

const [src, out] = process.argv.slice(2);
if (!src || !out || !existsSync(src)) {
  console.error("usage: node scripts/cut-enamel-pins.mjs <src-dir> <out-dir>");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

for (const file of readdirSync(src).filter((f) => /\.(webp|png|jpe?g)$/i.test(f))) {
  const img = await loadImage(path.join(src, file));
  const W = img.width, H = img.height;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;

  // Sample the backdrop from the four CORNERS. These are shot on a sweep, so the
  // corners are clean even when there is a floor line and a cast shadow lower down.
  let sr = 0, sg = 0, sb = 0, n = 0;
  for (const [x, y] of [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]])
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const i = ((y + dy) * W + (x + dx)) * 4;
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++;
    }
  const BR = sr / n, BG = sg / n, BB = sb / n;

  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const dd = Math.hypot(d[i] - BR, d[i + 1] - BG, d[i + 2] - BB);
    if (dd <= NEAR) { d[i + 3] = 0; continue; }
    // Feather rather than hard-cut: a binary cut leaves a 1px ring of
    // backdrop-coloured pixels that reads as a dirty outline on a contrasting field.
    if (dd < FAR) d[i + 3] = Math.round(255 * ((dd - NEAR) / (FAR - NEAR)));
    // UNSPILL, hard clamp rather than the partial pull used first. A partial pull
    // does not remove magenta, it CONVERTS it: r and b come down unevenly and the
    // result lands on red, which measured 14-21% of opaque pixels as a dark red
    // band and is what the owner saw as "the magenta shadow cast". The standard
    // fix is a clamp — no channel may exceed what the backdrop cannot have
    // contributed — so magenta spill can leave no residue of any hue.
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (Math.min(r, b) > g) {
      const ceiling = g + Math.max(0, Math.min(r, b) - g) * 0.12; // a hair of warmth
      if (r > ceiling) d[i] = Math.round(Math.max(g, ceiling));
      if (b > ceiling) d[i + 2] = Math.round(Math.max(g, ceiling));
    }
  }

  // ERODE the matte. Spill concentrates in the outermost ring of the silhouette —
  // the pixels that were part backdrop, part plated edge — and no despill fully
  // recovers a pixel that was never wholly subject. Shaving a few px removes that
  // contaminated band outright. At the source resolution this is a fraction of a
  // percent of the width and is invisible once the badge is an inch wide; leaving
  // it in is a dirty outline on every badge, which is not.
  {
    const a = new Uint8ClampedArray(W * H);
    for (let p = 0; p < W * H; p++) a[p] = d[p * 4 + 3];
    for (let pass = 0; pass < ERODE; pass++) {
      const prev = Uint8ClampedArray.from(a);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (!prev[p]) continue;
        const l = x > 0 ? prev[p - 1] : 0, rr = x < W - 1 ? prev[p + 1] : 0;
        const u = y > 0 ? prev[p - W] : 0, dn = y < H - 1 ? prev[p + W] : 0;
        a[p] = Math.min(prev[p], l, rr, u, dn);
      }
    }
    for (let p = 0; p < W * H; p++) d[p * 4 + 3] = a[p];
  }
  ctx.putImageData(id, 0, 0);

  // Trim to content so the badge fills its tile instead of floating in padding.
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let p = 0; p < W * H; p++) {
    if (d[p * 4 + 3] < 16) continue;
    const x = p % W, y = (p / W) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh);
  const sq = createCanvas(side, side);
  sq.getContext("2d").drawImage(cv, x0, y0, bw, bh, (side - bw) / 2, (side - bh) / 2, bw, bh);

  const name = file.replace(/\.\w+$/, ".png");
  const buf = await sharp(sq.toBuffer("image/png"))
    .resize(TARGET, TARGET, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 92 })
    .toBuffer();
  const { writeFileSync } = await import("node:fs");
  writeFileSync(path.join(out, name), buf);

  const final = Math.min(TARGET, side);
  const gate = final >= PRINT_FLOOR ? "OK  " : "SOFT";
  console.log(
    `${gate} ${name.padEnd(18)} ${final}x${final}  ${(buf.length / 1024).toFixed(0)}KB` +
    (final >= PRINT_FLOOR ? "" : `  — under the ${PRINT_FLOOR}px floor for a 2x2 tile`)
  );
}
console.log(`\nLook at the output on a NAVY field before shipping — a fringe is invisible on white.`);
