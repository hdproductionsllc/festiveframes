#!/usr/bin/env node
// ─── Light-enamel variants of the high-school badges ─────────────────────────
//
//   node scripts/light-enamel.mjs            (writes public/tiles/high-school/light/)
//   node scripts/light-enamel.mjs --report   (measures only)
//
// The badge library is one style block: gold metal over NAVY enamel. The owner's
// rule puts every badge on the school's own colour, and a school whose colour is
// dark (Marquette navy, Lafayette black, Eureka purple) then shows navy enamel on
// a navy-ish field — the violin, the wrestling boots, the crest read as thin gold
// line sketches, because only the metal survives.
//
// The fix is in the ARTWORK, as tile-theme's `tileField` note asks for: every
// badge with navy enamel gets a twin whose enamel is IVORY, the other classic pin
// enamel, with the metal, the other colours and the shading untouched. Which twin
// a frame draws is ONE decision (`badgeArtworkUrl` in src/lib/utils/tile-theme.ts)
// that both renderers read.
//
// The re-ink is per pixel and keeps the enamel's own light: each navy pixel's
// blue channel, relative to the badge's median navy, scales the ivory — so the
// gloss highlights and the recess shadows are the same shapes, lighter. "Navy" is
// blue-leaning dark (b >= r + 10, b >= g + 2) plus the near-neutral dark greys the
// recesses fade through (else they stay behind as grey speckle along the metal).
// Warm pixels — gold metal and its shadows — never match (b < r - 4).
//
// A badge gets a twin only when navy is a real share of it (>= MIN_SHARE of the
// opaque pixels): a white baseball with a navy stitch does not vanish on anything.
// Some badges are navy BY DESIGN and would lose their drawing without it (KEEP).
// Deterministic: same PNGs in, byte-identical twins out.
//
// Also writes src/data/sets/high-school-light.generated.ts — which badges have a
// twin, and the measured mean navy the switch rule compares a field against — so
// the data can never name a twin that is not on disk, or miss one that is.

import { readdirSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public/tiles/high-school");
const OUT = path.join(DIR, "light");
const IVORY = [243, 240, 232];
const MIN_SHARE = 0.12;
const report = process.argv.includes("--report");
const GENERATED = path.join(ROOT, "src/data/sets/high-school-light.generated.ts");

/** Navy that IS the drawing, not a fill: re-inked, the badge stops being itself. */
const KEEP = {
  soccer: "the navy pentagons are the ball; ivory leaves a blank white sphere",
  "ice-hockey": "the navy is the puck and the stick tape; an ivory puck is wrong",
};

const isNavy = (r, g, b) =>
  (b >= r + 10 && b >= g + 2 && Math.max(r, g, b) < 150) ||
  (Math.max(r, g, b) < 120 && b >= r - 4 && b >= g - 6);

/**
 * The GLOSS on navy enamel: a highlight is too light to pass `isNavy`, so it used
 * to stay behind as a pale-blue blotch on the ivory twin (the Health badge's heart,
 * 2026-09-27). Widening `isNavy` would also take light-blue ENAMEL (the palette's
 * sky-blue well, the sailboat's water). What tells them apart is the metal: every
 * enamel colour is fenced by a raised metal line, while a highlight sits ON the
 * enamel. So a connected light-blue patch counts as navy only when (nearly) all of
 * its border is navy AND it is a pale NAVY, green about level with red. Measured:
 * gloss runs g - r = 4..9; the swim goggle's sky-blue lens, whose dark recess reads
 * as navy all round it, is g - r = 82 and must stay blue. Returns one flag per pixel.
 */
function glossOnNavy(data, W, H) {
  const N = W * H;
  const light = (p) => {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    return data[i + 3] > 200 && !isNavy(r, g, b) && b >= r + 10 && b >= g + 2 && Math.max(r, g, b) < 250;
  };
  const navyAt = (p) => data[p * 4 + 3] > 200 && isNavy(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
  const seen = new Uint8Array(N);
  const out = new Uint8Array(N);
  const stack = [];
  for (let s = 0; s < N; s++) {
    if (seen[s] || !light(s)) continue;
    const comp = [];
    let navyEdge = 0, otherEdge = 0, greenOverRed = 0;
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop();
      comp.push(p);
      greenOverRed += data[p * 4 + 1] - data[p * 4];
      const x = p % W, y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q < 0) { otherEdge++; continue; }
        if (light(q)) {
          if (!seen[q]) { seen[q] = 1; stack.push(q); }
        } else if (navyAt(q)) navyEdge++;
        else otherEdge++;
      }
    }
    if (navyEdge >= 0.9 * (navyEdge + otherEdge) && greenOverRed / comp.length < 40) for (const p of comp) out[p] = 1;
  }
  return out;
}

if (!report) {
  if (existsSync(OUT)) rmSync(OUT, { recursive: true });
  mkdirSync(OUT, { recursive: true });
}

const made = [];
const names = [];
const sums = [0, 0, 0];
let count = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".png")).sort()) {
  const { data, info } = await sharp(path.join(DIR, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blues = [];
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 200) continue;
    opaque++;
    if (isNavy(data[i], data[i + 1], data[i + 2])) {
      blues.push(i);
    }
  }
  const share = opaque ? blues.length / opaque : 0;
  if (share < MIN_SHARE || KEEP[file.replace(/\.png$/, "")]) continue;
  for (const i of blues) {
    for (let c = 0; c < 3; c++) sums[c] += data[i + c];
    count++;
  }
  const sorted = blues.map((i) => data[i + 2]).sort((a, b) => a - b);
  const ref = Math.max(1, sorted[Math.floor(sorted.length / 2)]);
  made.push(`${file.replace(/\.png$/, "")} ${(share * 100).toFixed(0)}%`);
  names.push(file.replace(/\.png$/, ""));
  if (report) continue;
  const gloss = glossOnNavy(data, info.width, info.height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || !(isNavy(data[i], data[i + 1], data[i + 2]) || gloss[i >> 2])) continue;
    const k = Math.min(1.04, 0.74 + 0.26 * (data[i + 2] / ref));
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(IVORY[c] * k));
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
}
const hex = (v) => Math.round(v / count).toString(16).padStart(2, "0").toUpperCase();
console.log(`${made.length} badges with navy enamel (>= ${MIN_SHARE * 100}%):\n  ${made.join("\n  ")}`);
const navy = `#${hex(sums[0])}${hex(sums[1])}${hex(sums[2])}`;
console.log(`mean navy enamel across them: ${navy}`);
if (!report) {
  const list = names.map((n) => `  "${n}",`).join("\n");
  writeFileSync(
    GENERATED,
    [
      "// GENERATED by scripts/light-enamel.mjs — do not edit; re-run the script.",
      "",
      "/** The library's navy enamel, measured: mean of every re-inked pixel. */",
      `export const NAVY_ENAMEL = "${navy}";`,
      "",
      "/** The ivory the twins are re-inked with (its full-light value). */",
      `export const IVORY_ENAMEL = "#${IVORY.map((c) => c.toString(16).padStart(2, "0").toUpperCase()).join("")}";`,
      "",
      "/** Badges (file names under /tiles/high-school/) with an ivory twin in ./light/. */",
      "export const LIGHT_ENAMEL_FILES: readonly string[] = [",
      list,
      "];",
      "",
    ].join("\n"),
  );
  console.log("wrote", path.relative(ROOT, GENERATED));
}
