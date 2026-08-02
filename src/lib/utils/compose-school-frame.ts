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
  BottomTab,
  SectionId,
  SectionState,
  TextBarPlacement,
} from "@/lib/types";
import { getRenderHeightInches, getTotalWidthInches } from "@/lib/constants/frame";
import { buildGrid } from "@/lib/utils/slot-generator";
import {
  coveredBySnappets,
  frameCorners,
  tileSpan,
  visibleAnchorSlots,
} from "@/lib/utils/snappet";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import {
  fitTextBarFont,
  textBarAvailWidth,
  QR_SIZE_RATIO,
  QR_GAP_RATIO,
} from "@/lib/utils/text-bar";
import {
  SECTION_IDS,
  SECTION_LABELS,
  sectionBounds,
  sectionSupportsText,
  slotSuppressed,
} from "@/lib/utils/sections";
import { panelRects, type PanelRect } from "@/lib/utils/panels";
import { bannerBands, trackingPx, widthLimitedFont } from "@/lib/utils/banner-tiers";
import { frameTab, tabPath, tabTextBox } from "@/lib/utils/bottom-tab";
import { bannerConfigFor, bannerLogoLayout, sectionSupportsLogo } from "@/lib/utils/banner-logo";
import { getPiece } from "@/data/sets";
import {
  BRASS,
  rimRamp,
  artInset,
  tileField,
  artShadow,
  bevelAxis,
  bevelGradient,
  bevelMetrics,
  chromeInset,
  cornerRadii,
  insetRadii,
  luminance,
  NO_CORNERS,
  type CornerRadii,
  rimMetrics,
  shift,
  textChenille,
  tileBackground,
} from "@/lib/utils/tile-theme";
import { getFullRes } from "@/lib/utils/image-store";

/** Default print resolution. 300 DPI is the eufyMake sheet standard. */
export const SCHOOL_PRINT_DPI = 300;

/** eufyMake E1 printable bed, inches. The output is rotated so its LONG axis lies
 *  along the bed's 16.5" side (the school frame fits only in that orientation). */
export const EUFY_BED_LONG_INCHES = 16.5;
export const EUFY_BED_SHORT_INCHES = 13;

/**
 * Geometry for one panel PNG: the panel's TRUE source rectangle in the full render,
 * plus the integer bleed and the output size. The panel content draws 1:1 at
 * `(bleed, bleed)` (never scaled), and the bleed margin is filled by EDGE-CLAMP — the
 * panel's own outermost pixels replicated outward. Crucially this does NOT sample the
 * neighbouring panel, so the bleed never leaves a stray sliver of an adjacent tile at a
 * seam (which showed up as artifacts on spaced-apart panels). Pure — node-testable.
 */
export function panelBleedBox(rc: PanelRect, tilePx: number, bleedPx: number) {
  const bleed = Math.max(0, Math.round(bleedPx));
  const contentX = rc.col0 * tilePx;
  const contentY = rc.row0 * tilePx;
  const contentW = (rc.col1 - rc.col0 + 1) * tilePx;
  const contentH = (rc.row1 - rc.row0 + 1) * tilePx;
  const outW = Math.max(1, Math.round(contentW) + 2 * bleed);
  const outH = Math.max(1, Math.round(contentH) + 2 * bleed);
  return { contentX, contentY, contentW, contentH, bleed, outW, outH };
}

/**
 * Draw the faux bevel that makes a printed tile read as a raised snap-in badge.
 *
 * The band is the area between two rounded rectangles — the tile's outer contour
 * and the same contour brought inward — filled with one gradient running from the
 * upper-left light source to the lower-right shade.
 *
 * It used to be four flat trapezoids, which mitred at 45 degrees. That put a hard
 * diagonal seam across every corner while the brass rim beside it curved, and no
 * amount of colour tuning hides a straight line crossing a round one. Filling a
 * contour-following band removes the seam entirely: there are no corner joins to
 * misalign, because there are no separate pieces.
 *
 * Layered from the outside in: hairline, brass rim, then the bevel inside the rim.
 * The bevel sits INSIDE so the rim reads as the tile's machined edge with the lip
 * behind it, rather than the two fighting over the same few pixels as before.
 */
function drawBevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  m: ReturnType<typeof bevelMetrics>,
  background: string,
  /** One grid cell, so the edge is the same width on every badge and both bars. */
  unit: number,
  /** Per-corner radii — wide where the badge faces the frame's outside. */
  radii: CornerRadii,
  /** School colour standing in for the brass, or null for gold. */
  rimColor?: string | null,
): void {
  const rim = rimMetrics(w, h, unit);

  // Hairline outline — stops two adjacent badges from bleeding into one shape.
  ctx.beginPath();
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radii);
  ctx.strokeStyle = "rgba(0,0,0,0.30)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // The SURROUND, outside the rim. A shade darker than the field so the brass has
  // something to sit against: with the same field colour on both sides the rim reads
  // as a line printed on a flat surface, and with the surround dropped the eye reads
  // the rim as standing proud of a recess. Filled as a ring from the tile edge in to
  // the rim's OUTER edge, so it never encroaches on the metal.
  const surroundTo = rim.inset - rim.width / 2;
  if (surroundTo > 0) {
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, x, y, w, h, radii);
    roundRectPath(ctx, x + surroundTo, y + surroundTo, w - surroundTo * 2, h - surroundTo * 2,
      insetRadii(radii, surroundTo));
    ctx.clip("evenodd");
    ctx.fillStyle = shift(background, luminance(background) > 0.5 ? -0.10 : -0.22);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // BRASS rim, thin. Stroked with a gradient along the same upper-left light axis
  // as the bevel, because a flat gold line reads as a yellow stroke while a
  // bright-to-dark run reads as metal.
  const ramp = rimRamp(rimColor);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, ramp.light);
  g.addColorStop(0.5, ramp.mid);
  g.addColorStop(1, ramp.dark);
  ctx.beginPath();
  roundRect(
    ctx,
    x + rim.inset,
    y + rim.inset,
    w - rim.inset * 2,
    h - rim.inset * 2,
    insetRadii(radii, rim.inset),
  );
  ctx.strokeStyle = g;
  ctx.lineWidth = rim.width;
  ctx.stroke();

  // The bevel band, FLUSH against the inside of the rim.
  //
  // A canvas stroke straddles its path: `lineWidth` is centred on it, so the brass
  // actually spans `inset ± width/2`, and its inner edge is at `inset + width/2`.
  // Starting the bevel at `inset + width` — the natural-looking arithmetic, and what
  // this did — therefore left a band of bare field exactly half the rim wide between
  // the metal and the bevel. At the old hairline rim that was a pixel and invisible;
  // once the rim was beefed up it became an obvious gap, and it made the two rings
  // read as unrelated decorations rather than one machined edge.
  const rimTo = rim.inset + rim.width / 2;
  const bx = x + rimTo;
  const by = y + rimTo;
  const bw = w - rimTo * 2;
  const bh = h - rimTo * 2;
  if (bw <= 0 || bh <= 0) return;
  const t = Math.min(m.thickness, Math.floor(Math.min(bw, bh) / 2));
  if (t <= 0) return;
  const outerR = insetRadii(radii, rimTo);

  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, bx, by, bw, bh, outerR);
  roundRectPath(ctx, bx + t, by + t, bw - t * 2, bh - t * 2, insetRadii(outerR, t));
  ctx.clip("evenodd");
  const ax = bevelAxis(bx, by, bw, bh);
  const bg = ctx.createLinearGradient(ax.x0, ax.y0, ax.x1, ax.y1);
  for (const [at, colour] of bevelGradient(background, bw, bh)) bg.addColorStop(at, colour);
  ctx.fillStyle = bg;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
}

// ── The design, passed in explicitly (NOT read from any store) ────────────────
export interface SchoolDesign {
  frameConfig: FrameConfig;
  /** Frame body colour. Absent on a design saved before it existed. */
  frameColor?: string;
  /** School colour behind every badge, or null/absent for each piece's own field. */
  tileFieldColor?: string | null;
  /** School colour standing in for the brass rim, or null/absent for gold. */
  rimColor?: string | null;
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
  /** Banner crests, keyed by the SectionId whose text config carries one. Separate
   *  from `sections` because that map holds an IMAGE-mode panel — a section can be
   *  in text mode and still have a crest, and the two are drawn quite differently. */
  logos: Map<SectionId, DrawableImage>;
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

/** Append a rounded rect to the CURRENT path without starting a new one, so two of
 *  them can be combined into a ring and filled or clipped "evenodd". */
/** A single radius, or one per corner so a badge can open up only the corners that
 *  face the frame's outside (see `cornerRadii`). */
type Radius = number | CornerRadii;

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: Radius,
) {
  const cap = Math.min(w / 2, h / 2);
  const c = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  const tl = Math.max(0, Math.min(c.tl, cap));
  const tr = Math.max(0, Math.min(c.tr, cap));
  const br = Math.max(0, Math.min(c.br, cap));
  const bl = Math.max(0, Math.min(c.bl, cap));
  // Each arcTo carries its OWN radius, which is what lets one corner be wide while
  // the other three stay at the ordinary tile radius.
  ctx.moveTo(x + tl, y);
  ctx.arcTo(x + w, y, x + w, y + h, tr);
  ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.arcTo(x, y + h, x, y, bl);
  ctx.arcTo(x, y, x + w, y, tl);
  ctx.closePath();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: Radius,
) {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, r);
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
  /** School colour standing in for the brass merrow thread round the lettering. */
  rimColor?: string | null,
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
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // CHENILLE, same treatment as the section text — the banner is the most-seen type on
  // the frame, so if only one of the two carried it the product would read as two
  // different objects. Stroke UNDER the fill (outer gold thread, then the dark seat),
  // then the softened emboss, then the face.
  {
    const bx = x + w / 2;
    const by = y + h / 2 + h * 0.04;
    const em = textChenille(fontPx, cfg.textColor, rimColor);
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    ctx.save();
    ctx.shadowColor = em.shadow.colour;
    ctx.shadowBlur = em.shadow.blur;
    ctx.shadowOffsetX = em.shadow.offsetX;
    ctx.shadowOffsetY = em.shadow.offsetY;
    ctx.strokeStyle = em.merrow.thread;
    ctx.lineWidth = em.merrow.width;
    ctx.strokeText(text, bx, by);
    ctx.restore();

    ctx.strokeStyle = em.merrow.seatColour;
    ctx.lineWidth = em.merrow.seat;
    ctx.strokeText(text, bx, by);

    ctx.fillStyle = em.shade;
    ctx.fillText(text, bx + em.depth, by + em.depth);
    ctx.fillStyle = em.highlight;
    ctx.fillText(text, bx - em.depth, by - em.depth);

    ctx.fillStyle = cfg.textColor;
    ctx.fillText(text, bx, by);
  }
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
    if (glyphs > 0) {
      widthLimited = Math.min(widthLimited, widthLimitedFont(glyphs / probe, ln.length, letterSpacing, contentW));
    }
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
  /** One grid cell — keeps the bar's edge identical to the badges' and to the
   *  other bar, regardless of how many rows tall the panel is. */
  unit: number,
  /** School colour standing in for the brass, so the bars match the badges. */
  rimColor?: string | null,
  /** The crest bitmap, when this banner carries one and it loaded. */
  logoImg?: DrawableImage | null,
  /** The keystone, when this is a bottom bar on a frame that has one. */
  tab?: { tab: BottomTab; pxPerInch: number } | null,
) {
  const bevel = bevelMetrics(w, h, cfg.backgroundColor, unit);
  // A banner never reaches a frame corner on this geometry — the wings do, and they
  // run the full height on both sides. Ordinary radii all round.
  const radii = cornerRadii(unit, NO_CORNERS);
  ctx.save();
  // Rounded like the badges, not square. A square-cornered bar carrying a rounded
  // brass rim was the loudest mismatch between the bars and the badges.
  roundRect(ctx, x, y, w, h, radii);
  ctx.clip();
  // Banners wear the SAME chrome as the badges — bevel and brass rim — because in
  // the mock the bars and the badges read as one system.
  //
  // FLAT FILL, exactly like a badge's field. There used to be a vertical GLOSS
  // here (`glossStops`: +14% at the top, -8% at the bottom) that no badge ever
  // got. Both were painting the same hex and rendering visibly different shades:
  // measured on a real SLUH sheet, the top banner came out rgb(44,74,114) and the
  // bottom rgb(25,53,88) against a frame body of rgb(24,59,103). That is the
  // "top/bottom aren't the same colour as left/right" the owner reported three
  // times, and no amount of correcting the KIT could have fixed it, because the
  // kit was already right and the renderer was overruling it.
  //
  // The shading that makes a bar look like a part still happens — `drawBevel`
  // below does it, on the same contour-following run the badges use. This only
  // removes the second, banner-only gradient stacked on top of it.
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, w, h);
  drawBevel(ctx, x, y, w, h, bevel, cfg.backgroundColor, unit, radii, rimColor);

  // Clear the chrome before the text starts. Derived from the chrome itself rather
  // than guessed alongside it, so the bevel can never cut into a descender again.
  const pad = Math.max(
    Math.min(w, h) * SECTION_PAD_RATIO,
    chromeInset(w, h, cfg.backgroundColor, unit),
  );
  // A crest set into the banner takes width from the text BEFORE the font is fitted,
  // and shifts where the text is anchored. Same helper the builder calls, so the
  // printed lockup matches the one on screen rather than approximating it.
  const logoBox = bannerLogoLayout(cfg, w, h, pad);
  const contentW = Math.max(1, logoBox?.textWidth ?? w - pad * 2);
  const contentH = Math.max(1, h - pad * 2);
  const headline = cfg.text ?? "";
  const taglineRaw = cfg.tagline?.trim() ? cfg.tagline : "";
  const fill = cfg.fontSize ?? 1;
  const ls = cfg.letterSpacing ?? 0;
  const contentTop = y + pad;
  const align = cfg.textAlign;
  const textLeft = x + (logoBox?.textX ?? pad);
  const tx =
    align === "left"
      ? textLeft
      : align === "right"
        ? textLeft + contentW
        : textLeft + contentW / 2;

  // Draw one tier's `\n` lines, vertically centered within a band that starts
  // `bandTop` below the content top and is `bandH` tall.
  const drawTier = (str: string, fontPx: number, bandTop: number, bandH: number, family: string) => {
    ctx.font = `800 ${fontPx}px ${family}`;
    ctx.fillStyle = cfg.textColor;
    ctx.textBaseline = "middle";
    // Capped against the fitted size, exactly as the on-screen renderer does. At
    // print resolution the cap never binds, which is the point: the sheet is
    // unchanged and the phone stops being the odd one out.
    try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${trackingPx(ls, fontPx)}px`; } catch { /* unsupported */ }
    ctx.textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
    const lines = str.split("\n");
    const lineBox = fontPx * SECTION_LINE_HEIGHT;
    const bandCenter = contentTop + bandTop + bandH / 2;
    let ty = bandCenter - (lineBox * lines.length) / 2 + lineBox / 2;
    // Three passes make the type raised rather than printed on: the shaded underside
    // (carrying the cast shadow), the lit edge above it, then the face on top. Same
    // upper-left light as the badge edges, so the letters belong to the same object.
    // CHENILLE. The letters are a felt varsity patch, not engraving: a merrow border
    // stroked UNDER the fill, then the softened emboss on top. Order matters and is
    // outside-in — cast shadow, gold thread, dark seat, shade, lit edge, face. Stroke
    // before fill, always, or the thread eats the letterform's own weight.
    // The rim override reaches the LETTERING too — see merrowThread. Omitting it
    // here is why the print sheet kept the brass thread while the builder drew a
    // white one: the two renderers were passing different arguments to the same
    // function, which is exactly the drift tile-theme exists to prevent.
    const em = textChenille(fontPx, cfg.textColor, rimColor);
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    for (const ln of lines) {
      // The cast shadow rides the OUTERMOST pass so it falls from the patch's true
      // silhouette (thread included), not from the letter inside it.
      ctx.save();
      ctx.shadowColor = em.shadow.colour;
      ctx.shadowBlur = em.shadow.blur;
      ctx.shadowOffsetX = em.shadow.offsetX;
      ctx.shadowOffsetY = em.shadow.offsetY;
      ctx.strokeStyle = em.merrow.thread;
      ctx.lineWidth = em.merrow.width;
      ctx.strokeText(ln, tx, ty);
      ctx.restore();

      // The seat between thread and felt. Without it the gold reads as a cartoon
      // keyline; the dark gap is what makes it look stitched ONTO something.
      ctx.strokeStyle = em.merrow.seatColour;
      ctx.lineWidth = em.merrow.seat;
      ctx.strokeText(ln, tx, ty);

      ctx.fillStyle = em.shade;
      ctx.fillText(ln, tx + em.depth, ty + em.depth);

      ctx.fillStyle = em.highlight;
      ctx.fillText(ln, tx - em.depth, ty - em.depth);

      ctx.fillStyle = cfg.textColor;
      ctx.fillText(ln, tx, ty);
      ty += lineBox;
    }
    try { (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px"; } catch { /* unsupported */ }
  };

  // With a keystone, the bar is ONE tier: the tagline moved up into the tab, so
  // the name gets the whole bar rather than 60% of it.
  const tagline = tab ? "" : taglineRaw;
  if (headline.length) {
    if (tagline) {
      const bands = bannerBands(contentH);
      const tagFamily = cfg.taglineFontFamily ?? cfg.fontFamily;
      const hFont = fitSectionFont(ctx, headline, cfg.fontFamily, ls, contentW, bands.headlineH, fill);
      const tFont = fitSectionFont(ctx, tagline, tagFamily, ls, contentW, bands.taglineH, fill);
      drawTier(headline, hFont, bands.headlineTop, bands.headlineH, cfg.fontFamily);
      drawTier(tagline, tFont, bands.taglineTop, bands.taglineH, tagFamily);
    } else {
      const fontPx = fitSectionFont(ctx, headline, cfg.fontFamily, ls, contentW, contentH, fill);
      drawTier(headline, fontPx, 0, contentH, cfg.fontFamily);
    }
  }

  // THE CREST, last so it sits over the gloss rather than under it — the same order
  // the builder gets for free by rendering the <img> after the text column. "contain"
  // because a crest is a mark, not a fill: a wide mark letterboxes inside its square
  // instead of being cropped, which is what the box was sized for.
  if (logoImg && logoBox) {
    if (logoBox.leftX != null) {
      drawFit(ctx, logoImg, x + logoBox.leftX, y + logoBox.y, logoBox.size, logoBox.size, "contain", 1);
    }
    if (logoBox.rightX != null) {
      drawFit(ctx, logoImg, x + logoBox.rightX, y + logoBox.y, logoBox.size, logoBox.size, "contain", 1);
    }
  }
  ctx.restore();

  // THE KEYSTONE, drawn LAST so it sits over the bar's own rim.
  //
  // The tab and the bar are ONE piece of material — Bill would 3D print them as a
  // single part — so there must be no line where they meet. The bar strokes a rim
  // around its whole rounded rectangle, including the top edge the tab stands on,
  // so the tab carries a SKIRT: its fill continues down past that edge far enough
  // to bury the rim, and its own rim runs the two slopes and the top only. The
  // result is one continuous body with one continuous edge.
  if (tab) {
    const rim = rimMetrics(w, h, unit);
    const skirt = rim.width + rim.inset + 1;
    const p = tabPath(tab.tab, x + w / 2, y, tab.pxPerInch, skirt);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.points[0].x, p.points[0].y);
    for (const pt of p.points.slice(1)) ctx.lineTo(pt.x, pt.y);
    ctx.closePath();
    ctx.fillStyle = cfg.backgroundColor;
    ctx.fill();
    // Rim on the SLOPES AND TOP only — points 1..4. The skirt's two vertical edges
    // are inside the bar, and stroking them would draw the very seam this exists
    // to remove.
    ctx.beginPath();
    ctx.moveTo(p.points[1].x, p.points[1].y);
    for (const pt of p.points.slice(2, 5)) ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = rimRamp(rimColor).mid;
    ctx.lineWidth = rim.width;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.stroke();
    ctx.restore();

    // The tagline lives in the tab now, above the name instead of below it.
    const line = cfg.tagline?.trim();
    if (line) {
      const box = tabTextBox(tab.tab, tab.pxPerInch);
      const family = cfg.taglineFontFamily ?? cfg.fontFamily;
      ctx.save();
      ctx.font = `700 100px ${family}`;
      const em = ctx.measureText(line).width / 100;
      const fontPx = Math.min(box.height, widthLimitedFont(em, line.length, 0, box.width));
      ctx.font = `800 ${fontPx}px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const ch = textChenille(fontPx, cfg.textColor, rimColor);
      const cx = x + w / 2;
      const cy = y - p.rise / 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = ch.merrow.thread;
      ctx.lineWidth = ch.merrow.width;
      ctx.strokeText(line, cx, cy);
      ctx.fillStyle = cfg.textColor;
      ctx.fillText(line, cx, cy);
      ctx.restore();
    }
  }
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
    // An EMPTY pocket prints NOTHING — no field, no bevel, no rim. It is a hole in
    // the frame where the base shows through, so giving it badge chrome turned every
    // unused cell into a blank white badge and made the frame read as a grid of
    // vacancies. Leaving it transparent is also what keeps ink off the sheet.
    //
    // This MUST come before the save() below: skipping past a save without its
    // matching restore would leak canvas state once per empty cell.
    if (!tile) continue;

    const span = tileSpan(tile);
    const w = span.cols * m.tileSize;
    const h = span.rows * m.tileSize;

    ctx.save();
    const piece0 = !tile.image ? getPiece(tile.pieceId) : undefined;
    // An upload's field was derived from its own pixels at crop time and stored on
    // the tile (see fieldForArtPixels) — hard-coding white here is what made a
    // white-on-transparent school logo print invisible. Absent (older designs,
    // sampler failure) falls back to white, and the builder falls back with it.
    // Both routes flow through tileField, so a school colour override reskins
    // uploads exactly the way it reskins pieces.
    // Per-tile override wins over the design-wide one, which wins over the piece's
    // own colour. Resolved identically in PlacedTileView, because the two renderers
    // disagreeing about a colour is the exact failure tile-theme exists to prevent.
    const field =
      tile.field ??
      (piece0
        ? tileField(piece0, design.tileFieldColor)
        : tileField({ backgroundColor: tile.image?.field ?? "#FFFFFF" }, design.tileFieldColor));
    const bevel = bevelMetrics(w, h, field, m.tileSize);
    // Open up whichever corners face the frame's OUTSIDE, so the whole assembly
    // reads as one rounded part rather than a grid of separately-rounded squares.
    const anchorCoord = grid.coordOf(slot.id);
    const radii = cornerRadii(
      m.tileSize,
      anchorCoord ? frameCorners(grid, anchorCoord, span) : NO_CORNERS,
    );
    roundRect(ctx, slot.x, slot.y, w, h, radii);
    ctx.clip();
    // The FIELD behind the art. Previously hard-coded white, which silently
    // disagreed with the on-screen tile for any piece with transparent art — and
    // left the printed sheet looking like stickers on paper rather than a set of
    // badges. `tileBackground` is the single answer both renderers now use.
    const piece = piece0;
    ctx.fillStyle = field;
    ctx.fillRect(slot.x, slot.y, w, h);
    {
      if (tile.image) {
        const img = images.snappets.get(slot.id);
        if (img) drawFit(ctx, img, slot.x, slot.y, w, h, "cover", 1);
      } else {
        const art = piece?.artworkUrl ? images.pieces.get(piece.artworkUrl) : undefined;
        // Art sits ON the field at its own aspect; the field fills the rest. Where
        // the art has alpha (Becky's die-cut snappets) the field shows through,
        // which is exactly what makes the set read as one scheme.
        //
        // Drawn with a CAST SHADOW so the art reads as a layer sitting on the
        // field rather than printed flat into it. Canvas throws the shadow from
        // the image's own alpha silhouette, which is why cutting the backgrounds
        // out was the prerequisite: a solid square would merely get a rectangular
        // shadow behind its own edge and look no different.
        if (art) {
          const sh = artShadow(w, h);
          ctx.save();
          ctx.shadowColor = sh.color;
          ctx.shadowBlur = sh.blur;
          ctx.shadowOffsetX = sh.offsetX;
          ctx.shadowOffsetY = sh.offsetY;
          // CONTAIN, not cover. A badge is a mark on a field, and cover crops
          // whatever does not match the footprint's aspect — so a square logo
          // resized to 2x1 lost its top and bottom, which is the worst possible
          // half of a lockup to remove. Contained, the whole mark stays inside and
          // the field simply shows either side of it, which is what the field is
          // for. (Uploaded photos keep cover: they are meant to fill their frame,
          // and an aspect change routes through the re-crop modal instead.)
          //
          // INSET past the chrome — rim inset + rim width + bevel thickness, the
          // same three rings the builder nests its <img> inside. Drawn at the full
          // tile rect, art reached under the rim to the tile edge, and because the
          // bevel is painted after with translucent shading, it landed ON the art
          // instead of framing it. Invisible while the art files carried their own
          // generous margins; the moment they were trimmed to their true bounds,
          // every badge's art collided with its own edge. The two renderers must
          // agree on where art may live, or trimmed art previews clean and prints
          // dirty.
          // Plus AIR. Inset to exactly the bevel's inner edge, art that runs out to
          // its own bounding box — a rounded-square patch, a crest with a border —
          // met the shaded band with nothing between them and read as cut into.
          // `artInset` is the one answer both renderers ask for, so they cannot drift.
          const chrome = artInset(w, h, field, m.tileSize);
          drawFit(ctx, art, slot.x + chrome, slot.y + chrome, w - chrome * 2, h - chrome * 2, "contain", 1);
          ctx.restore();
        }
      }
    }
    // Faux bevel LAST, so it sits over the art and reads as the badge's moulding.
    // Still inside the clip, so it follows the rounded corner.
    drawBevel(ctx, slot.x, slot.y, w, h, bevel, field, m.tileSize, radii, tile.rim ?? design.rimColor);
    ctx.restore();
  }

  // 4) Section panels (school builder) — TEXT or IMAGE. One direct-print piece over
  //    the whole panel's bounding box (which OWNS its corners — see panelOf). Tiles
  //    under it were skipped above.
  for (const id of SECTION_IDS) {
    const sec = sections[id];
    if (!sec || sec.mode === "tiles") continue;
    // Text belongs to the top/bottom banners only. Honouring it on a wing would
    // reproduce the stranded state the persist migration exists to clear: the UI
    // stopped offering the toggle there, so a wing drawn as text has no way back.
    if (sec.mode === "text" && !sectionSupportsText(id)) continue;
    const box = sectionBounds(id, frameSlots, config);
    if (!box) continue;
    if (sec.mode === "text" && sec.text) {
      // The keystone belongs to the BOTTOM bar only, and only on a frame that
      // declares one. Everything else draws a plain rectangular bar exactly as
      // it always has.
      const tab = id === "bottom" && frameTab(config)
        ? { tab: frameTab(config)!, pxPerInch: m.scale }
        : null;
      drawTextBlock(
        ctx, bannerConfigFor(id, sec.text), box.x, box.y, box.width, box.height, m.tileSize,
        design.rimColor, images.logos.get(id) ?? null, tab,
      );
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
    drawTextBar(ctx, bar, rect.x, rect.y, rect.width, rect.height, images.qr, design.rimColor);
  }

  // 6) BACKING. Every transparent pixel gets opaque black behind it.
  //
  // A badge is a rounded rectangle, so where two of them meet the corners leave a
  // small lens with no ink in it, and the same is true of the gaps between panels
  // and anywhere the art itself is transparent. On screen that reads as the frame
  // body showing through and looks fine. On the PRINTED part it is the bare
  // snappet/panel underneath, and the operator sees it bleeding through at every
  // seam.
  //
  // `destination-over` paints only where nothing has been drawn yet, so this is the
  // whole fix in one pass: full-alpha pixels are untouched, partial-alpha edges
  // composite down onto black instead of onto whatever the substrate happens to be,
  // and every hole is closed with ink. No per-badge geometry, so it cannot get the
  // corner cases wrong the way a per-badge pad did — an earlier attempt at this used
  // a square pad reaching 1mm past each badge and squared off the frame's outer
  // corner radius, which is exactly the sort of thing a shape-aware fix invites.
  //
  // Deliberately LAST, after every layer, and deliberately the whole canvas rather
  // than the frame silhouette: the panel files are cropped out of this canvas, and a
  // printed part with an opaque ground is what stops the substrate reading through.
  // Height is derived, not passed: the caller sizes the canvas from the same two
  // numbers, so recomputing here keeps the backing exactly the canvas and avoids a
  // signature change on a function four call sites already use.
  backFillTransparent(ctx, canvasWidth, getRenderHeightInches(config) * m.scale, bodyColour(design));
}

/** The colour painted behind every transparent pixel on the print path. Black so the
 *  substrate cannot read through, and so partial-alpha edges darken into a defined
 *  line rather than fringing toward whatever the panel happens to be. */
export const PRINT_BACKING_COLOR = "#000000";

/** The design's frame-body colour, or the print default. A design saved before
 *  `frameColor` existed has none, and every read has to survive that. */
function bodyColour(design: SchoolDesign): string {
  return design.frameColor || PRINT_BACKING_COLOR;
}

/**
 * Fill every not-yet-painted pixel of `ctx` with the backing colour, leaving what is
 * already drawn exactly as it is.
 *
 * Separate and exported so a test can assert the invariant that matters — after this
 * runs, NOTHING in the output is transparent — without re-deriving the composite mode.
 */
export function backFillTransparent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colour: string = PRINT_BACKING_COLOR,
): void {
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = colour;
  // OVERSHOOT by a pixel on each axis. The caller sizes the canvas with Math.round on
  // both dimensions independently, while callers of this derive one of them by
  // multiplying a scale — so the fill can land a fraction of a pixel short and leave
  // the last row or column half-covered. A half-covered row is exactly the fringe
  // this function exists to prevent, and it cost a whole bottom row before the test
  // caught it. The canvas clips to its own bounds, so overshooting is free.
  ctx.fillRect(0, 0, Math.ceil(width) + 1, Math.ceil(height) + 1);
  ctx.globalCompositeOperation = prev;
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

/**
 * Overspray bleed per side when exporting PANELS separately. ZERO.
 *
 * It was 0.04in, borrowed from the tile jig where a slightly oversize print lets
 * overspray hide a cut edge. The school panels are a CONTINUOUS SHEET — nothing is
 * cut out of a pocket — so there is no cut edge to hide, and the bleed only made
 * every file bigger than the part it represents.
 *
 * That is what the operator was seeing on import. Because the bleed is a fixed
 * 0.08in total, it lands as a DIFFERENT percentage on every panel: 7.4% on the top
 * strip's height (0.991in of art on a 1.070in sheet), 3.9% across a wing, under 1%
 * along a long side. A file whose size is not the part's size has to be corrected by
 * hand on every import, differently each time.
 *
 * At zero, sheet size == part size and a panel imports at its true dimension. The
 * live /build path has never had bleed for the same reason.
 *
 * `composeSchoolPanels` still takes `bleedInches`, so a run that genuinely needs
 * overspray can ask for it explicitly.
 */
export const SCHOOL_PANEL_BLEED_INCHES = 0;

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

  // Wait for web fonts so text banners measure/paint with real glyph metrics — but
  // NEVER hang the export on it. A slow or blocked font CDN could leave fonts.ready
  // pending indefinitely; cap the wait so the render (and the download) always proceeds.
  const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) {
    try {
      await Promise.race([
        fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } catch { /* ignore */ }
  }

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
    logos: new Map(),
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

  // Banner crests. Print-resolution original when there is one — the crest lands at
  // roughly 0.7in square at 300dpi, where the preview proxy would visibly soften.
  for (const id of SECTION_IDS) {
    const sec = sections[id];
    const logo = sec?.mode === "text" && sectionSupportsLogo(id) ? sec.text?.logo : undefined;
    if (!logo?.url) continue;
    jobs.push(
      (async () => {
        const blob = logo.fullResId ? await getFullRes(logo.fullResId) : null;
        const img = blob ? await loadBlobImage(blob) : await loadImage(logo.url);
        if (img) bundle.logos.set(id, img);
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
    // EDGE-CLAMP bleed. The panel art draws 1:1 at (bleed, bleed) — NEVER scaled — so
    // tiles print at the design's exact dimensions. The bleed margin is then filled by
    // replicating the panel's OWN outermost row/column outward (edges) and its corner
    // pixels into the corners. This deliberately does NOT sample the neighbouring panel,
    // so a spaced-apart panel never carries a stray sliver of an adjacent tile at a seam
    // (the artifact seen on banner ends) — the overspray is only ever the panel's own colour.
    const { contentX: X, contentY: Y, contentW: W2, contentH: H2, bleed: b, outW, outH } = box;
    cx.drawImage(r.canvas, X, Y, W2, H2, b, b, W2, H2); // core, 1:1
    if (b > 0) {
      cx.drawImage(r.canvas, X, Y, W2, 1, b, 0, W2, b); // top edge
      cx.drawImage(r.canvas, X, Y + H2 - 1, W2, 1, b, b + H2, W2, b); // bottom edge
      cx.drawImage(r.canvas, X, Y, 1, H2, 0, b, b, H2); // left edge
      cx.drawImage(r.canvas, X + W2 - 1, Y, 1, H2, b + W2, b, b, H2); // right edge
      cx.drawImage(r.canvas, X, Y, 1, 1, 0, 0, b, b); // TL corner
      cx.drawImage(r.canvas, X + W2 - 1, Y, 1, 1, b + W2, 0, b, b); // TR corner
      cx.drawImage(r.canvas, X, Y + H2 - 1, 1, 1, 0, b + H2, b, b); // BL corner
      cx.drawImage(r.canvas, X + W2 - 1, Y + H2 - 1, 1, 1, b + W2, b + H2, b, b); // BR corner
    }

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
