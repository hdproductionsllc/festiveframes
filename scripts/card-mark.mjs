#!/usr/bin/env node
// ─── Seat a school mark on its own light card ────────────────────────────────
//
//   node scripts/card-mark.mjs <in.png> <out.png> [--card #FFFFFF] [--size 1024]
//
// A badge's field is the school's own colour (the owner's rule: badge background =
// the banner colour), and a school's mark is very often FILLED with that same
// colour. Eureka's wildcat is 84% #462E8D on a #462E8D badge; the Colts wordmark
// is 58% #AB1E38 on #AB1E38. On the frame the fill disappears into the field and
// the mark reads as a hollow outline — "you broke our logo".
//
// The fix lives in the ARTWORK, as tile-theme's `tileField` says it must: the
// renderer never edits a colour the parent picked, so art that needs a light
// ground carries one (SLUH's Billiken is drawn on its own card). This makes that
// card: a disc, the mark trimmed and fitted inside it at the largest size its own
// aspect allows. Logos are designed for white paper, so white is the default.
//
// Whether a mark NEEDS a card is measured, not eyeballed: `artFieldCollision` in
// src/lib/utils/tile-theme.ts, which the pilot sample harness asserts for every
// school's mascot on its own field.

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : dflt;
};
const card = flag("--card", "#FFFFFF");
const size = Number(flag("--size", "1024"));
const [input, output] = args;
if (!input || !output) {
  console.error("usage: node scripts/card-mark.mjs <in.png> <out.png> [--card #FFFFFF] [--size 1024]");
  process.exit(1);
}

const img = await loadImage(input);
const src = createCanvas(img.width, img.height);
const sctx = src.getContext("2d");
sctx.drawImage(img, 0, 0);
const { data } = sctx.getImageData(0, 0, img.width, img.height);

// Trim to the mark's own opaque bounds.
let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
for (let y = 0; y < img.height; y++) {
  for (let x = 0; x < img.width; x++) {
    if (data[(y * img.width + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
if (x1 < 0) {
  console.error("the image is fully transparent");
  process.exit(1);
}
const mw = x1 - x0 + 1;
const mh = y1 - y0 + 1;

const out = createCanvas(size, size);
const ctx = out.getContext("2d");
const c = size / 2;
const D = size * 0.98;

// The card, with a hairline a touch darker so it holds its edge on a pale field.
ctx.beginPath();
ctx.arc(c, c, D / 2, 0, Math.PI * 2);
ctx.fillStyle = card;
ctx.fill();
ctx.lineWidth = size * 0.006;
ctx.strokeStyle = "rgba(0,0,0,0.18)";
ctx.stroke();

// The largest rectangle of the mark's aspect inscribed in the disc, pulled in for air.
const a = mw / mh;
const AIR = 0.9;
const w = (D * a) / Math.sqrt(1 + a * a) * AIR;
const h = w / a;
ctx.drawImage(img, x0, y0, mw, mh, c - w / 2, c - h / 2, w, h);

writeFileSync(output, out.toBuffer("image/png"));
console.log(`${output}: ${size}x${size}, mark ${Math.round(w)}x${Math.round(h)} px on a ${card} card`);
