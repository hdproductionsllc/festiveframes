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
import { tallyTiles, tallyKey, type TileTally } from "@/lib/utils/tile-tally";
import { isMultiCell, tileSpan } from "@/lib/utils/snappet";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { SECTION_LABELS, panelSuppressed, slotSuppressed } from "@/lib/utils/sections";
import { panelRects } from "@/lib/utils/panels";
import type { FrameConfig, PlacedTile, PlacedTextBar, QRCodeConfig, SectionId, SectionState, TileSpan } from "@/lib/types";

// Short, stable part-number prefixes per set. Falls back to the first 3 letters.
const SET_CODE: Record<string, string> = {
  july4th: "J4",
  essentials: "ESS",
};

/**
 * Stable part number derived from the piece id (not the filename).
 *
 * A multi-cell snappet is a DISTINCT physical part from a 1x1 of the same art, so
 * its SKU carries a size suffix (e.g. `-2X4`). A 1x1 (absent span or an explicit
 * 1x1) gets NO suffix, so every /build part number is byte-identical to before.
 */
export function skuFor(pieceId: string, span?: TileSpan): string {
  const [setId, slug = pieceId] = pieceId.split(":");
  const code = SET_CODE[setId] ?? setId.slice(0, 3).toUpperCase();
  const base = `${code}-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  return span && isMultiCell(span) ? `${base}-${span.cols}X${span.rows}` : base;
}

export interface PartsRow {
  sku: string;
  name: string;
  pieceId: string;
  color: string;
  qty: number;
  /** Footprint in grid cells. {cols:1,rows:1} for a standard tile. */
  span: TileSpan;
  /** Physical size, inches, at the design's tile pitch: "cols×tile x rows×tile" (2dp). */
  size: string;
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
  /** Physical PART count — a multi-cell snappet is ONE part (its cells collapse). */
  totalTiles: number;
  /** Total grid CELLS produced — a 2x4 counts as 8. Equals totalTiles when every
   *  part is 1x1 (all of /build). */
  totalCells: number;
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

  // Which tiles get produced is owned by `tallyTiles` (utils/tile-tally) — shared
  // with the print queue and the in-builder export sheet so they can't drift.
  const counts = tallyTiles(slots, textBars);

  const rows: PartsRow[] = Array.from(counts.values())
    .map(({ pieceId, span, qty }) => {
      const piece = getPiece(pieceId);
      return {
        sku: skuFor(pieceId, span),
        name: piece?.name ?? pieceId,
        pieceId,
        color: piece?.backgroundColor ?? "#FFFFFF",
        qty,
        span,
        size: `${(span.cols * tileSizeInches).toFixed(2)} x ${(span.rows * tileSizeInches).toFixed(2)}`,
        dieCut: dieCut && canDieCut(pieceId),
      };
    })
    // Size only breaks a tie between rows that already match on qty AND name — for
    // an all-1x1 design every size is equal, so ordering is byte-identical to before.
    .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name) || a.size.localeCompare(b.size));

  const totalTiles = rows.reduce((sum, r) => sum + r.qty, 0);
  const totalCells = rows.reduce((sum, r) => sum + r.qty * r.span.cols * r.span.rows, 0);

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
    totalCells,
    bars,
  };
}

/** True when any produced part is a multi-cell snappet. Drives whether the size
 *  column / cell total appear — an all-1x1 design renders exactly as it always has. */
function hasMultiCellRow(parts: PartsList): boolean {
  return parts.rows.some((r) => isMultiCell(r.span));
}

// ─── Panel-grouped parts list (school builder) ───────────────────────────────
//
// The school product SELLS by the panel: a repeat customer buys a fresh 4-panel set,
// so a replacement order must read as "the LEFT panel is these parts, the TOP is
// these…". The flat `buildPartsList` above is what /build (and the fulfillment email)
// use and is left byte-identical; this is an ADDITIVE sibling that regroups the same
// produced parts by the PANEL each anchor sits in (`grid.panelAt`, which owns the
// corners — see utils/panels).
//
// A snappet is ONE part at its anchor, so a footprint belongs wholly to its anchor's
// panel (canPlace forbids a footprint straddling two panels), and grouping by the
// anchor coord is exact. The same piece+span in two different panels is TWO groups'
// rows (they are ordered as separate physical sub-sets), unlike the flat list which
// would merge them — that difference is the whole point of the panel view.

/** One PANEL's parts. */
export interface PanelPartsGroup {
  panel: SectionId;
  label: string;
  rows: PartsRow[];
  /** Physical parts in this panel (a multi-cell snappet is one). */
  totalTiles: number;
  /** Grid cells produced in this panel (a 2x4 counts as 8). */
  totalCells: number;
}

/** The flat parts list PLUS a per-panel grouping. Superset of `PartsList`, so any
 *  flat-list consumer can read it unchanged. */
export interface PanelPartsList extends PartsList {
  panels: PanelPartsGroup[];
}

export interface BuildPanelPartsListInput extends BuildPartsListInput {
  /** The school frame geometry — needed to resolve each anchor's panel. */
  frameConfig: FrameConfig;
  /**
   * School section modes. A panel switched OUT of tiles (text/image) is direct-printed
   * as ONE piece: the print renderer skips its tiles (`slotSuppressed`) and draws the
   * panel itself, so this list must do the same — drop the hidden tiles and emit the
   * panel as a direct-print part. Absent / all-tiles (every /build design) ⇒ no
   * suppression, byte-identical to the tile-only list.
   */
  sections?: Partial<Record<SectionId, SectionState>>;
}

/** Build a PartsRow from a tally entry (the exact mapping `buildPartsList` uses). */
function partsRowOf(t: TileTally, tileSizeInches: number, dieCut: boolean): PartsRow {
  const piece = getPiece(t.pieceId);
  return {
    sku: skuFor(t.pieceId, t.span),
    name: piece?.name ?? t.pieceId,
    pieceId: t.pieceId,
    color: piece?.backgroundColor ?? "#FFFFFF",
    qty: t.qty,
    span: t.span,
    size: `${(t.span.cols * tileSizeInches).toFixed(2)} x ${(t.span.rows * tileSizeInches).toFixed(2)}`,
    dieCut: dieCut && canDieCut(t.pieceId),
  };
}

const sortPartsRows = (rows: PartsRow[]): PartsRow[] =>
  rows.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name) || a.size.localeCompare(b.size));

// Reading order for the grouping — left, top, bottom, right (matches SECTION_IDS).
const PANEL_ORDER: SectionId[] = ["wing-left", "top", "bottom", "wing-right"];

/**
 * The single DIRECT-PRINT part for a panel switched out of tiles (text/image mode).
 * The print renderer replaces the whole panel with one piece over its bounding box,
 * so it is ONE physical part whose footprint is the panel rectangle. Size follows the
 * same tile-pitch convention as every other `PartsRow` (cols×tile × rows×tile).
 */
function directPrintPanelRow(
  panel: SectionId,
  sec: SectionState,
  config: FrameConfig,
  tileSizeInches: number,
): PartsRow {
  const rect = panelRects(config)[panel];
  const span: TileSpan = { cols: rect.col1 - rect.col0 + 1, rows: rect.row1 - rect.row0 + 1 };
  const isText = sec.mode === "text";
  return {
    sku: `PANEL-${panel.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}-${isText ? "TEXT" : "IMG"}`,
    name: `${SECTION_LABELS[panel]} — direct-print ${isText ? "text" : "image"}`,
    pieceId: `panel:${panel}`,
    color: isText ? sec.text?.backgroundColor ?? "#FFFFFF" : "#FFFFFF",
    qty: 1,
    span,
    size: `${(span.cols * tileSizeInches).toFixed(2)} x ${(span.rows * tileSizeInches).toFixed(2)}`,
    dieCut: false,
  };
}

/** Fold the direct-print panel parts into a flat `PartsList` (rows + both totals). A
 *  no-op when nothing is suppressed, so the flat half stays byte-identical on /build. */
function withDirectPrintParts(flat: PartsList, directRows: PartsRow[]): PartsList {
  if (directRows.length === 0) return flat;
  return {
    ...flat,
    rows: [...flat.rows, ...directRows],
    totalTiles: flat.totalTiles + directRows.reduce((s, r) => s + r.qty, 0),
    totalCells: flat.totalCells + directRows.reduce((s, r) => s + r.qty * r.span.cols * r.span.rows, 0),
  };
}

/**
 * The parts list grouped by PANEL, for a replacement-set view. Returns the flat
 * `PartsList` (delegated to `buildPartsList`, so the flat half is identical) with an
 * added `panels` array — one group per NON-EMPTY panel, in reading order, each with
 * its own rows + tallies. Tiles hidden under a text bar are excluded (same rule as
 * the flat list); a snappet is counted once, in its anchor's panel.
 */
export function buildPanelPartsList(input: BuildPanelPartsListInput): PanelPartsList {
  const { slots, textBars, frameConfig, tileSizeInches, dieCut, sections = {} } = input;

  const grid = buildGrid(frameConfig);
  const covered = new Set(coveredSlotIds(textBars));

  // A panel switched to TEXT/IMAGE is direct-printed as ONE piece; the print renderer
  // skips the tiles it owns (`slotSuppressed`) and draws the panel itself. Mirror that
  // exactly so the parts list matches the print: drop suppressed tiles from the tally,
  // and add each suppressed panel as a direct-print part. No section ⇒ nothing dropped
  // and no direct parts added, so /build stays byte-identical.
  const suppressedPanels = PANEL_ORDER.filter((p) => panelSuppressed(p, sections));
  const suppressed = new Set<string>();
  if (suppressedPanels.length) {
    for (const slotId of Object.keys(slots)) {
      const coord = grid.coordOf(slotId);
      if (coord && slotSuppressed(coord, sections, frameConfig)) suppressed.add(slotId);
    }
  }
  const visibleSlots = suppressed.size
    ? Object.fromEntries(Object.entries(slots).filter(([id]) => !suppressed.has(id)))
    : slots;

  const directRows = suppressedPanels.map((p) => directPrintPanelRow(p, sections[p]!, frameConfig, tileSizeInches));
  const directByPanel = new Map(suppressedPanels.map((p, i) => [p, directRows[i]] as const));

  // Flat half: the section-aware tile list (byte-identical to `buildPartsList` when
  // nothing is suppressed) plus one direct-print part per suppressed panel.
  const flat = withDirectPrintParts(buildPartsList({ ...input, slots: visibleSlots }), directRows);

  // Per-panel tally of the PRODUCED tiles: (panel → (pieceId@span → TileTally)). Keyed
  // on the anchor's panel, so a snappet lands in exactly one bucket. Suppressed tiles
  // are gone from `visibleSlots`, so a text/image panel yields an empty bucket.
  const byPanel = new Map<SectionId, Map<string, TileTally>>();
  for (const [slotId, placed] of Object.entries(visibleSlots)) {
    if (covered.has(slotId)) continue; // hidden under a banner — not produced
    const coord = grid.coordOf(slotId);
    const panel = coord ? grid.panelAt(coord.row, coord.col) : null;
    if (!panel) continue; // off-grid / plate — no panel to attribute it to
    const span = tileSpan(placed);
    const key = tallyKey(placed.pieceId, span);
    let bucket = byPanel.get(panel);
    if (!bucket) { bucket = new Map(); byPanel.set(panel, bucket); }
    const existing = bucket.get(key);
    if (existing) existing.qty += 1;
    else bucket.set(key, { pieceId: placed.pieceId, span, qty: 1 });
  }

  const panels: PanelPartsGroup[] = [];
  for (const panel of PANEL_ORDER) {
    const bucket = byPanel.get(panel);
    const tileRows = bucket
      ? sortPartsRows(Array.from(bucket.values()).map((t) => partsRowOf(t, tileSizeInches, dieCut)))
      : [];
    // A suppressed panel leads with its direct-print part; its tile rows are empty.
    const direct = directByPanel.get(panel);
    const rows = direct ? [direct, ...tileRows] : tileRows;
    if (rows.length === 0) continue;
    panels.push({
      panel,
      label: SECTION_LABELS[panel],
      rows,
      totalTiles: rows.reduce((s, r) => s + r.qty, 0),
      totalCells: rows.reduce((s, r) => s + r.qty * r.span.cols * r.span.rows, 0),
    });
  }

  return { ...flat, panels };
}

/** Render the parts list as CSV (for the production email attachment). */
export function partsListCsv(parts: PartsList, orderNumber: string, customerName: string): string {
  const multi = hasMultiCellRow(parts);
  const lines: string[][] = [
    ["Order #", orderNumber],
    ["Customer", customerName],
    ["Design", parts.designName],
    ["Tile size (in)", parts.tileSizeInches.toFixed(3)],
    ["Plate", parts.plateState],
    ...(parts.qr.enabled ? [["QR", parts.qr.url]] : []),
    [],
    multi ? ["Part #", "Tile", "Color", "Size (in)", "Qty"] : ["Part #", "Tile", "Color", "Qty"],
    ...parts.rows.map((r) =>
      multi ? [r.sku, r.name, r.color, r.size, String(r.qty)] : [r.sku, r.name, r.color, String(r.qty)],
    ),
    multi
      ? ["", "", "", "Total parts", String(parts.totalTiles)]
      : ["", "", "Total tiles", String(parts.totalTiles)],
    ...(multi ? [["", "", "", "Total cells", String(parts.totalCells)]] : []),
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
  const multi = hasMultiCellRow(parts);
  const rowsHtml = parts.rows
    .map(
      (r) =>
        `<tr><td style="font-family:monospace;font-size:11px;padding:3px 6px;border-bottom:1px solid #eee;">${esc(r.sku)}</td><td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:12px;">${esc(r.name)}</td><td style="font-family:monospace;font-size:11px;padding:3px 6px;border-bottom:1px solid #eee;">${esc(r.color)}</td>${multi ? `<td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:12px;">${esc(r.size)}</td>` : ""}<td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:12px;">${r.qty}</td></tr>`,
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
        ${multi ? `<th style="text-align:left;padding:3px 6px;color:#666;font-size:11px;">Size (in)</th>` : ""}<th style="text-align:right;padding:3px 6px;color:#666;font-size:11px;">Qty</th>
      </tr></thead>
      <tbody>${rowsHtml}<tr><td colspan="${multi ? 4 : 3}" style="padding:6px;font-weight:bold;border-top:2px solid #ccc;font-size:12px;">${multi ? "Total parts" : "Total tiles"}</td><td style="padding:6px;font-weight:bold;border-top:2px solid #ccc;text-align:right;font-size:12px;">${parts.totalTiles}</td></tr>${multi ? `<tr><td colspan="4" style="padding:6px;font-size:12px;color:#444;">Total cells</td><td style="padding:6px;text-align:right;font-size:12px;color:#444;">${parts.totalCells}</td></tr>` : ""}</tbody>
    </table>${barsHtml}`;
}
