import { useDesignStore } from "@/stores/design-store";
import { jigPocketCount, EUFY_JIG, type EufyJigConfig } from "@/config/eufy-jig";
import { buildPrintQueue, planEufySheets, setPngDpi, type EufyPrintResult } from "@/lib/utils/eufy-print-core";
import { composeBarImage } from "@/lib/utils/compose-frame";

// ─── eufyMake E1 print-sheet renderer (BROWSER) ─────────────
//
// The operator's desktop "download print sheet" path. Second render target of
// the same design data as compose-frame.ts: instead of the on-screen frame
// mockup, this lays each placed tile's artwork onto the physical jig grid (see
// src/config/eufy-jig.ts) and exports a transparent, print-ready PNG per jig
// load. Transparent background is intentional: the eufyMake E1 derives its
// white-ink underbase from the artwork's alpha.
//
// The "WHAT gets printed" logic (queue building, white-snappet skip, pHYs DPI
// tagging) lives in eufy-print-core.ts so this and the SERVER renderer
// (eufy-print-server.ts, auto-attached at fulfillment) can never drift.

export type { EufyPrintResult } from "@/lib/utils/eufy-print-core";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Request CORS so remote-CDN artwork (non-July4 sets) doesn't taint the
    // canvas — a tainted canvas makes toDataURL() throw, killing the print sheet.
    // The CDN serves permissive CORS headers; same-origin tiles ignore this.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Draw an image to cover a square dest rect (object-fit: cover, centered).
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const destRatio = w / h, imgRatio = iw / ih;
  let cw: number, ch: number;
  if (imgRatio > destRatio) { ch = h; cw = h * imgRatio; }
  else { cw = w; ch = w / imgRatio; }
  ctx.drawImage(img, x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
}

// iOS Safari caps <canvas> at ~16.7M px and ~4096 px per side; a high-DPI sheet
// can exceed that and silently render blank. Probe the real target size: draw a
// test pixel and read it back — if it didn't draw, this device can't handle a
// canvas this big (so we refuse instead of degrading).
function canvasSupportsSize(w: number, h: number): boolean {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, 4, 4);
  try {
    return ctx.getImageData(1, 1, 1, 1).data[0] > 200;
  } catch {
    return false;
  }
}

/**
 * Render the current design into ONE consolidated eufyMake sheet: tiles on the
 * jig pockets (batched by set+quantity — pocket position is meaningless, sort by
 * hand) PLUS the design's banners in the bottom-right (see planEufySheets).
 * Excess tiles paginate onto plain pocket-grid sheets after sheet 1.
 */
export async function composeEufyPrintSheets(jig: EufyJigConfig = EUFY_JIG): Promise<EufyPrintResult> {
  const empty: EufyPrintResult = { sheets: [], pocketsPerSheet: jigPocketCount(jig), printedTiles: 0, skippedBlankTiles: 0, bannerCount: 0 };
  if (typeof document === "undefined") return empty;

  const { slots, textBars } = useDesignStore.getState();
  const { queue, skippedBlankTiles } = buildPrintQueue(slots, textBars);

  // Render each banner to a font-perfect PNG (the same renderer the proof uses),
  // in bar order, so the layout planner and the draw loop agree on banner index.
  const bannerEntries: Array<{ widthUnits: number; img: HTMLImageElement | null }> = [];
  for (const bar of textBars) {
    const dataUrl = await composeBarImage(bar.id);
    bannerEntries.push({ widthUnits: bar.widthUnits, img: dataUrl ? await loadImage(dataUrl) : null });
  }

  if (queue.length === 0 && bannerEntries.length === 0) return { ...empty, skippedBlankTiles };

  const planned = planEufySheets(queue, bannerEntries.map((e) => e.widthUnits), jig);

  // Preload each distinct tile artwork once (fills need no image).
  const loaded = new Map<string, HTMLImageElement | null>();
  const artUrls = [...new Set(queue.flatMap((q) => (q.kind === "art" ? [q.url] : [])))];
  await Promise.all(artUrls.map(async (u) => loaded.set(u, await loadImage(u))));

  const W = Math.round(jig.sheetWidthInches * jig.dpi);
  const H = Math.round(jig.sheetHeightInches * jig.dpi);
  // Desktop/operator export at full print resolution. If this device's canvas
  // can't hold a sheet this large (phones, iPad), refuse rather than silently
  // print lower-res. The UI hides this button on mobile; the caller turns this
  // into a "use a desktop" message for the tablet case that slips through.
  if (!canvasSupportsSize(W, H)) throw new Error("DEVICE_TOO_SMALL");

  const sheets: string[] = [];
  for (const sheet of planned) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    // No background fill — transparency drives the white underbase.
    for (const t of sheet.tiles) {
      // Clip to the pure square face so overflow can't bleed into a neighbour.
      ctx.save();
      ctx.beginPath();
      ctx.rect(t.x, t.y, t.size, t.size);
      ctx.clip();
      if (t.item.kind === "art") {
        const img = loaded.get(t.item.url);
        if (img) drawCover(ctx, img, t.x, t.y, t.size, t.size);
      } else {
        // Solid-color tile: opaque fill → printer lays a white underbase under it.
        ctx.fillStyle = t.item.color;
        ctx.fillRect(t.x, t.y, t.size, t.size);
      }
      ctx.restore();
    }
    // Banners: composite the rendered PNG into its planned rect (bottom-right).
    for (const b of sheet.banners) {
      const img = bannerEntries[b.bannerIndex]?.img;
      if (img) ctx.drawImage(img, b.x, b.y, b.w, b.h);
    }
    sheets.push(setPngDpi(canvas.toDataURL("image/png"), jig.dpi));
  }

  return {
    sheets,
    pocketsPerSheet: jigPocketCount(jig),
    printedTiles: queue.length,
    skippedBlankTiles,
    bannerCount: bannerEntries.filter((e) => e.img).length,
  };
}
