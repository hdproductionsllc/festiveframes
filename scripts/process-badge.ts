// ─── Turn generated badge candidates into shippable badge art ─────────────────
//
//   npx vite-node scripts/process-badge.ts <name> [<name> ...]
//
// For every scripts/out/<name>-<n>.png that scripts/gen-badge.mjs wrote:
//   1. key the magenta backdrop with the APP's adaptive keyer
//      (src/lib/utils/key-background.ts — Gemini lights its backdrop, so the batch
//      keyer's flatness gate would refuse it; see gen-badge.mjs's header);
//   2. REFUSE a candidate whose ink touches the image edge. That is the check that
//      would have caught the palette with its brush tips sliced off (2026-09-27):
//      art cut in the source reads on the frame as clipped by the badge, and no
//      fitting can restore it. Complete art keeps a margin until we trim it;
//   2b. despill: the outline's magenta reflection (a pink hairline on every gold
//      rim) takes the nearest clean colour; any spill left refuses the candidate;
//   3. trim to the ink, pad to a centred transparent square (the badge rule);
//   4. the print gate: at least 595 px on the long side (2x2 at 300 DPI);
//   5. write scripts/out/processed/<name>-<n>.png and a review sheet
//      scripts/out/processed/<name>-sheet.png — each candidate on navy at badge
//      size and at 100 px, the ONE-INCH TEST, which is judged by eye, always.
//
// Nothing here replaces a file under public/. Choosing the winner and copying it in
// is a person's decision (then: `npm run art:fit`, and scripts/light-enamel.mjs for
// a navy-enamel badge's ivory twin).

import { readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { keyBackground } from "../src/lib/utils/key-background";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "scripts/out");
const DONE = path.join(OUT, "processed");
const PRINT_MIN = 595;
const NAVY = "#1b3a6b";
mkdirSync(DONE, { recursive: true });

async function processOne(file: string): Promise<{ file: string; ok: boolean; why: string; out?: string }> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const img = { data: new Uint8ClampedArray(data), width: info.width, height: info.height };
  // keyEnclosed: magenta is never in the art, so the inside of a ring is backdrop too
  // (without it the gymnastics rings kept solid magenta centres, 2026-09-27).
  const report = keyBackground(img, { keyEnclosed: true });
  if (!report.keyed) return { file, ok: false, why: `not keyed (${report.reason}, flatness ${report.flatness.toFixed(2)})` };

  // 2. Complete art only: no ink on the outermost pixel ring.
  const W = img.width, H = img.height;
  const ink = (x: number, y: number) => img.data[(y * W + x) * 4 + 3] > 24;
  let touching = 0;
  for (let x = 0; x < W; x++) touching += +ink(x, 0) + +ink(x, H - 1);
  for (let y = 0; y < H; y++) touching += +ink(0, y) + +ink(W - 1, y);
  if (touching > 0) return { file, ok: false, why: `art touches the image edge (${touching} px) — cut in the source` };

  // 2b. Magenta SPILL at the silhouette. Polished gold reflects the lit magenta
  // sweep, so the outermost pixel or two of every metal rim came out pink — too
  // opaque for the keyer to unmix, invisible at a glance, and a rosy hairline in
  // print (found 2026-09-27 on every Gemini badge; the older library has none).
  // Within EDGE px of the outline, a pixel whose red AND blue both stand above its
  // green is spill — gold (b < g), navy (r < g), red, green, skin and white never
  // are — and it takes the colour of the nearest clean opaque pixel, keeping its
  // own alpha, so the edge stays smooth and turns gold.
  const despilled = despill(img);
  const left = spillAtEdge(img);
  if (left > 0) return { file, ok: false, why: `${left} px of magenta spill left at the edge after despill` };

  // 3. Trim to the ink, then pad to a centred square.
  const keyed = sharp(Buffer.from(img.data.buffer), { raw: { width: W, height: H, channels: 4 } });
  const trimmed = await keyed.png().toBuffer().then((b) => sharp(b).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true }));
  const side = Math.max(trimmed.info.width, trimmed.info.height);
  // 4. The print gate.
  if (side < PRINT_MIN) return { file, ok: false, why: `too small for print (${side} px < ${PRINT_MIN})` };
  const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed.data, left: Math.floor((side - trimmed.info.width) / 2), top: Math.floor((side - trimmed.info.height) / 2) }])
    .png()
    .toBuffer();
  const out = path.join(DONE, path.basename(file));
  await sharp(square).toFile(out);
  return { file, ok: true, why: `${side}px square, backdrop ${report.backdrop}, flatness ${report.flatness.toFixed(3)}, despilled ${despilled} px`, out };
}

type Img = { data: Uint8ClampedArray; width: number; height: number };
const EDGE = 8;
const REACH = 6;
const spilled = (d: Uint8ClampedArray, i: number) => Math.min(d[i], d[i + 2]) > d[i + 1] + 5;

/** Per pixel: true when a transparent pixel lies within EDGE (square window). */
function edgeBand({ data, width: W, height: H }: Img): Uint8Array {
  const clear = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) clear[p] = data[p * 4 + 3] < 20 ? 1 : 0;
  // Separable dilation: rows, then columns.
  const rows = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let hit = 0;
      for (let k = Math.max(0, x - EDGE); k <= Math.min(W - 1, x + EDGE) && !hit; k++) hit = clear[y * W + k];
      rows[y * W + x] = hit;
    }
  const band = new Uint8Array(W * H);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      let hit = 0;
      for (let k = Math.max(0, y - EDGE); k <= Math.min(H - 1, y + EDGE) && !hit; k++) hit = rows[k * W + x];
      band[y * W + x] = hit;
    }
  return band;
}

function despill(img: Img): number {
  const { data, width: W, height: H } = img;
  const band = edgeBand(img);
  const src = new Uint8ClampedArray(data);
  let n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x, i = p * 4;
      if (!band[p] || src[i + 3] < 20 || !spilled(src, i)) continue;
      let best = -1, bd = Infinity;
      for (let dy = -REACH; dy <= REACH; dy++)
        for (let dx = -REACH; dx <= REACH; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const j = (yy * W + xx) * 4;
          if (src[j + 3] > 230 && !spilled(src, j) && dx * dx + dy * dy < bd) {
            bd = dx * dx + dy * dy;
            best = j;
          }
        }
      if (best < 0) continue;
      data[i] = src[best];
      data[i + 1] = src[best + 1];
      data[i + 2] = src[best + 2];
      n++;
    }
  return n;
}

/** Spill still visible at the outline (alpha >= 40) after despill — must be 0. */
function spillAtEdge(img: Img): number {
  const band = edgeBand(img);
  let n = 0;
  for (let p = 0; p < img.width * img.height; p++) if (band[p] && img.data[p * 4 + 3] >= 40 && spilled(img.data, p * 4)) n++;
  return n;
}

async function sheet(name: string, outs: string[]): Promise<string | null> {
  if (!outs.length) return null;
  const BIG = 320, SMALL = 100, PAD = 20;
  const cellW = BIG + SMALL + PAD * 3, cellH = BIG + PAD * 2;
  const cells = await Promise.all(
    outs.map(async (f) => {
      const big = await sharp(f).resize(BIG - 24, BIG - 24, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
      const small = await sharp(f).resize(SMALL - 8, SMALL - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cellW}" height="${cellH}"><rect x="${PAD}" y="${PAD}" width="${BIG}" height="${BIG}" rx="18" fill="none" stroke="#e8e2d0" stroke-width="4"/><text x="${PAD + BIG + PAD}" y="${PAD + SMALL + 24}" font-family="Arial" font-size="14" fill="#fff">${path.basename(f, ".png")}</text><text x="${PAD + BIG + PAD}" y="${PAD + SMALL + 44}" font-family="Arial" font-size="12" fill="#c9d3e3">one-inch test</text></svg>`);
      return sharp({ create: { width: cellW, height: cellH, channels: 4, background: NAVY } })
        .composite([
          { input: big, left: PAD + 12, top: PAD + 12 },
          { input: small, left: PAD * 2 + BIG + 4, top: PAD + 4 },
          { input: label, left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
    }),
  );
  const file = path.join(DONE, `${name}-sheet.png`);
  await sharp({ create: { width: cellW, height: cellH * cells.length, channels: 4, background: "#0b1a33" } })
    .composite(cells.map((c, i) => ({ input: c, left: 0, top: i * cellH })))
    .png()
    .toFile(file);
  return file;
}

const names = process.argv.slice(2);
if (!names.length) {
  console.error("usage: npx vite-node scripts/process-badge.ts <name> [<name> ...]");
  process.exit(1);
}
for (const name of names) {
  const files = readdirSync(OUT)
    .filter((f) => new RegExp(`^${name}-\\d+\\.png$`).test(f))
    .map((f) => path.join(OUT, f));
  const results = [];
  for (const f of files) results.push(await processOne(f));
  for (const r of results) console.log(`${r.ok ? "OK  " : "SKIP"} ${path.basename(r.file)} — ${r.why}`);
  const s = await sheet(name, results.filter((r) => r.ok).map((r) => r.out!));
  console.log(s ? `review sheet: ${s}` : `${name}: no candidate passed`);
}
