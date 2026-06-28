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
