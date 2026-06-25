// ─────────────────────────────────────────────────────────────
// Reusable parts-list builder.
//
// The production parts list (which tiles + quantities, the custom text
// bars, plate, QR) is needed in TWO places: the in-builder export modal
// (ExportPartsList.tsx) and the order-fulfillment email. This module is
// the single source of truth so the two never drift.
//
// buildPartsList() is pure and isomorphic (no DOM, no store import) so it
// runs on the client (at order time) AND on the server (rendering the
// email/CSV). Callers pass the design fields explicitly.
// ─────────────────────────────────────────────────────────────

import { getPiece } from "@/data/sets";
import { canDieCut } from "@/components/tiles/TileArtwork";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import type { PlacedTile, PlacedTextBar, QRCodeConfig } from "@/lib/types";

// Short, stable part-number prefixes per set. Falls back to the first 3 letters.
const SET_CODE: Record<string, string> = {
  july4th: "J4",
  essentials: "ESS",
};

/** Stable part number derived from the piece id (not the filename). */
export function skuFor(pieceId: string): string {
  const [setId, slug = pieceId] = pieceId.split(":");
  const code = SET_CODE[setId] ?? setId.slice(0, 3).toUpperCase();
  return `${code}-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

export interface PartsRow {
  sku: string;
  name: string;
  pieceId: string;
  color: string;
  qty: number;
  /** True when this tile is produced die-cut (transparent, cut to shape). */
  dieCut: boolean;
}

export interface PartsBar {
  text: string;
  fontFamily: string;
  row: string;
  widthUnits: number;
  widthIn: string;
  heightIn: string;
  qr: boolean;
}

export interface PartsList {
  designName: string;
  plateState: string;
  tileSizeInches: number;
  qr: { enabled: boolean; url: string };
  rows: PartsRow[];
  totalTiles: number;
  bars: PartsBar[];
}

export interface BuildPartsListInput {
  slots: Record<string, PlacedTile>;
  textBars: PlacedTextBar[];
  qrCode: QRCodeConfig;
  plateState: string;
  designName: string;
  tileSizeInches: number;
  /** Design-level die-cut mode. Eligible tiles print die-cut when this is on. */
  dieCut: boolean;
}

/** Build the structured parts list. Tiles hidden under a text bar are excluded. */
export function buildPartsList(input: BuildPartsListInput): PartsList {
  const { slots, textBars, qrCode, plateState, designName, tileSizeInches, dieCut } = input;

  const counts = new Map<string, number>();
  const covered = new Set(coveredSlotIds(textBars));
  for (const [slotId, placed] of Object.entries(slots)) {
    if (covered.has(slotId)) continue; // hidden under a text bar — not produced
    counts.set(placed.pieceId, (counts.get(placed.pieceId) ?? 0) + 1);
  }

  const rows: PartsRow[] = Array.from(counts.entries())
    .map(([pieceId, qty]) => {
      const piece = getPiece(pieceId);
      return {
        sku: skuFor(pieceId),
        name: piece?.name ?? pieceId,
        pieceId,
        color: piece?.backgroundColor ?? "#FFFFFF",
        qty,
        dieCut: dieCut && canDieCut(pieceId),
      };
    })
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));

  const totalTiles = rows.reduce((sum, r) => sum + r.qty, 0);

  const bars: PartsBar[] = textBars.map((b) => ({
    text: b.config.text,
    fontFamily: b.config.fontFamily,
    row: b.row,
    widthUnits: b.widthUnits,
    widthIn: (b.widthUnits * tileSizeInches).toFixed(2),
    heightIn: tileSizeInches.toFixed(2),
    qr: b.qr,
  }));

  return {
    designName,
    plateState,
    tileSizeInches,
    qr: { enabled: qrCode.enabled, url: qrCode.url },
    rows,
    totalTiles,
    bars,
  };
}

/** Render the parts list as CSV (for the production email attachment). */
export function partsListCsv(parts: PartsList, orderNumber: string, customerName: string): string {
  const lines: string[][] = [
    ["Order #", orderNumber],
    ["Customer", customerName],
    ["Design", parts.designName],
    ["Tile size (in)", parts.tileSizeInches.toFixed(3)],
    ["Plate", parts.plateState],
    ...(parts.qr.enabled ? [["QR", parts.qr.url]] : []),
    [],
    ["Part #", "Tile", "Color", "Qty"],
    ...parts.rows.map((r) => [r.sku, r.name, r.color, String(r.qty)]),
    ["", "", "Total tiles", String(parts.totalTiles)],
    [],
    ["Custom parts (text bars)"],
    ["Text", "Font", "Row", "Size (tiles)", "Size (in)"],
    ...parts.bars.map((b) => [
      b.text,
      b.fontFamily,
      b.row,
      `${b.widthUnits} x 1`,
      `${b.widthIn} x ${b.heightIn}`,
    ]),
  ];
  return lines
    .map((cols) => cols.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

/** Render the parts list as an HTML table block (for the production email body). */
export function partsListHtml(parts: PartsList): string {
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const rowsHtml = parts.rows
    .map(
      (r) =>
        `<tr><td style="font-family:monospace;font-size:11px;padding:3px 6px;border-bottom:1px solid #eee;">${esc(r.sku)}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:12px;">${esc(r.name)}</td><td style="font-family:monospace;font-size:11px;padding:3px 6px;border-bottom:1px solid #eee;">${esc(r.color)}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:12px;">${r.qty}</td></tr>`,
    )
    .join("");
  const barsHtml = parts.bars.length
    ? `<p style="margin:14px 0 4px;font-weight:bold;font-size:12px;color:#444;">Custom parts — text bars</p>` +
      parts.bars
        .map(
          (b) =>
            `<div style="font-size:12px;color:#333;margin-bottom:2px;">“${esc(b.text)}” · ${esc(b.row)} · ${b.widthUnits}×1 (${esc(b.widthIn)}″ × ${esc(b.heightIn)}″) · ${esc(b.fontFamily)}${b.qr ? " · QR" : ""}</div>`,
        )
        .join("")
    : "";
  return `
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead><tr>
        <th style="text-align:left;padding:3px 6px;color:#666;font-size:11px;">Part #</th>
        <th style="text-align:left;padding:3px 6px;color:#666;font-size:11px;">Tile</th>
        <th style="text-align:left;padding:3px 6px;color:#666;font-size:11px;">Color</th>
        <th style="text-align:right;padding:3px 6px;color:#666;font-size:11px;">Qty</th>
      </tr></thead>
      <tbody>${rowsHtml}<tr><td colspan="3" style="padding:6px;font-weight:bold;border-top:2px solid #ccc;font-size:12px;">Total tiles</td><td style="padding:6px;font-weight:bold;border-top:2px solid #ccc;text-align:right;font-size:12px;">${parts.totalTiles}</td></tr></tbody>
    </table>${barsHtml}`;
}
