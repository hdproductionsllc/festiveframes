// ─── School frame PRINT renderer ─────────────────────────────────────────────
//
// A NEW, self-contained renderer for the SCHOOL builder's print output. It is a
// deliberate sibling of `compose-frame.ts` (the live /build checkout proof) and
// shares NONE of its code: compose-frame reads `defaultDesignStore` and knows
// nothing about wings, multi-cell snappets, uploaded art, section panels, or the
// two-row bottom — and touching it risks existing revenue. So this file re-implements
// the same canvas patterns (loadImage / roundRect / drawFit / drawTextBar) against a
// design passed in EXPLICITLY, with the school geometry baked in.
//
// What it produces: a high-DPI PNG of the WHOLE assembled school frame — plate, ring
// + wing tiles, multi-cell snappets (uploaded art pulled at FULL resolution from
// IndexedDB), text/image section panels, and text banners — rotated to sit on the
// eufyMake E1 bed (16.5" x 13", long axis along 16.5") and stamped with its physical
// DPI via `setPngDpi`.
//
// KNOWN compose-frame BUG, fixed HERE (not there): compose-frame draws banners at
// `startIndex*tile` with NO wing offset and at `H - tile` (the RENDER height), both
// wrong on a winged / two-bottom-row frame. `schoolBannerRect` offsets by the wing
// width and pins the bottom banner to the BASE bottom row. /build has no wings and
// one bottom row, so its proof is unaffected — which is exactly why the fix lives here.
//
// Split: the DRAWING (`drawSchoolFrame`) is environment-agnostic — it takes a 2D
// context and preloaded images, so it runs on a browser <canvas> (the export button)
// AND on a node @napi-rs/canvas (tests / a future server render) with no branching.
// Only `composeSchoolFrame` is browser-bound (it loads images via Image + IndexedDB).

import QRCode from "qrcode";
import type {
  BottomBarConfig,
  FrameConfig,
  PlacedTextBar,
  PlacedTile,
  QRCodeConfig,
  SectionId,
  SectionState,
  TextBarPlacement,
} from "@/lib/types";
import { getRenderHeightInches, getTotalWidthInches } from "@/lib/constants/frame";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredBySnappets, tileSpan, visibleAnchorSlots } from "@/lib/utils/snappet";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import {
  fitTextBarFont,
  textBarAvailWidth,
  QR_SIZE_RATIO,
  QR_GAP_RATIO,
} from "@/lib/utils/text-bar";
import { SECTION_IDS, SECTION_LABELS, sectionBounds, slotSuppressed } from "@/lib/utils/sections";
import { panelRects, type PanelRect } from "@/lib/utils/panels";
import { bannerBands } from "@/lib/utils/banner-tiers";
import { getPiece } from "@/data/sets";
import { getFullRes } from "@/lib/utils/image-store";

/** Default print resolution. 300 DPI is the eufyMake sheet standard. */
export const SCHOOL_PRINT_DPI = 300;

/** eufyMake E1 printable bed, inches. The output is rotated so its LONG axis lies
 *  along the bed's 16.5" side (the school frame fits only in that orientation). */
export const EUFY_BED_LONG_INCHES = 16.5;
export const EUFY_BED_SHORT_INCHES = 13;

/**
 * Source-crop + output box for one panel PNG, with overspray BLEED added as EXTRA AREA
 * — never as scaling. `srcW === outW` and `srcH === outH`, so the panel draws 1:1: tiles
 * keep their true size and seams stay aligned, and only the (transparent or neighbour)
 * bleed margin is added around the content. The crop starts a bleed BEFORE the panel's
 * top-left, so the outward margin picks up the real adjacent pixels. Pure — node-testable.
 */
export function panelBleedBox(rc: PanelRect, tilePx: number, bleedPx: number) {
  const contentW = (rc.col1 - rc.col0 + 1) * tilePx;
  const contentH = (rc.row1 - rc.row0 + 1) * tilePx;
  const outW = Math.max(1, Math.round(contentW + 2 * bleedPx));
  const outH = Math.max(1, Math.round(contentH + 2 * bleedPx));
  return {
    srcX: rc.col0 * tilePx - bleedPx,
    srcY: rc.row0 * tilePx - bleedPx,
    srcW: outW, // === outW → 1:1 draw (no enlargement)
    srcH: outH,
    outW,
    outH,
    contentW,
    contentH,
  };
}

// ── The design, passed in explicitly (NOT read from any store) ────────────────
export interface SchoolDesign {
  frameConfig: FrameConfig;
  slots: Record<string, PlacedTile>;
  textBars: PlacedTextBar[];
  qrCode: QRCodeConfig;
  plateState: string;
  sections: Partial<Record<SectionId, SectionState>>;
}

export interface ComposeSchoolOptions {
  /** Print resolution in DPI (px per inch). Default 300. */
  dpi?: number;
}

// ── A minimal image shape both engines satisfy ────────────────────────────────
// The browser's HTMLImageElement exposes `naturalWidth/Height`; @napi-rs/canvas's
// Image exposes `width/height`. `drawFit` reads whichever is present, so one draw
// path serves both. `drawImage` accepts either object on its own engine.
export interface DrawableImage {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

/** Preloaded bitmaps the pure drawer needs, resolved by the environment-specific
 *  caller. Every lookup may miss (a failed load) — the drawer degrades gracefully. */
export interface SchoolImageBundle {
  /** The license-plate photo, or null (CSS-style flat plate fallback). */
  plate: DrawableImage | null;
  /** Set-piece artwork, keyed by `piece.artworkUrl`. */
  pieces: Map<string, DrawableImage>;
  /** Uploaded-art snappets, keyed by their ANCHOR slot id (full-res or preview). */
  snappets: Map<string, DrawableImage>;
  /** Image-mode section panels, keyed by SectionId. */
  sections: Map<SectionId, DrawableImage>;
  /** The QR code, or null when no banner carries one. */
  qr: DrawableImage | null;
}

// ─── Pure geometry (no DOM — unit-testable in node) ──────────────────────────

/** The print canvas size in px: the whole rendered frame at `dpi`, BEFORE the
 *  bed-fit rotation. Reusing `generateSlots(config, width)` at this width makes the
 *  slot px equal print px (1 unit inch → dpi px). */
export function schoolCanvasSize(
  config: FrameConfig,
  dpi: number = SCHOOL_PRINT_DPI,
): { width: number; height: number } {
  return {
    width: Math.round(getTotalWidthInches(config) * dpi),
    height: Math.round(getRenderHeightInches(config) * dpi),
  };
}

/**
 * Should the drawn canvas be rotated 90° to sit on the bed?
 *
 * The bed's long axis is 16.5"; the school frame fits ONLY with its own long axis
 * along it. The drawn canvas is landscape (wider than tall) for the school frame, so
 * this returns false there. A portrait canvas (taller than wide) is rotated so its
 * long axis ends up horizontal — i.e. along the bed's 16.5" side.
 */
export function shouldRotateForBed(width: number, height: number): boolean {
  return height > width;
}

/** Per-inch scale + derived px lengths at a given canvas width. */
export function schoolRenderMetrics(config: FrameConfig, canvasWidth: number) {
  const scale = canvasWidth / getTotalWidthInches(config);
  const hasWings = config.wings && config.wingColumns > 0;
  return {
    scale,
    tileSize: config.tileSizeInches * scale,
    wingPx: hasWings ? config.wingWidthInches * scale : 0,
    innerWidthPx: config.widthInches * scale,
    // The ORIGINAL inner-frame height (ignores flag-gated extra bottom rows). Banners
    // and the base bottom row pin to THIS, so they never drag onto the extra row.
    baseFrameHeightPx: config.heightInches * scale,
  };
}

/**
 * The px rect a text banner occupies — THE compose-frame bug fixed.
 *
 * compose-frame used `startIndex*tile` (no wing offset) and `H - tile` (render
 * height). Here x is offset by the wing width and the bottom banner sits on the BASE
 * bottom row (`baseFrameHeightPx - tileSize`), correct on a winged, two-row frame.
 */
export function schoolBannerRect(
  bar: TextBarPlacement,
  m: { tileSize: number; wingPx: number; baseFrameHeightPx: number },
): { x: number; y: number; width: number; height: number } {
  return {
    x: m.wingPx + bar.startIndex * m.tileSize,
    y: bar.row === "top" ? 0 : m.baseFrameHeightPx - m.tileSize,
    width: bar.widthUnits * m.tileSize,
    height: m.tileSize,
  };
}

// ─── Small canvas helpers (copied from compose-frame; NOT imported to keep it
//     untouched). Kept intentionally identical so the two proofs read the same. ──

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Object-fit cover|contain + a center scale, into a rect. Reads natural OR intrinsic
 *  size so it works on both a browser Image and a napi-rs Image. */
function drawFit(
  ctx: CanvasRenderingContext2D,
  img: DrawableImage,
  x: number, y: number, w: number, h: number,
  fit: "cover" | "contain", scale: number,
) {
  const iw = img.naturalWidth || img.width || 0;
  const ih = img.naturalHeight || img.height || 0;
  if (!iw || !ih) return;
  const destRatio = w / h, imgRatio = iw / ih;
  let cw: number, ch: number;
  if (fit === "contain") {
    if (imgRatio > destRatio) { cw = w; ch = w / imgRatio; }
    else { ch = h; cw = h * imgRatio; }
  } else {
    if (imgRatio > destRatio) { ch = h; cw = h * imgRatio; }
    else { cw = w; ch = w / imgRatio; }
  }
  cw *= scale; ch *= scale;
  // `img` is a real bitmap at runtime; the DrawableImage view only narrows the props
  // this module reads. The cast hands the engine its own native image type.
  ctx.drawImage(img as CanvasImageSource, x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
}

/** A banner (text bar) drawn into a rect. Mirrors compose-frame's drawTextBar so
 *  banners look identical between the two renderers. */
function drawTextBar(
  ctx: CanvasRenderingContext2D,
  bar: PlacedTextBar,
  x: number, y: number, w: number, h: number,
  qrImg: DrawableImage | null,
) {
  const cfg = bar.config;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h); // sharp 90° corners — printed banners are never rounded
  ctx.clip();
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, w, h);

  const qrSize = bar.qr ? h * QR_SIZE_RATIO : 0;
  const avail = textBarAvailWidth(w, h, bar.qr);
  const text = cfg.text || "YOUR TEXT HERE";
  const fontPx = fitTextBarFont(ctx, text, cfg.fontFamily, cfg.letterSpacing, h, avail, cfg.fontSize ?? 1);
  ctx.font = `700 ${fontPx}px ${cfg.fontFamily}`;
  try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${cfg.letterSpacing}px`; } catch { /* unsupported */ }
  ctx.fillStyle = cfg.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);
  try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px"; } catch { /* unsupported */ }

  if (bar.qr && qrImg) {
    const s = qrSize;
    const qx = x + w - s - h * QR_GAP_RATIO;
    const qy = y + (h - s) / 2;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qx, qy, s, s);
    ctx.drawImage(qrImg as CanvasImageSource, qx, qy, s, s);
  }
  ctx.restore();
}

// ── Section TEXT block (mirrors SectionTextElement's fit + multi-line draw) ────
const SECTION_LINE_HEIGHT = 1.06;
const SECTION_PAD_RATIO = 0.06;

/** Largest font (px) at which every `\n` line fits `contentW` and all lines fit
 *  `contentH`, scaled by the `fill` slider. Mirrors SectionTextElement.fitBlockFont. */
function fitSectionFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  letterSpacing: number,
  contentW: number,
  contentH: number,
  fill: number,
): number {
  const lines = (text.length ? text : " ").split("\n");
  let fontPx = contentH / (SECTION_LINE_HEIGHT * lines.length);
  const probe = 100;
  ctx.font = `700 ${probe}px ${fontFamily}`;
  let widthLimited = Number.POSITIVE_INFINITY;
  for (const ln of lines) {
    const glyphs = ctx.measureText(ln).width;
    const avail = Math.max(1, contentW - letterSpacing * Math.max(0, ln.length - 1));
    if (glyphs > 0) widthLimited = Math.min(widthLimited, (avail / glyphs) * probe);
  }
  fontPx = Math.min(fontPx, widthLimited);
  return Math.max(6, fontPx * fill);
}

/** Draw a section's TEXT panel into a box. A bottom banner with a `tagline` renders in
 *  TWO tiers — a big headline over a smaller tagline (bands shared with the on-screen
 *  SectionTextElement via `bannerBands`); otherwise it's one auto-fit block. */
function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  cfg: BottomBarConfig,
  x: number, y: number, w: number, h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, w, h);

  const pad = Math.min(w, h) * SECTION_PAD_RATIO;
  const contentW = Math.max(1, w - pad * 2);
  const contentH = Math.max(1, h - pad * 2);
  const headline = cfg.text ?? "";
  const tagline = cfg.tagline?.trim() ? cfg.tagline : "";
  const fill = cfg.fontSize ?? 1;
  const ls = cfg.letterSpacing ?? 0;
  const contentTop = y + pad;
  const align = cfg.textAlign;
  const tx = align === "left" ? x + pad : align === "right" ? x + w - pad : x + w / 2;

  // Draw one tier's `\n` lines, vertically centered within a band that starts
  // `bandTop` below the content top and is `bandH` tall.
  const drawTier = (str: string, fontPx: number, bandTop: number, bandH: number) => {
    ctx.font = `800 ${fontPx}px ${cfg.fontFamily}`;
    ctx.fillStyle = cfg.textColor;
    ctx.textBaseline = "middle";
    try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${ls}px`; } catch { /* unsupported */ }
    ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
    const lines = str.split("\n");
    const lineBox = fontPx * SECTION_LINE_HEIGHT;
    const bandCenter = contentTop + bandTop + bandH / 2;
    let ty = bandCenter - (lineBox * lines.length) / 2 + lineBox / 2;
    for (const ln of lines) {
      ctx.fillText(ln, tx, ty);
      ty += lineBox;
    }
    try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px"; } catch { /* unsupported */ }
  };

  if (headline.length) {
    if (tagline) {
      const bands = bannerBands(contentH);
      const hFont = fitSectionFont(ctx, headline, cfg.fontFamily, ls, contentW, bands.headlineH, fill);
      const tFont = fitSectionFont(ctx, tagline, cfg.fontFamily, ls, contentW, bands.taglineH, fill);
      drawTier(headline, hFont, bands.headlineTop, bands.headlineH);
      drawTier(tagline, tFont, bands.taglineTop, bands.taglineH);
    } else {
      const fontPx = fitSectionFont(ctx, headline, cfg.fontFamily, ls, contentW, contentH, fill);
      drawTier(headline, fontPx, 0, contentH);
    }
  }
  ctx.restore();
}

// ─── The pure drawer ─────────────────────────────────────────────────────────

/**
 * Draw the whole assembled school frame onto `ctx` (sized `canvasWidth` x
 * `canvasHeight`), using the preloaded `images`. Pure and engine-agnostic: no DOM,
 * no image loading, no store. The caller sizes the canvas via `schoolCanvasSize` and
 * supplies the bitmaps; this only paints.
 */
export function drawSchoolFrame(
  ctx: CanvasRenderingContext2D,
  design: SchoolDesign,
  images: SchoolImageBundle,
  // The transparent-background render derives all geometry from width + config, so the
  // canvas HEIGHT isn't needed here (the caller still sizes the canvas to both).
  canvasWidth: number,
): void {
  const { frameConfig: config, slots, textBars, sections } = design;
  const grid = buildGrid(config, canvasWidth);
  const frameSlots = grid.slots;
  const m = schoolRenderMetrics(config, canvasWidth);

  // Coverage, resolved from the tiles that actually RENDER (an anchor in a
  // section-suppressed panel paints nothing, so it must cover nothing) — the same
  // rule the on-screen canvas uses, so the print matches the preview.
  const covered = coveredBySnappets(visibleAnchorSlots(slots, grid, sections), grid);
  const barCovered = new Set(coveredSlotIds(textBars));

  // 1) Background is TRANSPARENT — the canvas starts clear and we never fill it. Only
  //    the printed elements below paint ink (white tiles, section panels, banners); the
  //    frame body, the gaps, and the license-plate opening all stay transparent so the
  //    UV printer lays NO ink there. Printing the frame/plate solid black would waste a
  //    lot of ink on areas the physical frame + the customer's real plate already cover.
  //    The on-screen preview still shows a black frame body + a plate to help the
  //    customer visualize; the print deliberately diverges. `images.plate` stays unused.

  // 3) Ring + wing tiles, including multi-cell snappet anchors at their span size.
  //    Every printed cell is a WHITE snappet (art sits on white); covered cells,
  //    banner-covered cells and section-suppressed cells are skipped (drawn by the
  //    anchor, the banner, or the section overlay respectively).
  for (const slot of frameSlots) {
    if (barCovered.has(slot.id)) continue;
    if (covered.has(slot.id)) continue;
    if (slotSuppressed(slot, sections, config)) continue;

    const tile = slots[slot.id];
    const span = tileSpan(tile);
    const w = span.cols * m.tileSize;
    const h = span.rows * m.tileSize;

    ctx.save();
    roundRect(ctx, slot.x, slot.y, w, h, 2);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(slot.x, slot.y, w, h);
    if (tile) {
      if (tile.image) {
        const img = images.snappets.get(slot.id);
        if (img) drawFit(ctx, img, slot.x, slot.y, w, h, "cover", 1);
      } else {
        const piece = getPiece(tile.pieceId);
        const art = piece?.artworkUrl ? images.pieces.get(piece.artworkUrl) : undefined;
        if (art) {
          drawFit(ctx, art, slot.x, slot.y, w, h, "cover", 1);
        } else if (piece) {
          ctx.fillStyle = piece.backgroundColor;
          ctx.fillRect(slot.x, slot.y, w, h);
        }
      }
    }
    ctx.restore();
  }

  // 4) Section panels (school builder) — TEXT or IMAGE. One direct-print piece over
  //    the whole panel's bounding box (which OWNS its corners — see panelOf). Tiles
  //    under it were skipped above.
  for (const id of SECTION_IDS) {
    const sec = sections[id];
    if (!sec || sec.mode === "tiles") continue;
    const box = sectionBounds(id, frameSlots, config);
    if (!box) continue;
    if (sec.mode === "text" && sec.text) {
      drawTextBlock(ctx, sec.text, box.x, box.y, box.width, box.height);
    } else if (sec.mode === "image") {
      const img = images.sections.get(id);
      ctx.save();
      roundRect(ctx, box.x, box.y, box.width, box.height, 3);
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(box.x, box.y, box.width, box.height);
      if (img) drawFit(ctx, img, box.x, box.y, box.width, box.height, sec.imageFit ?? "cover", 1);
      ctx.restore();
    }
  }

  // 5) Text banners — the compose-frame bug fixed via schoolBannerRect (wing offset
  //    + base bottom row).
  for (const bar of textBars) {
    const rect = schoolBannerRect(bar, m);
    drawTextBar(ctx, bar, rect.x, rect.y, rect.width, rect.height, images.qr);
  }
}

// ─── Browser entry point ─────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Overspray bleed per side when exporting PANELS separately (`composeSchoolPanels`).
 *  The panel art is drawn a hair oversize so a little UV overspray hides the cut edge
 *  — the same trick the jig uses (1.03" print for a 0.992" tile face). */
export const SCHOOL_PANEL_BLEED_INCHES = 0.04;

/**
 * Load every bitmap a design needs and draw the WHOLE frame (un-rotated) to a canvas.
 * Shared by `composeSchoolFrame` (assembled sheet) and `composeSchoolPanels` (4 files).
 * Returns null on the server or if a 2D context can't be had.
 */
async function renderSchoolFrameCanvas(
  design: SchoolDesign,
  dpi: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number } | null> {
  if (typeof document === "undefined") return null;

  const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) { try { await fonts.ready; } catch { /* ignore */ } }

  const { frameConfig: config, slots, textBars, qrCode, sections } = design;
  const { width: W, height: H } = schoolCanvasSize(config, dpi);

  // Which tiles will actually draw (mirror drawSchoolFrame's skip rules) — so we only
  // pay to load bitmaps that appear.
  const grid = buildGrid(config, W);
  const covered = coveredBySnappets(visibleAnchorSlots(slots, grid, sections), grid);
  const barCovered = new Set(coveredSlotIds(textBars));

  const bundle: SchoolImageBundle = {
    plate: null,
    pieces: new Map(),
    snappets: new Map(),
    sections: new Map(),
    qr: null,
  };
  const objectUrls: string[] = [];

  const loadBlobImage = async (blob: Blob): Promise<HTMLImageElement | null> => {
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return loadImage(url);
  };

  const jobs: Promise<void>[] = [];

  // Plate is intentionally NOT loaded or drawn — the print leaves the plate opening
  // blank (the customer inserts their real plate). See drawSchoolFrame step 2.

  // Tiles / snappets.
  for (const slot of grid.slots) {
    if (barCovered.has(slot.id) || covered.has(slot.id)) continue;
    if (slotSuppressed(slot, sections, config)) continue;
    const tile = slots[slot.id];
    if (!tile) continue;
    if (tile.image) {
      const { fullResId, url } = tile.image;
      jobs.push(
        (async () => {
          const blob = fullResId ? await getFullRes(fullResId) : null;
          const img = blob ? await loadBlobImage(blob) : url ? await loadImage(url) : null;
          if (img) bundle.snappets.set(slot.id, img);
        })(),
      );
    } else {
      const piece = getPiece(tile.pieceId);
      if (piece?.artworkUrl && !bundle.pieces.has(piece.artworkUrl)) {
        const artUrl = piece.artworkUrl;
        bundle.pieces.set(artUrl, null as unknown as DrawableImage); // reserve the slot
        jobs.push(loadImage(artUrl).then((img) => {
          if (img) bundle.pieces.set(artUrl, img); else bundle.pieces.delete(artUrl);
        }));
      }
    }
  }

  // Image-mode section panels.
  for (const id of SECTION_IDS) {
    const sec = sections[id];
    if (!sec || sec.mode !== "image") continue;
    jobs.push(
      (async () => {
        const blob = sec.fullResId ? await getFullRes(sec.fullResId) : null;
        const img = blob ? await loadBlobImage(blob) : sec.imageUrl ? await loadImage(sec.imageUrl) : null;
        if (img) bundle.sections.set(id, img);
      })(),
    );
  }

  // QR (any banner that carries it renders the design's single QR).
  if (textBars.some((b) => b.qr)) {
    jobs.push(
      QRCode.toDataURL(qrCode.url, { margin: 1, width: 512 })
        .then((u) => loadImage(u))
        .then((img) => { bundle.qr = img; })
        .catch(() => { /* no QR on failure */ }),
    );
  }

  await Promise.all(jobs);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
    return null;
  }
  drawSchoolFrame(ctx, design, bundle, W);
  // The bitmaps have been rasterized into the canvas; their object URLs are done.
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  return { canvas, width: W, height: H };
}

/** Rotate a canvas 90° when it's portrait, so its long axis lies horizontal (fits the
 *  bed / a fixed drop orientation). Returns the same canvas when already landscape. */
function rotateToLandscape(src: HTMLCanvasElement): HTMLCanvasElement {
  if (src.height <= src.width) return src;
  const rot = document.createElement("canvas");
  rot.width = src.height;
  rot.height = src.width;
  const rctx = rot.getContext("2d");
  if (!rctx) return src;
  rctx.translate(src.height, 0);
  rctx.rotate(Math.PI / 2);
  rctx.drawImage(src, 0, 0);
  return rot;
}

/**
 * Render a school design to a print-ready PNG data URL (browser only) — the ASSEMBLED
 * frame, rotated to lie along the 16.5" bed axis and DPI-stamped. Returns "" on the
 * server (no document).
 */
export async function composeSchoolFrame(
  design: SchoolDesign,
  opts: ComposeSchoolOptions = {},
): Promise<string> {
  const dpi = opts.dpi ?? SCHOOL_PRINT_DPI;
  const r = await renderSchoolFrameCanvas(design, dpi);
  if (!r) return "";
  const out = shouldRotateForBed(r.width, r.height) ? rotateToLandscape(r.canvas) : r.canvas;
  const { setPngDpi } = await import("@/lib/utils/eufy-print-core");
  return setPngDpi(out.toDataURL("image/png"), dpi);
}

/** One separately-printable panel PNG (see `composeSchoolPanels`). */
export interface SchoolPanelPng {
  id: SectionId;
  label: string;
  /** DPI-stamped PNG data URL, rotated to landscape, transparent background. */
  dataUrl: string;
  /** Final printed size (after bleed + rotation), inches. */
  widthInches: number;
  heightInches: number;
}

/**
 * Render the design as FOUR separate panel PNGs — left, right, top, bottom — instead
 * of one assembled sheet, so each can be positioned independently on the eufyMake bed
 * (the assembled sheet's seams are hard to hit with the bed's positioning system).
 *
 * Each panel is cropped from the full render at its `panelRects` rectangle, drawn a
 * hair oversize to add overspray BLEED, rotated to landscape (`auto-rotate to fit`),
 * and DPI-stamped. Panels with NO ink (fully transparent) are skipped — an empty panel
 * has nothing to print. Browser only; returns [] on the server.
 */
export async function composeSchoolPanels(
  design: SchoolDesign,
  opts: ComposeSchoolOptions & { bleedInches?: number } = {},
): Promise<SchoolPanelPng[]> {
  const dpi = opts.dpi ?? SCHOOL_PRINT_DPI;
  const bleedPx = (opts.bleedInches ?? SCHOOL_PANEL_BLEED_INCHES) * dpi;
  const r = await renderSchoolFrameCanvas(design, dpi);
  if (!r) return [];

  const config = design.frameConfig;
  const tilePx = config.tileSizeInches * dpi;
  const rects = panelRects(config);
  const { setPngDpi } = await import("@/lib/utils/eufy-print-core");

  const out: SchoolPanelPng[] = [];
  for (const id of SECTION_IDS) {
    const box = panelBleedBox(rects[id], tilePx, bleedPx);

    const c = document.createElement("canvas");
    c.width = box.outW;
    c.height = box.outH;
    const cx = c.getContext("2d");
    if (!cx) continue;
    // TRUE bleed — the panel art is drawn at 1:1 (NEVER scaled/enlarged). The crop is
    // EXTENDED outward by the bleed on every side (box.srcW === box.outW), so the margin
    // is filled with the real adjacent pixels: a neighbouring panel's tiles at a shared
    // seam, or transparent past the frame's outer edge. The panel's own content keeps
    // its true size, so tiles print at the design's exact dimensions and seams line up.
    cx.drawImage(r.canvas, box.srcX, box.srcY, box.srcW, box.srcH, 0, 0, box.outW, box.outH);
    const { outW, outH } = box;

    // Skip a panel that carries no ink at all (nothing to print).
    if (isCanvasBlank(cx, outW, outH)) continue;

    const fin = rotateToLandscape(c);
    out.push({
      id,
      label: SECTION_LABELS[id],
      dataUrl: setPngDpi(fin.toDataURL("image/png"), dpi),
      widthInches: fin.width / dpi,
      heightInches: fin.height / dpi,
    });
  }
  return out;
}

/** True if every sampled pixel is fully transparent (a coarse step keeps it cheap). */
function isCanvasBlank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return false; // can't inspect → assume it has content (never drop real art)
  }
  // Sample every ~16th pixel's alpha; any opaque sample means "not blank".
  for (let i = 3; i < data.length; i += 4 * 16) {
    if (data[i] !== 0) return false;
  }
  return true;
}
