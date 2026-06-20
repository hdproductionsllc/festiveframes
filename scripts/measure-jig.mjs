// Measure a eufyMake jig tray from its .AI (PDF-based) file.
//
// Bill's trays export as flattened, page-fit RASTER images embedded in the .AI,
// not editable vectors — so we detect the brown pocket disks in the bitmap,
// cluster them into a row/col grid, and report the layout. The grid's evenness
// (fit residual) is trustworthy; the ABSOLUTE size is not (the image is scaled to
// fit a letter page), so we print the size under two interpretations:
//   1. the file's own letter scale, and
//   2. assuming a known real pitch (pass --pitch=1.06).
// Use #2 with Bill's tape-measured pitch for the real numbers.
//
// Usage:
//   node scripts/measure-jig.mjs "<file.AI>" [--pitch=1.06] [--pocket=0.992]

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/measure-jig.mjs "<file.AI>" [--pitch=IN] [--pocket=IN]');
  process.exit(1);
}
const arg = (name, def) => {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? Number(m.split("=")[1]) : def;
};
const realPitch = arg("pitch", null);
const realPocket = arg("pocket", 0.992);

const raw = readFileSync(file);

// ─── 1. Find the embedded image XObject + its W/H, and inflate its pixels ─────
const head = raw.toString("latin1");
const dict = head.match(/<<[^>]*\/Subtype\s*\/Image[^>]*>>/);
if (!dict) {
  console.error("No embedded image found — this may be a true vector file (different parser needed).");
  process.exit(1);
}
const W = Number(dict[0].match(/\/Width\s+(\d+)/)[1]);
const H = Number(dict[0].match(/\/Height\s+(\d+)/)[1]);
const want = W * H * 3; // DeviceRGB, 8bpc

const STREAM = Buffer.from("stream"), ENDSTREAM = Buffer.from("endstream");
let i = 0, img = null;
while ((i = raw.indexOf(STREAM, i)) !== -1) {
  let s = i + STREAM.length;
  if (raw[s] === 0x0d) s++; if (raw[s] === 0x0a) s++;
  const e = raw.indexOf(ENDSTREAM, s);
  if (e === -1) break;
  try { const inf = inflateSync(raw.subarray(s, e)); if (inf.length === want) { img = inf; break; } } catch { /* not it */ }
  i = e + ENDSTREAM.length;
}
if (!img) { console.error(`Could not inflate the ${W}×${H} RGB image stream.`); process.exit(1); }

// ─── 2. Brown-pocket mask → connected components → disk centers ──────────────
const mask = new Uint8Array(W * H);
for (let p = 0, q = 0; p < img.length; p += 3, q++) {
  const r = img[p], g = img[p + 1], b = img[p + 2];
  if (r > g + 18 && r > b + 18 && Math.abs(g - b) < 34 && r < 200) mask[q] = 1;
}
const lbl = new Int32Array(W * H), blobs = [], st = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const idx = y * W + x;
  if (!mask[idx] || lbl[idx]) continue;
  const id = blobs.length + 1;
  let sx = 0, sy = 0, n = 0, mnx = x, mxx = x, mny = y, mxy = y;
  st.push(idx); lbl[idx] = id;
  while (st.length) {
    const c = st.pop(), cy = (c / W) | 0, cx = c % W;
    sx += cx; sy += cy; n++;
    if (cx < mnx) mnx = cx; if (cx > mxx) mxx = cx; if (cy < mny) mny = cy; if (cy > mxy) mxy = cy;
    if (cx > 0 && mask[c - 1] && !lbl[c - 1]) { lbl[c - 1] = id; st.push(c - 1); }
    if (cx < W - 1 && mask[c + 1] && !lbl[c + 1]) { lbl[c + 1] = id; st.push(c + 1); }
    if (mask[c - W] && !lbl[c - W]) { lbl[c - W] = id; st.push(c - W); }
    if (c + W < W * H && mask[c + W] && !lbl[c + W]) { lbl[c + W] = id; st.push(c + W); }
  }
  blobs.push({ cx: sx / n, cy: sy / n, n, w: mxx - mnx + 1, h: mxy - mny + 1 });
}
// Each pocket draws as a solid disk fill PLUS a thin outline ring at the same
// center. Keep only the solid fills: the larger, denser blobs (fill area is the
// modal *big* size). Use the largest blob (the tray body) excluded by a bbox cap.
const cand = blobs.filter((b) => b.w < 80 && b.h < 80);
const sizes = cand.map((b) => b.n).sort((a, b) => a - b);
const big = sizes[Math.floor(sizes.length * 0.75)]; // upper-quartile size ≈ a fill
const disks = cand.filter((b) => b.n > big * 0.85);

// ─── 3. Cluster into cols/rows, fit + report ─────────────────────────────────
const cluster = (vals, tol) => {
  const s = [...vals].sort((a, b) => a - b), g = [];
  for (const v of s) { const last = g[g.length - 1]; if (last && v - last.m < tol) { last.v.push(v); last.m = last.v.reduce((a, b) => a + b) / last.v.length; } else g.push({ v: [v], m: v }); }
  return g.map((x) => x.m);
};
const diaPx = disks.reduce((a, b) => a + (b.w + b.h) / 2, 0) / disks.length;
const cols = cluster(disks.map((d) => d.cx), diaPx * 0.5);
const rows = cluster(disks.map((d) => d.cy), diaPx * 0.5);
const pitchOf = (a) => { let s = 0; for (let i = 1; i < a.length; i++) s += a[i] - a[i - 1]; return s / (a.length - 1); };
const colP = pitchOf(cols), rowP = pitchOf(rows);
let mr = 0, sr = 0;
for (const d of disks) {
  const nc = cols.reduce((p, x) => Math.abs(x - d.cx) < Math.abs(p - d.cx) ? x : p);
  const nr = rows.reduce((p, y) => Math.abs(y - d.cy) < Math.abs(p - d.cy) ? y : p);
  const r = Math.max(Math.abs(nc - d.cx), Math.abs(nr - d.cy)); mr = Math.max(mr, r); sr += r;
}

console.log(`\n=== ${file} ===`);
console.log(`embedded image: ${W}×${H} px`);
console.log(`pockets: ${disks.length}  grid: ${rows.length} rows × ${cols.length} cols`);
console.log(`pitch: col ${colP.toFixed(2)}px  row ${rowP.toFixed(2)}px  (square ratio ${(colP / rowP).toFixed(4)})`);
console.log(`grid fit residual: max ${mr.toFixed(2)}px  mean ${(sr / disks.length).toFixed(2)}px  (low = evenly spaced)`);

if (realPitch) {
  // Real grid is even+centered → derive everything from the one true pitch.
  const margin = realPocket / 2;
  const colCenters = Array.from({ length: cols.length }, (_, i) => +(margin + i * realPitch).toFixed(4));
  const rowCenters = Array.from({ length: rows.length }, (_, j) => +(margin + j * realPitch).toFixed(4));
  const sheetW = +(2 * margin + (cols.length - 1) * realPitch).toFixed(4);
  const sheetH = +(2 * margin + (rows.length - 1) * realPitch).toFixed(4);
  console.log(`\n--- paste-ready @ pitch=${realPitch}", pocket=${realPocket}" (top-left origin) ---`);
  console.log(`sheetWidthInches: ${sheetW},`);
  console.log(`sheetHeightInches: ${sheetH},`);
  console.log(`colCentersInches: ${JSON.stringify(colCenters)},`);
  console.log(`rowCentersInches: ${JSON.stringify(rowCenters)},`);
} else {
  console.log(`\n(no --pitch given) at the file's letter scale: col pitch ${(colP * 11 / W).toFixed(3)}in — likely a thumbnail, pass --pitch=<real> for true numbers.`);
}
console.log("");
