#!/usr/bin/env node
// ─── The school builder's STOCK Missouri plate ───────────────────────────────
//
//   node scripts/stock-plate.mjs
//
// A MySchoolFrame preview for a school with no vanity plate of its own used to
// fall through to Festive Frames' stock plate, which reads FESTIVE — the other
// brand's name, as the largest object in a school's builder. A school plate
// should say the school's word (scripts/gen-plate.mjs: MUSTANGS, WILDCATS...);
// until one exists, this is the honest neutral: a REAL photographed Missouri
// plate (public/plates/missouri.jpg) whose number is privacy-blurred, the way
// every car listing shows a plate. No painted-out band, no typed characters.
//
// Steps, all deterministic on the same input:
//   1. crop missouri.jpg to the plate's own bounds (measured: x 34-1172, y 21-596)
//   2. seat it in the 924x467 SLUH framing, exactly as `gen-plate.mjs --conform`
//      does, so plate-images.ts's MO display (scale 1, centred) fits it as-is
//   3. replace the source's hard-edged mosaic with a feathered gaussian blur
//
// Output: public/plates/missouri-stock-centered.jpg (read by SCHOOL_STOCK_PLATES
// in src/data/school-kits.ts).

import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const SRC = path.join(ROOT, "public/plates/missouri.jpg");
const BASE = path.join(ROOT, "public/plates/missouri-jrbills-centered.jpg");
const OUT = path.join(ROOT, "public/plates/missouri-stock-centered.jpg");

const W = 924;
const H = 467;
/** The source's mosaic, in the conformed frame, and the blur's feather width. */
const BAND = { x0: 48, x1: 874, y0: 106, y1: 364, feather: 14 };
const SIGMA = 22;

const body = await sharp(SRC)
  .extract({ left: 34, top: 21, width: 1138, height: 575 })
  .resize(903, 461, { fit: "fill" })
  .toBuffer();
const conformed = await sharp(BASE)
  .composite([{ input: body, left: 7, top: 1 }])
  .removeAlpha()
  .raw()
  .toBuffer();
const blurred = await sharp(conformed, { raw: { width: W, height: H, channels: 3 } })
  .blur(SIGMA)
  .raw()
  .toBuffer();

const out = Buffer.alloc(conformed.length);
const { x0, x1, y0, y1, feather: F } = BAND;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.min(x - x0, x1 - x, y - y0, y1 - y);
    const a = Math.max(0, Math.min(1, (d + F) / (2 * F)));
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) out[i + k] = Math.round(conformed[i + k] * (1 - a) + blurred[i + k] * a);
  }
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 90 }).toFile(OUT);
console.log("stock plate ->", path.relative(ROOT, OUT), `(${W}x${H}, SLUH framing)`);
