// ─── eufyMake E1 print-sheet renderer (SERVER) ──────────────
//
// The auto-attach path: at fulfillment we render the eufyMake print sheet(s)
// server-side from the order's SAVED design JSON and attach the PNG(s) to the
// production email — so Bill gets ONE print-ready file (tiles + banners) with
// zero clicks, on both mobile and desktop orders.
//
// CONSOLIDATED sheet: tiles laid on the jig pockets PLUS the design's banners in
// the bottom-right corner (see planEufySheets in eufy-print-core.ts for the
// geometry). Banner artwork is the SAME font-perfect PNG the customer saw —
// rendered client-side at checkout and stored in the order draft — so we just
// composite it here (no need to vendor the ~25 banner fonts server-side).
//
// Mirrors the browser renderer (eufy-print.ts): same jig geometry, same shared
// layout/queue/pHYs logic, transparent background (alpha drives the white
// underbase) — but draws with @napi-rs/canvas and loads tile artwork from the
// filesystem (local /tiles/...) or over HTTP (remote-CDN art).
//
// SERVER-ONLY: imports `fs`/`path` and a native module. Never import from client.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";

import { jigPocketCount, EUFY_JIG_3X12, type EufyJigConfig } from "@/config/eufy-jig";
import { buildPrintQueue, planEufySheets, setPngDpi, type EufyPrintResult } from "@/lib/utils/eufy-print-core";
import type { NamedImage } from "@/lib/email-production";
import type { PlacedTile, PlacedTextBar } from "@/lib/types";

/** The design fields the print sheet needs (a subset of the saved design JSON). */
interface PrintableDesign {
  slots?: Record<string, PlacedTile>;
  textBars?: PlacedTextBar[];
}

/**
 * Fetch a tile's artwork as raw bytes. Three sources cover every tile:
 *   • local public asset ("/tiles/july4/eagle.png") → read from public/ on disk,
 *   • remote CDN art ("https://…/twemoji/…svg") → fetch over HTTP,
 *   • inline data URL → decode base64.
 * Returns null on any failure so one bad tile can't kill the whole sheet.
 */
async function loadArtworkBuffer(url: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//i.test(url)) {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    }
    if (url.startsWith("data:")) {
      const m = /^data:[^;]+;base64,(.+)$/.exec(url);
      return m ? Buffer.from(m[1], "base64") : null;
    }
    // Local public asset. Strip a leading slash and resolve under public/.
    const rel = url.replace(/^\/+/, "");
    return await fs.readFile(path.join(process.cwd(), "public", rel));
  } catch {
    return null;
  }
}

/** Decode a base64 data URL (a client-rendered banner PNG) into an Image. */
async function loadDataUrlImage(dataUrl: string): Promise<Image | null> {
  const m = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  try {
    return await loadImage(Buffer.from(m[1], "base64"));
  } catch {
    return null;
  }
}

// Draw an image to cover a square dest rect (object-fit: cover, centered).
function drawCover(ctx: SKRSContext2D, img: Image, x: number, y: number, w: number, h: number) {
  const iw = img.width, ih = img.height;
  if (!iw || !ih) return;
  const destRatio = w / h, imgRatio = iw / ih;
  let cw: number, ch: number;
  if (imgRatio > destRatio) { ch = h; cw = h * imgRatio; }
  else { cw = w; ch = w / imgRatio; }
  ctx.drawImage(img, x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
}

/**
 * Render a saved design into ONE consolidated eufyMake sheet (server-side):
 * tiles on the jig pockets + the design's banners in the bottom-right. `banners`
 * are the client-rendered banner PNGs from the order draft (artifacts.banners),
 * matched to the design's text bars by name. Returns empty sheets (never throws)
 * when there's nothing printable. Defaults to the 3×12 production tray.
 */
export async function composeEufyPrintSheetsServer(
  design: PrintableDesign | null | undefined,
  banners: NamedImage[] = [],
  jig: EufyJigConfig = EUFY_JIG_3X12,
): Promise<EufyPrintResult> {
  const empty: EufyPrintResult = { sheets: [], pocketsPerSheet: jigPocketCount(jig), printedTiles: 0, skippedBlankTiles: 0, bannerCount: 0 };
  const slots = design?.slots ?? {};
  const textBars = design?.textBars ?? [];

  const { queue, skippedBlankTiles } = buildPrintQueue(slots, textBars);

  // Match each text bar to its client-rendered banner PNG (by the artifact name
  // Designer.tsx stamps: `banner-${row}-${startIndex}`), preserving bar order.
  const bannerEntries: Array<{ widthUnits: number; dataUrl: string }> = [];
  for (const bar of textBars) {
    const img = banners.find((b) => b.name === `banner-${bar.row}-${bar.startIndex}`);
    if (img) bannerEntries.push({ widthUnits: bar.widthUnits, dataUrl: img.dataUrl });
  }

  if (queue.length === 0 && bannerEntries.length === 0) return { ...empty, skippedBlankTiles };

  const planned = planEufySheets(queue, bannerEntries.map((e) => e.widthUnits), jig);

  // Preload each distinct tile artwork once (fills need no image) + every banner.
  const loadedArt = new Map<string, Image | null>();
  const artUrls = [...new Set(queue.flatMap((q) => (q.kind === "art" ? [q.url] : [])))];
  const bannerImgs = await Promise.all(bannerEntries.map((e) => loadDataUrlImage(e.dataUrl)));
  await Promise.all(
    artUrls.map(async (u) => {
      const buf = await loadArtworkBuffer(u);
      loadedArt.set(u, buf ? await loadImage(buf).catch(() => null) : null);
    }),
  );

  const W = Math.round(jig.sheetWidthInches * jig.dpi);
  const H = Math.round(jig.sheetHeightInches * jig.dpi);

  const sheets: string[] = [];
  for (const sheet of planned) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    // No background fill — transparency drives the white underbase.
    for (const t of sheet.tiles) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(t.x, t.y, t.size, t.size); // clip to the square face
      ctx.clip();
      if (t.item.kind === "art") {
        const img = loadedArt.get(t.item.url);
        if (img) drawCover(ctx, img, t.x, t.y, t.size, t.size);
      } else {
        ctx.fillStyle = t.item.color;
        ctx.fillRect(t.x, t.y, t.size, t.size);
      }
      ctx.restore();
    }
    // Banners: composite the client-rendered PNG into its planned rect (its
    // widthUnits:1 aspect matches the rect, so no distortion).
    for (const b of sheet.banners) {
      const img = bannerImgs[b.bannerIndex];
      if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
    }
    const dataUrl = "data:image/png;base64," + canvas.toBuffer("image/png").toString("base64");
    sheets.push(setPngDpi(dataUrl, jig.dpi));
  }

  return {
    sheets,
    pocketsPerSheet: jigPocketCount(jig),
    printedTiles: queue.length,
    skippedBlankTiles,
    bannerCount: bannerImgs.filter(Boolean).length,
  };
}
