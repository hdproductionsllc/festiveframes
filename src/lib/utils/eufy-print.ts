import { useDesignStore } from "@/stores/design-store";
import { getPiece } from "@/data/sets";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { EUFY_JIG, jigPocketCenters, jigPocketCount, type EufyJigConfig } from "@/config/eufy-jig";

// ─── eufyMake E1 print-sheet renderer ───────────────────────
//
// Second render target of the same design data as compose-frame.ts. Instead of
// the on-screen frame mockup, this lays each placed tile's artwork onto the
// physical jig grid (see src/config/eufy-jig.ts) and exports a transparent,
// print-ready PNG per jig load. Transparent background is intentional: the
// eufyMake E1 derives its white-ink underbase from the artwork's alpha.

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

// One tile to print: either artwork or a solid-color fill.
type PrintItem = { kind: "art"; url: string } | { kind: "fill"; color: string };

// We stock only WHITE blank snappets, so a solid tile may skip UV printing only
// when it's white. Treat near-white as white (e.g. "Snow White" #F5F5F5) so it
// uses a blank snappet; anything darker or saturated gets printed as a fill.
// Unknown color formats return false → printed, never silently skipped.
function isWhiteSnappet(color: string): boolean {
  const hex = color.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return r >= 240 && g >= 240 && b >= 240;
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

export interface EufyPrintResult {
  /** One transparent PNG data URL per jig load. */
  sheets: string[];
  pocketsPerSheet: number;
  /** Total printable tile faces laid out across all sheets. */
  printedTiles: number;
  /** Solid-color tiles with no artwork — physical blanks, not UV-printed. */
  skippedBlankTiles: number;
}

// iOS Safari caps <canvas> at ~16.7M px and ~4096 px per side; the full 720-DPI
// sheet (7128x2376) exceeds that and silently renders blank. Probe the real
// target size: draw a test pixel and read it back — if it didn't draw, this
// device can't handle a canvas this big (so we refuse instead of degrading).
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
  const covered = new Set(coveredSlotIds(textBars));

  // Tally placed tiles by piece (tiles hidden under a text bar aren't produced).
  const counts = new Map<string, number>();
  for (const [slotId, placed] of Object.entries(slots)) {
    if (covered.has(slotId)) continue;
    counts.set(placed.pieceId, (counts.get(placed.pieceId) ?? 0) + 1);
  }

  // Expand into a flat print queue × quantity. A tile is one of:
  //   • art   — has artwork; print the image.
  //   • fill  — a solid color with no artwork; print a solid square of that color.
  // We stock only WHITE blank snappets, so a solid tile can skip UV printing
  // ONLY when it's white (grab a blank snappet). Every other color (red, gold,
  // silver, …) has no matching blank, so it MUST be printed as a solid fill.
  const queue: PrintItem[] = [];
  let skippedBlankTiles = 0; // white tiles only — use a blank snappet, no print
  for (const [pieceId, qty] of counts) {
    const piece = getPiece(pieceId);
    const url = piece?.artworkUrl;
    if (url) {
      for (let i = 0; i < qty; i++) queue.push({ kind: "art", url });
    } else {
      const color = piece?.backgroundColor ?? "#FFFFFF";
      if (isWhiteSnappet(color)) skippedBlankTiles += qty;
      else for (let i = 0; i < qty; i++) queue.push({ kind: "fill", color });
    }
  }
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

// ─── PNG physical-resolution (pHYs) tagging ─────────────────
// A <canvas> PNG carries no DPI, so importers guess the physical size. We inject
// a pHYs chunk so eufyMake Studio imports the sheet at its true 9.9"×3.3" size —
// no manual scaling before printing.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Return a new PNG data URL with a pHYs chunk encoding `dpi` (both axes). */
function setPngDpi(dataUrl: string, dpi: number): string {
  const b64 = dataUrl.split(",")[1];
  if (!b64) return dataUrl;
  const bin = atob(b64);
  const png = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);

  // PNG = 8-byte signature, then IHDR chunk (4 len + 4 type + 13 data + 4 crc = 25).
  const insertAt = 8 + 25;
  const ppm = Math.round(dpi / 0.0254); // pixels per metre

  const chunk = new Uint8Array(21); // 4 len + 4 type + 9 data + 4 crc
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9); // data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  dv.setUint32(8, ppm); // x ppu
  dv.setUint32(12, ppm); // y ppu
  chunk[16] = 1; // unit specifier: metre
  dv.setUint32(17, crc32(chunk.subarray(4, 17))); // CRC over type+data

  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.subarray(insertAt), insertAt + chunk.length);

  let s = "";
  for (let i = 0; i < out.length; i++) s += String.fromCharCode(out[i]);
  return "data:image/png;base64," + btoa(s);
}
