// ─── eufyMake print-sheet CORE (environment-agnostic) ───────────────────────
//
// The PURE pieces of the eufyMake print pipeline, shared by both the browser
// renderer (`eufy-print.ts` — the operator's desktop "download" button) and the
// server renderer (`eufy-print-server.ts` — auto-attached to the production
// email at fulfillment). Keeping the "WHAT gets printed" logic here in ONE place
// guarantees the two renderers can never drift on which tiles print, which are
// blank snappets, or how the PNG's physical DPI is tagged.
//
// Nothing here touches `document`, `<canvas>`, `Image`, the filesystem, or the
// network — that environment-specific drawing lives in the two renderer files.

import { getPiece } from "@/data/sets";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { jigPocketCenters, type EufyJigConfig } from "@/config/eufy-jig";
import type { PlacedTile, TextBarPlacement } from "@/lib/types";

/** One tile to print: either artwork, or a solid-color fill. */
export type PrintItem = { kind: "art"; url: string } | { kind: "fill"; color: string };

export interface EufyPrintResult {
  /** One transparent PNG data URL per jig load. */
  sheets: string[];
  pocketsPerSheet: number;
  /** Total printable tile faces laid out across all sheets. */
  printedTiles: number;
  /** Solid-color tiles with no artwork — physical blanks, not UV-printed. */
  skippedBlankTiles: number;
  /** Banners composited onto the sheet(s). Lets the caller drop the now-redundant
   *  separate banner attachments only when they all made it onto the sheet. */
  bannerCount: number;
}

/**
 * We stock only WHITE blank snappets, so a solid tile may skip UV printing only
 * when it's white. Treat near-white as white (e.g. "Snow White" #F5F5F5) so it
 * uses a blank snappet; anything darker or saturated gets printed as a fill.
 * Unknown color formats return false → printed, never silently skipped.
 */
export function isWhiteSnappet(color: string): boolean {
  const hex = color.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return false;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return r >= 240 && g >= 240 && b >= 240;
}

/**
 * Expand a design's placed tiles into a flat print queue (× quantity), batched by
 * SET + QUANTITY — pocket position carries no meaning, the operator hand-sorts
 * after print. Tiles hidden under a text bar are NOT produced. A no-artwork tile
 * is a solid fill UNLESS it's white (grab a blank snappet, no UV print).
 *
 * This is the single source of truth for "what gets printed", shared by the
 * browser and server renderers.
 */
export function buildPrintQueue(
  slots: Record<string, PlacedTile>,
  textBars: TextBarPlacement[],
): { queue: PrintItem[]; skippedBlankTiles: number } {
  const covered = new Set(coveredSlotIds(textBars));

  // Tally placed tiles by piece (tiles hidden under a text bar aren't produced).
  const counts = new Map<string, number>();
  for (const [slotId, placed] of Object.entries(slots)) {
    if (covered.has(slotId)) continue;
    counts.set(placed.pieceId, (counts.get(placed.pieceId) ?? 0) + 1);
  }

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
  return { queue, skippedBlankTiles };
}

// ─── Consolidated sheet LAYOUT (tiles + banners on one sheet) ───────────────
//
// One design = one eufy sheet. Tiles fill the jig pockets in reading order;
// banners ride the SAME sheet, all in the bottom-right corner, right edge flush
// with the sheet's right edge. Multiple banners stack upward from the bottom with
// the BIGGEST (widest) on the bottom; a banner's leftover length (it won't land
// on the pocket pitch) is the gap to its LEFT. Tiles skip any pocket a banner
// covers. This planner is the single source of truth for that geometry, shared
// by the browser and server renderers so they can never drift; each renderer
// just draws to these px coordinates with its own canvas + image loading.
//
// WIDE-BANNER RULE: a banner WIDER than FULL_ROW_BANNER_UNITS tiles takes its
// pocket row to ITSELF — no tiles share that row, even in the gap to its left.
// (A narrow banner still shares its row, with tiles filling the leftover pockets.)

/** A banner WIDER than this many tile-units takes its whole pocket row (no tiles
 *  beside it). At/under it, the banner shares its row and tiles fill the leftover. */
export const FULL_ROW_BANNER_UNITS = 6;

/** A tile placed on a specific sheet (px coords are the face's top-left). */
export interface PlannedTile {
  item: PrintItem;
  /** top-left of the square face, px */
  x: number;
  y: number;
  /** face side length, px */
  size: number;
}

/** A banner placed on a sheet (px coords are the strip's top-left). */
export interface PlannedBanner {
  /** index into the caller's banner list (its image + identity). */
  bannerIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlannedSheet {
  tiles: PlannedTile[];
  banners: PlannedBanner[];
}

/**
 * Plan the consolidated sheet(s) for a design. `bannerWidthUnits[i]` is how many
 * tile-units wide banner `i` is (its image is supplied by the caller in the same
 * order). Banner height = banner unit = one tile face (square tiles), at the
 * jig's scale. Banners live on sheet 1 only; excess tiles paginate onto plain
 * pocket-grid sheets after it.
 */
export function planEufySheets(
  queue: PrintItem[],
  bannerWidthUnits: number[],
  jig: EufyJigConfig,
): PlannedSheet[] {
  const dpi = jig.dpi;
  const W = Math.round(jig.sheetWidthInches * dpi);
  const facePx = jig.tileFaceInches * dpi;
  const centers = jigPocketCenters(jig).map((c) => ({ x: c.xIn * dpi, y: c.yIn * dpi }));

  // Banners: biggest first → bottom row, stacking upward onto the rows ABOVE.
  // Each banner is centered on a pocket ROW center (bottom row, then middle, then
  // top), so it sits FLUSH with the tiles in that row — same inter-row gap, not
  // banners jammed edge-to-edge. Right edge flush to the sheet's right edge.
  const rowCentersDescPx = [...jig.rowCentersInches].sort((a, z) => z - a).map((r) => r * dpi); // bottom → top
  const placed = bannerWidthUnits
    .map((w, i) => ({ i, w }))
    .sort((a, b) => b.w - a.w)
    .map((b, stackPos) => {
      const w = b.w * facePx;
      const h = facePx;
      // On a row center while rows remain; beyond that (more banners than rows)
      // keep stacking flush above the top row so nothing is lost.
      const onRow = stackPos < rowCentersDescPx.length;
      const yCenter = onRow
        ? rowCentersDescPx[stackPos]
        : rowCentersDescPx[rowCentersDescPx.length - 1] - (stackPos - rowCentersDescPx.length + 1) * h;
      return {
        banner: { bannerIndex: b.i, x: Math.max(0, W - w), y: yCenter - h / 2, w, h } as PlannedBanner,
        // A banner wider than the threshold reserves its WHOLE pocket row (no
        // tiles beside it) — but only when it actually sits on a row.
        exclusiveRowY: onRow && b.w > FULL_ROW_BANNER_UNITS ? yCenter : null,
      };
    });
  const banners: PlannedBanner[] = placed.map((p) => p.banner);
  const exclusiveRowYs = placed.map((p) => p.exclusiveRowY).filter((y): y is number => y !== null);

  // A pocket is usable for a tile only if it clears every banner rect AND isn't in
  // a row a wide banner has claimed for itself (a pocket belongs to a row when its
  // center is within half a face of that row's center — rows are a full pitch apart).
  const clearsBanners = (cx: number, cy: number): boolean => {
    if (exclusiveRowYs.some((ry) => Math.abs(cy - ry) <= facePx / 2)) return false;
    const left = cx - facePx / 2, top = cy - facePx / 2, right = cx + facePx / 2, bottom = cy + facePx / 2;
    return !banners.some((b) => !(right <= b.x || left >= b.x + b.w || bottom <= b.y || top >= b.y + b.h));
  };
  const sheet1Centers = centers.filter((c) => clearsBanners(c.x, c.y));

  const sheets: PlannedSheet[] = [];
  let qi = 0;
  let sheetIdx = 0;
  do {
    const avail = sheetIdx === 0 ? sheet1Centers : centers;
    const tiles: PlannedTile[] = [];
    for (const c of avail) {
      if (qi >= queue.length) break;
      tiles.push({ item: queue[qi++], x: c.x - facePx / 2, y: c.y - facePx / 2, size: facePx });
    }
    sheets.push({ tiles, banners: sheetIdx === 0 ? banners : [] });
    sheetIdx++;
    // Guard: if sheet 1's pockets were entirely banner-covered yet tiles remain,
    // the loop continues onto full pocket-grid sheets (centers is never empty).
  } while (qi < queue.length);

  return sheets;
}

// ─── PNG physical-resolution (pHYs) tagging ─────────────────
// A <canvas> PNG carries no DPI, so importers guess the physical size. We inject
// a pHYs chunk so eufyMake Studio imports the sheet at its true inches — no
// manual scaling before printing. Pure byte manipulation: works identically on a
// browser canvas data URL and a server-rendered one.

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
export function setPngDpi(dataUrl: string, dpi: number): string {
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
