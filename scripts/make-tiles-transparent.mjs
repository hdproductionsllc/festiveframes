#!/usr/bin/env node
// Cut the baked-in background out of tile art so the tile's FIELD colour shows.
//
//   node scripts/make-tiles-transparent.mjs public/tiles/high-school [--dry]
//
// Several of Becky's snappets arrived as opaque squares — the art sits on a solid
// or near-solid background that is part of the PNG. Those can never take a field
// colour: whatever the builder paints behind them is hidden. This makes the
// background transparent so one standard palette can drive every badge.
//
// Method: EDGE-CONNECTED flood fill, not a global colour match. Only background
// reachable from the border is removed, so a region that happens to share the
// background's colour but is enclosed by art (the blue inside a logo's counter, a
// white gap between letters) is preserved. A global match would punch holes in the
// artwork.
//
// Edges are feathered with two thresholds rather than a hard cut: within `near` is
// fully transparent, between `near` and `far` fades proportionally. A binary cut
// leaves a 1px halo of background-coloured pixels around every anti-aliased edge,
// which reads as a dirty outline once the badge sits on a contrasting field.
//
// Files already mostly transparent are left ALONE and reported as skipped.

import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const NEAR = 42; // distance at/below which a pixel IS background
const FAR = 96; // distance at/above which a pixel is fully art
/** Fraction of pixels that must be opaque before we treat art as "already cut out". */
const OPAQUE_LIMIT = 0.95;

const dir = process.argv[2];
const dry = process.argv.includes("--dry");
if (!dir || !existsSync(dir)) {
  console.error("usage: node scripts/make-tiles-transparent.mjs <dir> [--dry]");
  process.exit(1);
}

const dist = (d, i, r, g, b) =>
  Math.sqrt((d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2);

let changed = 0;
let skipped = 0;

for (const file of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort()) {
  const path = join(dir, file);
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const total = W * H;

  let opaque = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 200) opaque++;
  if (opaque / total < OPAQUE_LIMIT) {
    console.log(`  skip  ${file.padEnd(30)} already ${((1 - opaque / total) * 100).toFixed(0)}% transparent`);
    skipped++;
    continue;
  }

  // Background colour = the median-ish corner. Sampling all four and taking the one
  // that repeats guards against a corner that happens to hold artwork.
  const corners = [
    [0, 0],
    [W - 1, 0],
    [0, H - 1],
    [W - 1, H - 1],
  ].map(([x, y]) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  const [br, bg, bb] =
    corners.find((c, _, all) => all.filter((o) => dist([...o, 255], 0, ...c) < NEAR).length >= 3) ??
    corners[0];

  // Flood fill inward from every border pixel.
  const bgMask = new Uint8Array(total);
  const stack = [];
  for (let x = 0; x < W; x++) {
    stack.push(x, x + (H - 1) * W);
  }
  for (let y = 0; y < H; y++) {
    stack.push(y * W, W - 1 + y * W);
  }
  while (stack.length) {
    const p = stack.pop();
    if (bgMask[p]) continue;
    if (dist(data, p * 4, br, bg, bb) > FAR) continue;
    bgMask[p] = 1;
    const x = p % W;
    const y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  // Apply: feather by distance so anti-aliased edges fade instead of leaving a halo.
  let cut = 0;
  for (let p = 0; p < total; p++) {
    if (!bgMask[p]) continue;
    const i = p * 4;
    const d = dist(data, i, br, bg, bb);
    if (d <= NEAR) {
      data[i + 3] = 0;
      cut++;
    } else if (d < FAR) {
      data[i + 3] = Math.round(255 * ((d - NEAR) / (FAR - NEAR)));
      cut++;
    }
  }

  const pct = ((cut / total) * 100).toFixed(0);
  console.log(
    `  ${dry ? "would cut" : "cut     "} ${file.padEnd(30)} bg=rgb(${br},${bg},${bb})  ${pct}% removed`,
  );
  if (!dry) {
    const out = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .png({ palette: true, quality: 90, effort: 9 })
      .toBuffer();
    await sharp(out).toFile(path);
  }
  changed++;
}

console.log(`\n${dry ? "would change" : "changed"} ${changed}, skipped ${skipped}`);
