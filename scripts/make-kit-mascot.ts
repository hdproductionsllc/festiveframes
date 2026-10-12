// ─── A school's mascot file, made the same way every time ────────────────────
//
//   npx vite-node scripts/make-kit-mascot.ts <logo.(png|gif|jpg|webp|svg)> <out.png> [--screen-only]
//
// Turns a school's own logo into the file a kit's `marks` points at: transparent,
// trimmed, centred on a square with a 5% margin, 1024 px (300 DPI at the 2.25"
// badge would be 675; 1024 leaves room for the crest box and a recrop). This is the
// recipe the pilot six were made with by hand — written down so the next school
// is not a judgement call.
//
// A logo on a white card is keyed with the APP's adaptive keyer (the same one a
// parent's upload goes through), never a fixed threshold. A logo that is already
// cut out is left alone — the keyer refuses it with "already-cut-out", which is
// the right answer, not a failure. A logo on a busy backdrop is refused outright:
// a photographed crest is not a mark we can lift cleanly.
//
// RESOLUTION. Art under PRINT_MIN px on its long side cannot print at 300 DPI on
// the badge (the intake gate in CLAUDE.md), and upscaling it to 1024 hides that —
// the file looks print-ready and is not. So it is refused unless `--screen-only`
// says, on purpose, that this file is for the on-screen builder and a vector from
// the school is still owed before a print run (say so in the kit's colorSource).

import sharp from "sharp";
import { keyBackground } from "../src/lib/utils/key-background";

const SIZE = 1024;
const MARGIN = 0.05;
const PRINT_MIN = 595;

const screenOnly = process.argv.includes("--screen-only");
const [src, out] = process.argv.slice(2).filter((a) => a !== "--screen-only");
if (!src || !out) {
  console.error("usage: npx vite-node scripts/make-kit-mascot.ts <logo> <out.png> [--screen-only]");
  process.exit(1);
}

// SVGs rasterise at a generous density so the trim and resize work on real pixels.
const input = sharp(src, { density: src.toLowerCase().endsWith(".svg") ? 600 : 72 }).ensureAlpha();
const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
const img = { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };

const report = keyBackground(img);
if (!report.keyed && report.reason !== "already-cut-out") {
  console.error(`REFUSED: ${report.reason} (backdrop ${report.backdrop}, flatness ${report.flatness.toFixed(2)})`);
  process.exit(2);
}

const trimmed = await sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim({ threshold: 1 })
  .png()
  .toBuffer({ resolveWithObject: true });

const longSide = Math.max(trimmed.info.width, trimmed.info.height);
if (longSide < PRINT_MIN && !screenOnly) {
  console.error(
    `REFUSED: art is ${longSide}px on its long side, under the ${PRINT_MIN}px print gate. ` +
      "Find a larger source, or pass --screen-only and record that a vector is owed.",
  );
  process.exit(3);
}

const inner = Math.round(SIZE * (1 - 2 * MARGIN));
const scale = inner / Math.max(trimmed.info.width, trimmed.info.height);
const art = await sharp(trimmed.data)
  .resize({ width: inner, height: inner, fit: "inside", kernel: "lanczos3" })
  .toBuffer();

await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: art, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(
  `${out}: ${SIZE}x${SIZE}; source ${info.width}x${info.height}, art ${trimmed.info.width}x${trimmed.info.height} -> scale ${scale.toFixed(2)}x` +
    (longSide < PRINT_MIN ? "  SCREEN ONLY: under the print gate, a vector is owed" : "") +
    (report.keyed ? `; keyed backdrop ${report.backdrop} (flatness ${report.flatness.toFixed(2)}, removed ${(report.removed * 100).toFixed(0)}%)` : "; already cut out"),
);
