// Key + trim the generated patch art. Same chroma-plane method as key-chroma.mjs
// (see that file for why chroma rather than RGB distance); this one carries the
// NAME MAP for the 26-piece batch and preserves each piece's aspect.
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

const D = "tasks/art-samples";
const OUT = "public/tiles/high-school";

// tile_NN -> slug. Portrait pieces are marked so the registry can give them a 1x2
// footprint; `objectFit: contain` would otherwise letterbox them into a square.
export const MAP = [
  // ── square (2x2) ──
  ["tile_06", "art-club",      "sq"], ["tile_08", "crest",        "sq"],
  ["tile_11", "star",          "sq"], ["tile_12", "medal",        "sq"],
  ["tile_14", "laurel",        "sq"], ["tile_17", "band",         "sq"],
  ["tile_19", "science",       "sq"], ["tile_21", "photography",  "sq"],
  ["tile_22", "drama",         "sq"], ["tile_24", "chess",        "sq"],
  ["tile_27", "robotics",      "sq"], ["tile_29", "cheer",        "sq"],
  ["tile_32", "debate",        "sq"], ["tile_35", "tennis",       "sq"],
  ["tile_36", "golf",          "sq"], ["tile_39", "track",        "sq"],
  // ── portrait (1x2) ──
  ["tile_00", "marching-band", "po"], ["tile_02", "yearbook",     "po"],
  ["tile_04", "gavel",         "po"], ["tile_48", "robotic-arm",  "po"],
  ["tile_58", "diploma",       "po"], ["tile_60", "field-hockey", "po"],
  ["tile_63", "baseball-bat",  "po"], ["tile_72", "torch",        "po"],
  ["tile_76", "trophy",        "po"],
];

const chroma = (r, g, b) => [r - g, b - g];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const T0_DEFAULT = 48, T1 = 92;

/**
 * Per-piece backdrop threshold, where the default leaves a visible rim.
 *
 * `robotic-arm` is thin blue linework on magenta. Un-multiplying divides by alpha,
 * so on structures only a few pixels wide almost every pixel is a partial one and
 * the amplified error shows as a red outline that survives despill (despill only
 * removes MAGENTA — red and blue jointly above green — and this residue is red
 * alone). Cutting more of the alpha ramp instead of trying to correct it is the
 * right trade for hairline art: a hair thinner beats a coloured halo.
 */
const T0_BY_SLUG = {};
// robotic-arm was tried at 70 and reverted. Its red outline is NOT a keying
// artifact — the generator baked a warm rim light onto the blue arm, in spite of a
// `--no colored rim light` negative. Raising the threshold only ate real pixels and
// left the rim, because the rim is the art. Regenerate that piece to fix it.

for (const [src, slug, shape] of MAP) {
  const T0 = T0_BY_SLUG[slug] ?? T0_DEFAULT;
  const im = await loadImage(`${D}/${src}.png`);
  const W = im.width, H = im.height;
  const c = createCanvas(W, H), g = c.getContext("2d");
  g.drawImage(im, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data;

  // Backdrop = median of a border ring, so one stray pixel cannot skew it.
  const samples = [];
  for (let x = 0; x < W; x += 7) for (const y of [2, 3, H - 3, H - 4]) {
    const k = (y * W + x) * 4; samples.push([d[k], d[k + 1], d[k + 2]]);
  }
  for (let y = 0; y < H; y += 7) for (const x of [2, 3, W - 3, W - 4]) {
    const k = (y * W + x) * 4; samples.push([d[k], d[k + 1], d[k + 2]]);
  }
  const med = (k) => { const v = samples.map((s) => s[k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const BG = [med(0), med(1), med(2)], bgC = chroma(...BG);

  for (let i = 0; i < d.length; i += 4) {
    const dc = dist(chroma(d[i], d[i + 1], d[i + 2]), bgC);
    let a = Math.max(0, Math.min(1, (dc - T0) / (T1 - T0)));
    // A soft cast shadow is the backdrop hue at lower brightness, so it survives the
    // ramp as a coloured smudge. Real art edges leave the backdrop's chroma fast.
    if (a < 0.7 && dc < T0 * 1.9) a = 0;
    if (a === 0) { d[i + 3] = 0; continue; }
    if (a < 1) {
      for (let k = 0; k < 3; k++) {
        d[i + k] = Math.max(0, Math.min(255, (d[i + k] - (1 - a) * BG[k]) / a));
      }
      // DESPILL. Un-multiplying divides by alpha, so at low alpha it amplifies any
      // error in the backdrop estimate and leaves a coloured rim. Measured on the
      // blue robot arm: 69.6% of its partial pixels came out magenta at mean
      // (123,51,113) even after a correct de-matte.
      //
      // Magenta is the ONE hue where red and blue are both high while green is low,
      // so the magenta content of a pixel is exactly how much red and blue jointly
      // exceed green. Subtracting that leaves pure red (blue not elevated) and pure
      // blue (red not elevated) untouched — which matters here, because the set
      // contains an orange flame and a blue robot and neither may be desaturated.
      const excess = Math.min(d[i] - d[i + 1], d[i + 2] - d[i + 1]);
      if (excess > 0) {
        d[i] = Math.max(0, d[i] - excess);
        d[i + 2] = Math.max(0, d[i + 2] - excess);
      }
    }
    d[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);

  // Trim by ROW/COLUMN OCCUPANCY, not any single pixel: a few solid survivors at the
  // frame edge would otherwise pin the box to the whole canvas and the trim would
  // silently do nothing.
  const MIN_RUN = Math.max(4, Math.round(Math.min(W, H) * 0.004));
  const rowN = new Array(H).fill(0), colN = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[((y * W + x) << 2) + 3] > 96) { rowN[y]++; colN[x]++; }
  }
  const first = (a) => a.findIndex((v) => v >= MIN_RUN);
  const last = (a) => { for (let i = a.length - 1; i >= 0; i--) if (a[i] >= MIN_RUN) return i; return -1; };
  const y0 = first(rowN), y1 = last(rowN), x0 = first(colN), x1 = last(colN);
  if (x1 < x0 || y1 < y0) { console.log(`${slug}: EMPTY after key — skipped`); continue; }

  // Re-pad to the piece's TARGET aspect (1:1 or 1:2) around the art's centre, so the
  // renderer's contain-fit has nothing left to letterbox.
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const targetAR = shape === "po" ? 0.5 : 1;
  let tw = bw, th = bh;
  if (bw / bh > targetAR) th = Math.round(bw / targetAR); else tw = Math.round(bh * targetAR);
  const t = createCanvas(tw, th), tg = t.getContext("2d");
  tg.drawImage(c, x0, y0, bw, bh, (tw - bw) / 2, (th - bh) / 2, bw, bh);
  writeFileSync(`${OUT}/${slug}.png`, t.toBuffer("image/png"));
  console.log(`${slug.padEnd(15)} ${shape}  ${W}x${H} -> ${tw}x${th}  (art ${bw}x${bh})`);
}
