#!/usr/bin/env node
// ─── Per-artwork fit: how big each badge's art can be drawn without clipping ──
//
//   npm run art:fit           (node scripts/art-fit.mjs — rewrites the table)
//   node scripts/art-fit.mjs --check   (exit 1 if the table is stale; writes nothing)
//
// A badge's art is drawn centred in a box inside the chrome, and a badge's corners
// are ROUNDED — very round on the four badges at the frame's outer corners. One
// uniform safety margin for that corner made every art pay for the worst one: a
// round softball never reaches a corner, yet it shrank exactly as much as the
// palette whose brushes do (owner, 2026-09-24: "as big and bold as possible but
// not clip").
//
// So each artwork is MEASURED once, here, and the runtime (src/lib/utils/art-fit.ts,
// reached through tile-theme's `artRect`) asks the one question that matters for
// that art in that badge: at what scale does its first opaque pixel touch the
// rounded corner?
//
// What is measured, per PNG (alpha above ALPHA counts as ink):
//   - `box`: the opaque bounding box, so art is fitted by its INK and not by the
//     transparent margin around it (a wide band on a 2x1 badge used to be fitted by
//     its square canvas and fill half the badge);
//   - four SILHOUETTES, one per side, of BINS samples each. `t[i]` is how far down
//     from the ink box's top edge the first ink sits within column-bin i, as a
//     fraction of the ink box's height; `b`, `l`, `r` likewise from the other sides.
//
// CONSERVATIVE by construction, so the runtime can never clip:
//   - a pixel is a square; it is counted in EVERY bin its extent overlaps, by the
//     edge nearest the side being measured;
//   - the runtime treats a bin's ink as sitting at the bin's edge NEAREST the corner;
//   - values are FLOORED to 1/128 of the ink box (closer to the edge than the truth);
//   - values are capped just under 0.5 — ink further in than halfway can never
//     reach a corner (a corner radius never exceeds half the box), and the cap
//     lets every value be ONE character, which keeps the table small enough to
//     ship to a phone.
// Every approximation moves ink TOWARD the corner, never away from it.
//
// Deterministic: same PNGs in, byte-identical table out. `sha` is the first 12 hex
// of the file's sha256, which is how art-fit.test.ts knows the table is stale.

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
/** Everything a school badge can draw: the library, its ivory twins, kit marks. */
const ROOTS = ["tiles/high-school", "kits"];
const ALPHA = 24;
const BINS = 48;
/** Silhouette depths are stored in 1/STEPS of the ink box, one character each. */
const STEPS = 128;
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
const CAP = DIGITS.length - 1; // 63/128: "no ink nearer than just under halfway"
const OUT = path.join(ROOT, "src/data/sets/art-fit.generated.ts");

function pngsUnder(rel) {
  const out = [];
  for (const name of readdirSync(path.join(PUBLIC, rel)).sort()) {
    const r = `${rel}/${name}`;
    if (statSync(path.join(PUBLIC, r)).isDirectory()) out.push(...pngsUnder(r));
    else if (name.toLowerCase().endsWith(".png")) out.push(r);
  }
  return out;
}

const enc = (v) => DIGITS[Math.max(0, Math.min(CAP, v))];

/**
 * One silhouette. `along` is the ink box's extent along the side (columns for top
 * and bottom), `depth` across it; `first(k)` returns the depth, in whole pixels
 * from the measured side, of the first ink in line k (or Infinity for none).
 */
function silhouette(along, depth, first) {
  const vals = new Array(BINS).fill(CAP);
  for (let k = 0; k < along; k++) {
    const d = first(k);
    if (!Number.isFinite(d)) continue;
    const v = Math.floor((d / depth) * STEPS);
    // The pixel spans [k, k+1) of `along`; count it in every bin it overlaps.
    const i0 = Math.floor((k / along) * BINS);
    const i1 = Math.min(BINS - 1, Math.ceil(((k + 1) / along) * BINS) - 1);
    for (let i = i0; i <= i1; i++) if (v < vals[i]) vals[i] = v;
  }
  return vals.map(enc).join("");
}

async function measure(rel) {
  const file = path.join(PUBLIC, rel);
  const bytes = readFileSync(file);
  const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const ink = (x, y) => data[(y * W + x) * 4 + 3] > ALPHA;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (ink(x, y)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error(`${rel}: no pixel above alpha ${ALPHA} — nothing to fit`);
  x1 += 1; // exclusive
  y1 += 1;
  const bw = x1 - x0;
  const bh = y1 - y0;
  const scanDown = (x) => { for (let y = y0; y < y1; y++) if (ink(x, y)) return y - y0; return Infinity; };
  const scanUp = (x) => { for (let y = y1 - 1; y >= y0; y--) if (ink(x, y)) return y1 - 1 - y; return Infinity; };
  const scanRight = (y) => { for (let x = x0; x < x1; x++) if (ink(x, y)) return x - x0; return Infinity; };
  const scanLeft = (y) => { for (let x = x1 - 1; x >= x0; x--) if (ink(x, y)) return x1 - 1 - x; return Infinity; };
  return {
    sha,
    w: W,
    h: H,
    box: [x0, y0, x1, y1],
    t: silhouette(bw, bh, (k) => scanDown(x0 + k)),
    b: silhouette(bw, bh, (k) => scanUp(x0 + k)),
    l: silhouette(bh, bw, (k) => scanRight(y0 + k)),
    r: silhouette(bh, bw, (k) => scanLeft(y0 + k)),
  };
}

const files = ROOTS.flatMap(pngsUnder);
const entries = [];
for (const rel of files) entries.push([`/${rel}`, await measure(rel)]);

const body = entries
  .map(([url, e]) =>
    [
      `  ${JSON.stringify(url)}: {`,
      `    sha: ${JSON.stringify(e.sha)}, w: ${e.w}, h: ${e.h}, box: [${e.box.join(", ")}],`,
      `    t: ${JSON.stringify(e.t)},`,
      `    r: ${JSON.stringify(e.r)},`,
      `    b: ${JSON.stringify(e.b)},`,
      `    l: ${JSON.stringify(e.l)},`,
      `  },`,
    ].join("\n"),
  )
  .join("\n");

const ts = `// GENERATED by scripts/art-fit.mjs — do not edit; run \`npm run art:fit\`.
//
// Each badge artwork's measured ink: its opaque bounding box and four conservative
// silhouettes (see the script's header). src/lib/utils/art-fit.ts turns these into
// the largest size an art can be drawn in a rounded badge without clipping.
// art-fit.test.ts fails when a PNG under ART_FIT_ROOTS has no entry or a stale one.

/** Alpha above which a pixel counts as ink. */
export const ART_FIT_ALPHA = ${ALPHA};
/** Samples per silhouette. */
export const ART_FIT_BINS = ${BINS};
/** Depth unit of a silhouette value, and the one-character alphabet it is written in. */
export const ART_FIT_STEPS = ${STEPS};
export const ART_FIT_DIGITS = ${JSON.stringify(DIGITS)};
/** Directories under public/ whose every PNG is measured. */
export const ART_FIT_ROOTS: readonly string[] = ${JSON.stringify(ROOTS)};

export interface ArtFitEntry {
  /** First 12 hex of the file's sha256 — the staleness key. */
  sha: string;
  /** Image size in px. */
  w: number;
  h: number;
  /** Opaque bounding box [x0, y0, x1, y1), px. */
  box: readonly [number, number, number, number];
  /** Silhouettes from the top, right, bottom and left: ART_FIT_BINS characters
   *  each, one per bin, the index into ART_FIT_DIGITS being the depth of the first
   *  ink in 1/ART_FIT_STEPS of the ink box (floored; capped at the last digit). */
  t: string;
  r: string;
  b: string;
  l: string;
}

export const ART_FIT: Readonly<Record<string, ArtFitEntry>> = {
${body}
};
`;

if (process.argv.includes("--check")) {
  const current = (() => { try { return readFileSync(OUT, "utf8"); } catch { return ""; } })();
  if (current !== ts) {
    console.error("art-fit.generated.ts is stale — run `npm run art:fit`.");
    process.exit(1);
  }
  console.log(`art-fit: ${entries.length} artworks, table current.`);
} else {
  writeFileSync(OUT, ts);
  console.log(`art-fit: measured ${entries.length} artworks -> ${path.relative(ROOT, OUT)}`);
}
