import { useDesignStore } from "@/stores/design-store";
import { jigPocketCenters, jigPocketCount, EUFY_JIG, type EufyJigConfig } from "@/config/eufy-jig";
import { buildPrintQueue, setPngDpi, type EufyPrintResult } from "@/lib/utils/eufy-print-core";

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
 * Render the current design into eufyMake E1 print sheets. Tiles are batched by
 * SET + QUANTITY (pocket position carries no meaning — sort by hand after print),
 * filling pockets in reading order and paginating onto extra sheets past one jig.
 */
export async function composeEufyPrintSheets(jig: EufyJigConfig = EUFY_JIG): Promise<EufyPrintResult> {
  const empty: EufyPrintResult = { sheets: [], pocketsPerSheet: jigPocketCount(jig), printedTiles: 0, skippedBlankTiles: 0 };
  if (typeof document === "undefined") return empty;

  const { slots, textBars } = useDesignStore.getState();
  const { queue, skippedBlankTiles } = buildPrintQueue(slots, textBars);
  if (queue.length === 0) return { ...empty, skippedBlankTiles };

  // Preload each distinct artwork once (fills need no image).
  const loaded = new Map<string, HTMLImageElement | null>();
  const artUrls = [...new Set(queue.flatMap((q) => (q.kind === "art" ? [q.url] : [])))];
  await Promise.all(artUrls.map(async (u) => loaded.set(u, await loadImage(u))));

  const centers = jigPocketCenters(jig);
  const perSheet = centers.length;

  const W = Math.round(jig.sheetWidthInches * jig.dpi);
  const H = Math.round(jig.sheetHeightInches * jig.dpi);
  // Desktop/operator export at full print resolution. If this device's canvas
  // can't hold a sheet this large (phones, iPad), refuse rather than silently
  // print lower-res. The UI hides this button on mobile; the caller turns this
  // into a "use a desktop" message for the tablet case that slips through.
  if (!canvasSupportsSize(W, H)) throw new Error("DEVICE_TOO_SMALL");
  const face = jig.tileFaceInches * jig.dpi;

  const sheets: string[] = [];
  for (let start = 0; start < queue.length; start += perSheet) {
    const chunk = queue.slice(start, start + perSheet);
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    // No background fill — transparency drives the white underbase.
    chunk.forEach((item, i) => {
      const { xIn, yIn } = centers[i];
      const x = xIn * jig.dpi - face / 2;
      const y = yIn * jig.dpi - face / 2;
      // Clip to the pure square face so overflow can't bleed into a neighbouring
      // pocket. No corner radius — the full square gets printed.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, face, face);
      ctx.clip();
      if (item.kind === "art") {
        const img = loaded.get(item.url);
        if (img) drawCover(ctx, img, x, y, face, face);
      } else {
        // Solid-color tile: opaque fill → printer lays a white underbase under it.
        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, face, face);
      }
      ctx.restore();
    });
    sheets.push(setPngDpi(canvas.toDataURL("image/png"), jig.dpi));
  }

  return { sheets, pocketsPerSheet: perSheet, printedTiles: queue.length, skippedBlankTiles };
}
