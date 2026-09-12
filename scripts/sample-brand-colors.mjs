#!/usr/bin/env node
// ─── Measure a school's colours from its OWN artwork ─────────────────────────
//
// The exact method that produced SLUH's kit values, as a committed pipeline
// instead of a thing someone did once by hand.
//
// WHY THIS EXISTS. Every school in the catalogue except SLUH and MICDS carries a
// colour we GUESSED from a colour NAME ("purple and Vegas gold"), because no
// school publishes a reachable hex and this environment cannot open a school's
// site, its brand PDF, or its logo file — WebFetch, curl and headless Chromium
// are all blocked by the egress proxy, and search only returns prose. So the
// exact values are an owner grab (CLAUDE.md, per-school research kit, item 8).
//
// This makes that grab cheap: drop the school's own logo/crest/wordmark file in
// and it reports what the artwork ACTUALLY contains, with each colour's share of
// the opaque pixels, plus the kit block and the honest `colorSource` sentence to
// paste. Measured-from-the-artwork beats a published hex anyway: it is the ink
// the school's own designer chose, not a number in a PDF nobody checks against.
//
//   node scripts/sample-brand-colors.mjs --slug sluh-jr-bills public/kits/sluh/lockup.png
//   node scripts/sample-brand-colors.mjs --slug cbc-cadets ~/Downloads/cbc-*.png
//
// Verified against the one kit whose values were measured by hand: it reproduces
// SLUH's documented navy #183B67 and columbia #89CCE9 from lockup.png.

import sharp from "sharp";
import { basename } from "node:path";

const ALPHA_FLOOR = 200; // ignore anti-aliased and transparent edges entirely
const MERGE_DISTANCE = 48; // RGB distance below which two buckets are one colour
const MIN_SHARE = 0.005; // 0.5% of opaque pixels — below this it is an artefact

const luminance = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturation = ({ r, g, b }) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};
const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0").toUpperCase()).join("");
const distance = (a, b) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/** Every opaque colour in one image, bucketed and merged into clusters. */
async function clustersOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  let opaque = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < ALPHA_FLOOR) continue;
    opaque++;
    // Quantise to 32 levels per channel so near-identical pixels land together;
    // the cluster's reported colour is the MEAN of its members, not the bucket,
    // so quantisation never shifts the answer.
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
    buckets.set(key, b);
  }
  const raw = [...buckets.values()]
    .map((b) => ({ n: b.n, r: b.r / b.n, g: b.g / b.n, b: b.b / b.n }))
    .sort((a, b) => b.n - a.n);

  // Merge each bucket into the heaviest cluster it is close to — heaviest first,
  // so the dominant ink claims its own anti-aliasing rather than the reverse.
  const clusters = [];
  for (const c of raw) {
    const near = clusters.find((k) => distance(k, c) < MERGE_DISTANCE);
    if (!near) { clusters.push({ ...c }); continue; }
    const n = near.n + c.n;
    near.r = (near.r * near.n + c.r * c.n) / n;
    near.g = (near.g * near.n + c.g * c.n) / n;
    near.b = (near.b * near.n + c.b * c.n) / n;
    near.n = n;
  }
  return { opaque, clusters: clusters.filter((c) => c.n / opaque >= MIN_SHARE) };
}

/**
 * The frame body: the most saturated colour that is not near-white and not
 * near-black. A school's body colour is its ink — white is the paper and black
 * is line work, and neither is what the frame is moulded in.
 */
function pickFrame(clusters) {
  const candidates = clusters.filter((c) => luminance(c) > 0.04 && luminance(c) < 0.85 && saturation(c) > 0.2);
  if (!candidates.length) return clusters[0];
  // Weight SHARE and saturation together: a big pale wash should not beat the
  // wordmark's own colour, and a 0.6% accent should not beat the body.
  //
  // Share, never raw pixel count. Counts pool across files of different sizes, so
  // a 275k-pixel mascot outvotes a 64k-pixel wordmark no matter what is in them —
  // which is exactly how this first recommended SLUH's columbia diamond as the
  // frame body when its own kit is navy. Each file gets one vote per colour.
  return candidates.sort((a, b) => b.share * saturation(b) - a.share * saturation(a))[0];
}

/**
 * The rim: the colour with a real luminance gap from the body, so the merrow
 * thread is a BORDER and not extra weight. Same 0.25 gap `merrowThread` enforces
 * (tile-theme.ts) — recommending a rim the renderer would have to override is
 * how a kit ends up looking nothing like the value in it.
 */
function pickRim(clusters, frame) {
  const gap = (c) => Math.abs(luminance(c) - luminance(frame));
  const usable = clusters.filter((c) => c !== frame && gap(c) >= 0.25);
  if (!usable.length) return null;
  return usable.sort((a, b) => b.share - a.share)[0];
}

const args = process.argv.slice(2);
const slugAt = args.indexOf("--slug");
const slug = slugAt >= 0 ? args[slugAt + 1] : "<slug>";
const files = args.filter((a, i) => a !== "--slug" && i !== slugAt + 1);

if (!files.length) {
  console.error("usage: node scripts/sample-brand-colors.mjs --slug <kit-slug> <image...>");
  process.exit(1);
}

const all = [];
for (const file of files) {
  const { opaque, clusters } = await clustersOf(file);
  console.log(`\n${basename(file)} — ${opaque.toLocaleString()} opaque pixels`);
  for (const c of clusters.sort((a, b) => b.n - a.n)) {
    const share = ((c.n / opaque) * 100).toFixed(1);
    console.log(
      `  ${hex(c)}  ${share.padStart(5)}%   lum ${luminance(c).toFixed(2)}  sat ${saturation(c).toFixed(2)}`,
    );
    all.push({ ...c, file: basename(file), share: c.n / opaque });
  }
}

// One colour appearing in three files is ONE colour. Merge across files by the
// same distance rule, summing shares, or the crest's navy and the wordmark's
// navy compete with each other and a single-file accent wins on a split vote.
const merged = [];
for (const c of [...all].sort((a, b) => b.share - a.share)) {
  const near = merged.find((k) => distance(k, c) < MERGE_DISTANCE);
  if (!near) { merged.push({ ...c, files: new Set([c.file]) }); continue; }
  const w = near.share + c.share;
  near.r = (near.r * near.share + c.r * c.share) / w;
  near.g = (near.g * near.share + c.g * c.share) / w;
  near.b = (near.b * near.share + c.b * c.share) / w;
  near.share = w;
  near.files.add(c.file);
}

const frame = pickFrame(merged);
const rim = pickRim(merged, frame);
const cite = [...new Set(all.map((c) => c.file))].join(", ");
// MEAN share across the files the colour appears in, not the sum: summed shares
// run past 100% and a `colorSource` that reads "58.7% of two files" is a number
// nobody can check. One file, one vote.
const shares = (c) =>
  `${hex(c)} (${((c.share / c.files.size) * 100).toFixed(1)}% mean of ${[...c.files].join(" + ")})`;

console.log(`\n─── paste into src/data/school-kits.ts for ${slug} ───\n`);
console.log(`    colors: { frame: "${hex(frame)}", tileField: "${hex(frame)}", rim: ${rim ? `"${hex(rim)}"` : "null"} },`);
console.log(`    colorSource:`);
console.log(
  `      "MEASURED from the school's own artwork (${cite}) by sampling the decoded pixels — ` +
    `not eyeballed: body ${shares(frame)}` +
    (rim ? `, rim ${shares(rim)}` : ", no rim colour cleared the 0.25 luminance gap, so the brass default stands") +
    `. Raster source; a vector original is still worth having before a large print run.",`,
);
console.log(
  `\nStill required before status: "verified" — written permission to use the school's name and marks.\n`,
);
