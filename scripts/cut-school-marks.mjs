#!/usr/bin/env node
// ─── Cut a school's supplied logo files into kit marks ───────────────────────
//
// Schools send whatever their comms office has: a lockup with the crest and the
// wordmark side by side, a mascot on a white card, a stacked version for
// letterhead. The kit needs three specific things out of that pile — a square
// mascot badge, a square crest for the banner, and the full lockup for the
// welcome band — and doing it by hand per school does not survive going national.
//
// So this is the intake step, run once per school:
//
//   node scripts/cut-school-marks.mjs <slug> [--split]
//
// Reads  assets/school-marks/<slug>/*        (the originals, committed as sent)
// Writes public/kits/<slug>/*.png            (what the kit points at)
//
// It does three things and refuses to guess at anything else:
//
//  1. TRIM to content — drops the transparent or white margin, so the mark fills
//     its tile instead of floating in a field of padding.
//  2. SPLIT (--split) a horizontal lockup at its widest empty column gutter,
//     separating crest from wordmark. This is measured, not eyeballed: a lockup
//     is laid out with real space between the two, and that gap is the widest run
//     of fully-empty columns in the file.
//  3. REPORT print DPI for the footprint each output is headed for, because the
//     resolution question ("will this look soft on the part?") is the one that
//     cannot be answered by looking at a screen.
//
// What it deliberately does NOT do is key a background out. Keying is per-mark
// judgement — SLUH's Billiken is navy line work with a WHITE BODY, so a global
// white key hollows out the mascot — and a wrong key is invisible until it
// prints. Marks that need a cutout get one deliberately, not from a batch job.

import { loadImage, createCanvas } from "@napi-rs/canvas";
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const TILE_INCHES = 0.991;      // school frame tile pitch
const BADGE_TILES = 2;          // badges are 2x2
const BANNER_ROWS = 2;          // the bottom panel is two rows
const LOGO_HEIGHT_RATIO = 0.72; // must match lib/utils/banner-logo.ts
const PRINT_DPI_FLOOR = 300;

const [slug, ...flags] = process.argv.slice(2);
if (!slug) {
  console.error("usage: node scripts/cut-school-marks.mjs <slug> [--split]");
  process.exit(1);
}
const SRC = path.join(process.cwd(), "assets", "school-marks", slug);
const OUT = path.join(process.cwd(), "public", "kits", slug);
if (!existsSync(SRC)) {
  console.error(`no source directory: ${path.relative(process.cwd(), SRC)}`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

async function read(file) {
  const img = await loadImage(path.join(SRC, file));
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return { ctx, w: img.width, h: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

/** Is this pixel ink — i.e. neither transparent nor (near-)white paper? */
function isInk(d, i) {
  if (d[i + 3] <= 16) return false;
  return !(d[i] > 244 && d[i + 1] > 244 && d[i + 2] > 244);
}

function contentBox(src, x0 = 0, x1 = src.w - 1) {
  const { data: d, w } = src;
  let bx0 = x1, by0 = src.h, bx1 = -1, by1 = -1;
  for (let y = 0; y < src.h; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isInk(d, (y * w + x) * 4)) continue;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
      if (y < by0) by0 = y; if (y > by1) by1 = y;
    }
  }
  if (bx1 < 0) return null;
  return { x0: bx0, y0: by0, x1: bx1, y1: by1, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
}

/** The widest run of columns with no ink at all — a lockup's crest/wordmark gutter. */
function widestGutter(src) {
  const { data: d, w, h } = src;
  const inked = new Array(w).fill(false);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (isInk(d, (y * w + x) * 4)) { inked[x] = true; break; }
    }
  }
  let best = null, start = -1;
  for (let x = 0; x <= w; x++) {
    if (x < w && !inked[x]) { if (start < 0) start = x; continue; }
    if (start < 0) continue;
    const run = { start, end: x - 1, len: x - start };
    // Ignore the outer margins — only a gap with ink on BOTH sides is a gutter.
    if (start > 0 && x < w && (!best || run.len > best.len)) best = run;
    start = -1;
  }
  return best;
}

function write(name, src, box, { square = false, bg = null, pad = 0 } = {}) {
  const side = square ? Math.max(box.w, box.h) + pad * 2 : 0;
  const outW = square ? side : box.w + pad * 2;
  const outH = square ? side : box.h + pad * 2;
  const cv = createCanvas(outW, outH);
  const ctx = cv.getContext("2d");
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, outW, outH); }
  ctx.drawImage(src.ctx.canvas, box.x0, box.y0, box.w, box.h,
    Math.round((outW - box.w) / 2), Math.round((outH - box.h) / 2), box.w, box.h);
  writeFileSync(path.join(OUT, name), cv.toBuffer("image/png"));
  return { name, w: outW, h: outH };
}

/** Flag anything that will print soft, with the pixel count that would fix it. */
function dpi(label, px, inches) {
  const d = Math.round(px / inches);
  const ok = d >= PRINT_DPI_FLOOR;
  console.log(
    `   ${ok ? "OK  " : "SOFT"} ${label.padEnd(22)} ${px}px over ${inches.toFixed(2)}" = ${d} DPI` +
    (ok ? "" : `  — needs ${Math.ceil(PRINT_DPI_FLOOR * inches)}px (vector original preferred)`)
  );
}

const badgeIn = TILE_INCHES * BADGE_TILES;
const crestIn = TILE_INCHES * BANNER_ROWS * LOGO_HEIGHT_RATIO;
const split = flags.includes("--split");

for (const file of readdirSync(SRC)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const src = await read(file);
  const base = file.replace(/-source\.\w+$/i, "").replace(/\.\w+$/, "");
  const full = contentBox(src);
  if (!full) { console.log(`${file}: blank, skipped`); continue; }
  console.log(`\n${file} (${src.w}x${src.h}) -> content ${full.w}x${full.h}`);

  if (split) {
    const gutter = widestGutter(src);
    if (gutter) {
      const crest = contentBox(src, 0, gutter.start - 1);
      if (crest) {
        const o = write(`${base}-crest.png`, src, crest);
        console.log(`   split at empty columns ${gutter.start}-${gutter.end} (${gutter.len} wide)`);
        console.log(`   wrote ${o.name} ${o.w}x${o.h}`);
        dpi("banner crest", o.h, crestIn);
      }
    } else {
      console.log("   --split asked for, but no interior gutter found — left whole");
    }
  }

  // The whole mark, trimmed. Square-padded (on white) when the source is opaque,
  // since an opaque mark is headed for a badge tile; kept at its own aspect when
  // it carries alpha, since that is a lockup for the welcome band.
  const opaque = src.data[3] === 255 && src.data[(src.w * src.h - 1) * 4 + 3] === 255;
  const o = write(`${base}.png`, src, full, opaque ? { square: true, bg: "#FFFFFF", pad: 10 } : {});
  console.log(`   wrote ${o.name} ${o.w}x${o.h}${opaque ? " (squared on white — badge)" : " (alpha kept — lockup)"}`);
  if (opaque) dpi("badge tile", Math.min(o.w, o.h), badgeIn);
}

console.log(`\nOutputs in public/kits/${slug}/. Point the kit's \`marks\` block at them,`);
console.log("and LOOK at a render before shipping — see CLAUDE.md, verifying visual work.");
