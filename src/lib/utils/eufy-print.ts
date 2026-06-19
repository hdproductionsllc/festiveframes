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

export interface EufyPrintResult {
  /** One transparent PNG data URL per jig load. */
  sheets: string[];
  pocketsPerSheet: number;
  /** Total printable tile faces laid out across all sheets. */
  printedTiles: number;
  /** Solid-color tiles with no artwork — physical blanks, not UV-printed. */
  skippedBlankTiles: number;
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

  // Expand into a flat list of artwork URLs × quantity. Pieces with no artwork
  // are solid-color physical blanks — they don't get UV-printed, so skip them.
  const queue: string[] = [];
  let skippedBlankTiles = 0;
  for (const [pieceId, qty] of counts) {
    const url = getPiece(pieceId)?.artworkUrl;
    if (url) for (let i = 0; i < qty; i++) queue.push(url);
    else skippedBlankTiles += qty;
  }
  if (queue.length === 0) return { ...empty, skippedBlankTiles };

  // Preload each distinct artwork once.
  const loaded = new Map<string, HTMLImageElement | null>();
  await Promise.all([...new Set(queue)].map(async (u) => loaded.set(u, await loadImage(u))));

  const centers = jigPocketCenters(jig);
  const perSheet = centers.length;
  const W = Math.round(jig.sheetWidthInches * jig.dpi);
  const H = Math.round(jig.sheetHeightInches * jig.dpi);
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
    chunk.forEach((url, i) => {
      const img = loaded.get(url);
      if (!img) return;
      const { xIn, yIn } = centers[i];
      const x = xIn * jig.dpi - face / 2;
      const y = yIn * jig.dpi - face / 2;
      // Clip to the pure square face so cover-fit overflow can't bleed into a
      // neighbouring pocket. No corner radius — the full square gets printed.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, face, face);
      ctx.clip();
      drawCover(ctx, img, x, y, face, face);
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
