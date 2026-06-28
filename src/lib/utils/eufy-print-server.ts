// ─── eufyMake E1 print-sheet renderer (SERVER) ──────────────
//
// The auto-attach path: at fulfillment we render the eufyMake print sheet(s)
// server-side from the order's SAVED design JSON and attach the PNG(s) to the
// production email — so Bill gets a print-ready file with zero clicks, on both
// mobile and desktop orders.
//
// Mirrors the browser renderer (eufy-print.ts) exactly — same jig geometry, same
// transparent-background (alpha drives the white underbase), same shared
// queue/pHYs logic from eufy-print-core.ts — but draws with @napi-rs/canvas
// (prebuilt native canvas, no system deps) and loads artwork from the filesystem
// (local /tiles/... assets) or over HTTP (remote-CDN art) instead of the DOM.
//
// SERVER-ONLY: imports `fs`/`path` and a native module. Never import from client.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";

import { jigPocketCenters, jigPocketCount, EUFY_JIG_3X12, type EufyJigConfig } from "@/config/eufy-jig";
import { buildPrintQueue, setPngDpi, type EufyPrintResult } from "@/lib/utils/eufy-print-core";
import type { PlacedTile, PlacedTextBar } from "@/lib/types";

/** The design fields the print sheet needs (a subset of the saved design JSON). */
interface PrintableDesign {
  slots?: Record<string, PlacedTile>;
  textBars?: PlacedTextBar[];
}

/**
 * Fetch a tile's artwork as raw bytes. Three sources cover every tile:
 *   • local public asset ("/tiles/july4/eagle.png") → read from public/ on disk
 *     (no self-HTTP round-trip; works before the server is even listening),
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
 * Render a saved design into eufyMake print sheets (server-side). Same output as
 * the browser renderer: transparent PNG(s) at the jig's DPI, tiles batched by
 * set+quantity in reading order, paginated past one jig load. Defaults to the
 * 3×12 production tray. Returns empty sheets (never throws) when there's nothing
 * printable, so the caller can fall back cleanly.
 */
export async function composeEufyPrintSheetsServer(
  design: PrintableDesign | null | undefined,
  jig: EufyJigConfig = EUFY_JIG_3X12,
): Promise<EufyPrintResult> {
  const empty: EufyPrintResult = { sheets: [], pocketsPerSheet: jigPocketCount(jig), printedTiles: 0, skippedBlankTiles: 0 };
  const slots = design?.slots ?? {};
  const textBars = design?.textBars ?? [];
  if (Object.keys(slots).length === 0) return empty;

  const { queue, skippedBlankTiles } = buildPrintQueue(slots, textBars);
  if (queue.length === 0) return { ...empty, skippedBlankTiles };

  // Preload each distinct artwork once (fills need no image).
  const loaded = new Map<string, Image | null>();
  const artUrls = [...new Set(queue.flatMap((q) => (q.kind === "art" ? [q.url] : [])))];
  await Promise.all(
    artUrls.map(async (u) => {
      const buf = await loadArtworkBuffer(u);
      loaded.set(u, buf ? await loadImage(buf).catch(() => null) : null);
    }),
  );

  const centers = jigPocketCenters(jig);
  const perSheet = centers.length;

  const W = Math.round(jig.sheetWidthInches * jig.dpi);
  const H = Math.round(jig.sheetHeightInches * jig.dpi);
  const face = jig.tileFaceInches * jig.dpi;

  const sheets: string[] = [];
  for (let start = 0; start < queue.length; start += perSheet) {
    const chunk = queue.slice(start, start + perSheet);
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    // No background fill — transparency drives the white underbase.
    chunk.forEach((item, i) => {
      const { xIn, yIn } = centers[i];
      const x = xIn * jig.dpi - face / 2;
      const y = yIn * jig.dpi - face / 2;
      // Clip to the pure square face so overflow can't bleed into a neighbour.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, face, face);
      ctx.clip();
      if (item.kind === "art") {
        const img = loaded.get(item.url);
        if (img) drawCover(ctx, img, x, y, face, face);
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, face, face);
      }
      ctx.restore();
    });
    const dataUrl = "data:image/png;base64," + canvas.toBuffer("image/png").toString("base64");
    sheets.push(setPngDpi(dataUrl, jig.dpi));
  }

  return { sheets, pocketsPerSheet: perSheet, printedTiles: queue.length, skippedBlankTiles };
}
