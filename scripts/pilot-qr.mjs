#!/usr/bin/env node
// ─── Pilot QR codes: one per pilot school, for Bill to print and hand out ─────
//
//   node scripts/pilot-qr.mjs [outDir]
//
// Default outDir: C:\Users\david\Documents\MySchoolFrame Pilot Kit\qr
//
// For every pilot school it writes:
//   <slug>.svg        vector QR (error correction H, 4-module quiet zone)
//   <slug>.png        raster QR, >= 1200 px, whole-pixel modules, 300 dpi
//   <slug>-card.png   4 x 6 in portrait hand-out card at 300 dpi (1200 x 1800)
//
// THE URL: https://www.myschoolframe.com/s/<slug>. www is the host the site names
// as canonical (the Organization @id in app/school/page.tsx), and it serves the
// builder with 200 and no redirect, so a scan is one hop. The card PRINTS the
// shorter apex form (myschoolframe.com/s/<slug>) for anyone typing it by hand;
// that also answers 200 with no redirect.
//
// Plain node on purpose: the school list is inline below, not imported from
// data/school-kits.ts (TypeScript). If a pilot kit's name, mascot or colours
// change there, change them here too — `src/data/pilot-qr.sync.test.ts` fails
// until you do (it caught the pre-measurement colours still here on 2026-09-23).

import QRCode from "qrcode";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? "C:\\Users\\david\\Documents\\MySchoolFrame Pilot Kit\\qr");

const SCAN_BASE = "https://www.myschoolframe.com/s/";
const PRINT_BASE = "myschoolframe.com/s/";

/** Pilot order, as in PILOT_SCHOOL_SLUGS. Colours are the kits' `colors.frame` /
 *  `colors.rim`, measured from each school's own artwork (see each colorSource). */
const SCHOOLS = [
  { slug: "marquette-mustangs", name: "Marquette High School", mascot: "Mustangs", frame: "#0D293F", rim: "#068950" },
  { slug: "eureka-wildcats", name: "Eureka High School", mascot: "Wildcats", frame: "#462E8D", rim: "#FFCC00" },
  { slug: "lafayette-lancers", name: "Lafayette High School", mascot: "Lancers", frame: "#231F20", rim: "#FFCC00" },
  { slug: "parkway-west-longhorns", name: "Parkway West High School", mascot: "Longhorns", frame: "#5199CD", rim: "#A40925" },
  { slug: "parkway-central-colts", name: "Parkway Central High School", mascot: "Colts", frame: "#AB1E38", rim: "#FFFFFF" },
  { slug: "ladue-rams", name: "Ladue Horton Watkins High School", mascot: "Rams", frame: "#00599C", rim: "#FFFFFF" },
];

const ECL = "H"; // survives ~30% damage: a crease, a thumb, a coffee ring
const QUIET = 4; // modules of white margin, the spec minimum
const MIN_PX = 1200;
const DPI = 300;
const INK = "#111111"; // modules stay near-black on every card; colour goes in the accents
const NAVY = "#1B2A4A";

GlobalFonts.registerFromPath(join(REPO, "public", "fonts", "graduate.ttf"), "Graduate");
GlobalFonts.registerFromPath(join(REPO, "public", "fonts", "oswald-latin.woff2"), "Oswald");

/** Paint the QR matrix at a whole number of px per module, quiet zone included.
 *  Returns the side length drawn. */
function drawQr(ctx, qr, x, y, modulePx) {
  const n = qr.modules.size;
  const side = (n + 2 * QUIET) * modulePx;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, side, side);
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(x + (c + QUIET) * modulePx, y + (r + QUIET) * modulePx, modulePx, modulePx);
    }
  }
  return side;
}

/** Largest font size (<= max) at which `text` fits `width`. */
function fitFont(ctx, text, family, weight, max, width) {
  for (let px = max; px > 10; px -= 2) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= width) return px;
  }
  return 10;
}

/** `hex` scaled toward black, in 2% steps, until white on it reaches `ratio`. */
function deepenForWhite(hex, ratio) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let k = 1; k > 0; k -= 0.02) {
    const out = "#" + rgb.map((c) => Math.round(c * k).toString(16).padStart(2, "0")).join("");
    if (contrastOnWhite(out) >= ratio) return out;
  }
  return "#000000";
}

/** WCAG contrast of `hex` against white. */
function contrastOnWhite(hex) {
  return 1.05 / (luminance(hex) + 0.05);
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function png(canvas, path) {
  const buf = await sharp(canvas.toBuffer("image/png")).withMetadata({ density: DPI }).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path, buf);
}

async function writeStandalone(school, url, qr) {
  const n = qr.modules.size + 2 * QUIET;
  const modulePx = Math.ceil(MIN_PX / n);
  const side = n * modulePx;
  const canvas = createCanvas(side, side);
  drawQr(canvas.getContext("2d"), qr, 0, 0, modulePx);
  await png(canvas, join(OUT, `${school.slug}.png`));

  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: ECL, version: qr.version, margin: QUIET, color: { dark: INK, light: "#FFFFFF" } });
  await writeFile(join(OUT, `${school.slug}.svg`), svg);
  return side;
}

async function writeCard(school, qr, lockup) {
  const W = 4 * DPI; // 1200
  const H = 6 * DPI; // 1800
  const SAFE = 60; // 0.2 in: nothing that matters sits nearer the trim than this
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Header band in the school's frame colour, edged with its rim colour. A white
  // rim is invisible on a white card, so it sits between band and a thin second
  // frame-colour rule, where it reads.
  // The band carries WHITE type, so it is the school colour taken just deep
  // enough for 4.5:1 — Parkway West's #5199CD is 3.2:1 as it stands. Same hue,
  // derived per school; a colour that already clears it is used unchanged.
  const band = deepenForWhite(school.frame, 4.5);
  const bandH = 300;
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, bandH);
  ctx.fillStyle = school.rim;
  ctx.fillRect(0, bandH, W, 14);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandH + 14, W, 6);

  ctx.fillStyle = "#FFFFFF";
  // Not "PROUD PARENT": the samples sell Senior and Grandparent frames too.
  const eyebrow = "SCHOOL PRIDE FRAME";
  fitFont(ctx, eyebrow, "Oswald", 500, 38, W - 2 * SAFE);
  ctx.globalAlpha = 0.82;
  ctx.fillText(eyebrow.split("").join("\u200A"), W / 2, 108);
  ctx.globalAlpha = 1;
  const title = school.name.toUpperCase();
  // 85% of the card, not trim-to-trim minus the safe margin: a name that ran
  // nearly edge to edge is one print-shop trim away from clipping.
  fitFont(ctx, title, "Oswald", 600, 96, Math.round(W * 0.85));
  ctx.fillText(title, W / 2, 226);

  // The QR: as large as the layout allows, whole-pixel modules.
  const n = qr.modules.size + 2 * QUIET;
  // 880 px (2.9 in) leaves the logo room at the foot; still far above any scan limit.
  const modulePx = Math.floor(880 / n);
  const side = n * modulePx;
  const qx = Math.round((W - side) / 2);
  const qy = 372;
  // A frame-colour keyline outside the quiet zone, echoing a plate frame.
  const pad = 18;
  ctx.strokeStyle = school.frame;
  ctx.lineWidth = 10;
  roundRect(ctx, qx - pad, qy - pad, side + 2 * pad, side + 2 * pad, 36);
  ctx.stroke();
  drawQr(ctx, qr, qx, qy, modulePx);

  // The QR box sits at ONE size on every card (every school is encoded at the same
  // QR version — see below), so everything under it lands at the same place and
  // the six cards match side by side on a table.
  let y = qy + side + pad + 120;
  // The call to action is set in the school colour only where it READS on white:
  // Parkway West's light blue is ~3:1 and went washed out at arm's length, so it
  // falls to the rim (the school's red), then to navy.
  ctx.fillStyle = [school.frame, school.rim].find((c) => contrastOnWhite(c) >= 4.5) ?? NAVY;
  const cta = `Design your ${school.mascot} frame`;
  fitFont(ctx, cta, "Graduate", 400, 76, W - 2 * SAFE);
  ctx.fillText(cta, W / 2, y);

  y += 70;
  ctx.fillStyle = "#5A6272";
  ctx.font = "400 38px Oswald";
  ctx.fillText("Scan with your phone camera, or type", W / 2, y);

  y += 72;
  ctx.fillStyle = NAVY;
  const shortUrl = PRINT_BASE + school.slug;
  fitFont(ctx, shortUrl, "Oswald", 600, 60, W - 2 * SAFE);
  ctx.fillText(shortUrl, W / 2, y);

  // The MySchoolFrame logo (the owner's 3D version — this card is white), bottom
  // centre, filling what the text above leaves, never nearer the trim than SAFE.
  const lh = Math.min(230, H - SAFE - (y + 44));
  const lw = Math.round((lockup.width / lockup.height) * lh);
  ctx.drawImage(lockup, Math.round((W - lw) / 2), H - SAFE - lh, lw, lh);

  await png(canvas, join(OUT, `${school.slug}-card.png`));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

await mkdir(OUT, { recursive: true });
const lockup = await loadImage(join(REPO, "public", "brand", "msf-logo-3d.webp"));
// Every card at the SAME QR version: the longest URL decides it, and a shorter one
// is simply encoded with room to spare. Mixed versions made Ladue's box (v5) a
// different size from the rest (v6), and the whole card below it shifted.
const version = Math.max(...SCHOOLS.map((s) => QRCode.create(SCAN_BASE + s.slug, { errorCorrectionLevel: ECL }).version));
for (const school of SCHOOLS) {
  const url = SCAN_BASE + school.slug;
  const qr = QRCode.create(url, { errorCorrectionLevel: ECL, version });
  const side = await writeStandalone(school, url, qr);
  await writeCard(school, qr, lockup);
  console.log(`${school.slug.padEnd(24)} v${qr.version} ${qr.modules.size}x${qr.modules.size}  png ${side}px  ${url}`);
}
console.log(`\nwrote ${SCHOOLS.length * 3} files to ${OUT}`);
