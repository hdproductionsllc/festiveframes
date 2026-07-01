import QRCode from "qrcode";
import type { PlacedTextBar } from "@/lib/types";
import { defaultDesignStore } from "@/stores/design-store";
import { generateSlots } from "@/lib/utils/slot-generator";
import {
  coveredSlotIds,
  fitTextBarFont,
  textBarAvailWidth,
  QR_SIZE_RATIO,
  QR_GAP_RATIO,
} from "@/lib/utils/text-bar";
import { getScale, getContainerHeight, getPlateArea } from "@/lib/utils/layout";
import { getPiece } from "@/data/sets";
import { canDieCut } from "@/components/tiles/TileArtwork";
import { getPlateImageUrl, getPlateImageDisplay } from "@/data/plate-images";

// Canvas-based frame renderer. We composite tiles, plate, and text bars onto a
// <canvas> with drawImage instead of screenshotting the DOM, because WebKit
// (iOS Safari/Chrome) will not paint <img> inside the SVG <foreignObject> that
// html-to-image uses — leaving artwork tiles and the plate blank. drawImage of
// same-origin images works everywhere and keeps the canvas untainted.

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Request CORS so remote-CDN artwork (non-July4 sets) doesn't taint the
    // canvas — a tainted canvas makes toDataURL() throw, blanking the proof.
    // The CDN serves permissive CORS headers; same-origin tiles ignore this.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw an image into a rect with object-fit cover|contain + a center scale.
function drawFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  fit: "cover" | "contain", scale: number
) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
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
  ctx.drawImage(img, x + (w - cw) / 2, y + (h - ch) / 2, cw, ch);
}

function drawTextBar(
  ctx: CanvasRenderingContext2D,
  bar: PlacedTextBar,
  x: number, y: number, w: number, h: number,
  qrImg: HTMLImageElement | null
) {
  const cfg = bar.config;
  ctx.save();
  // Sharp 90° corners — printed banner artwork must NOT be rounded.
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, w, h);

  const qrSize = bar.qr ? h * QR_SIZE_RATIO : 0;
  const avail = textBarAvailWidth(w, h, bar.qr);
  const text = (cfg.text || "YOUR TEXT HERE");
  // Auto-fit: largest font that fills the bar (height-capped) yet fits the width.
  const fontPx = fitTextBarFont(ctx, text, cfg.fontFamily, cfg.letterSpacing, h, avail, cfg.fontSize ?? 1);
  ctx.font = `700 ${fontPx}px ${cfg.fontFamily}`;
  // Apply letter-spacing if the canvas supports it (so it matches the measure).
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
    ctx.beginPath();
    ctx.rect(qx, qy, s, s);
    ctx.fill();
    ctx.drawImage(qrImg, qx, qy, s, s);
  }
  ctx.restore();
}

/** Render the current design to a PNG data URL. Works on iOS (unlike DOM screenshot). */
export async function composeFrameImage(width = 1600): Promise<string> {
  if (typeof document === "undefined") return "";
  const s = defaultDesignStore.getState();
  const { frameConfig, slots, textBars, qrCode, plateState, dieCut } = s;

  const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) { try { await fonts.ready; } catch { /* ignore */ } }

  const W = width;
  const H = Math.round(getContainerHeight(frameConfig, W));
  const scale = getScale(frameConfig, W);
  const tile = frameConfig.tileSizeInches * scale;
  const frameSlots = generateSlots(frameConfig, W);
  const plate = getPlateArea(frameConfig, W);
  const covered = new Set(coveredSlotIds(textBars));

  // Preload every needed image in parallel.
  const artUrls = new Set<string>();
  for (const slot of frameSlots) {
    if (covered.has(slot.id)) continue;
    const placed = slots[slot.id];
    const piece = placed && getPiece(placed.pieceId);
    if (piece && piece.artworkUrl) artUrls.add(piece.artworkUrl);
  }
  const plateUrl = getPlateImageUrl(plateState);
  const qrUrl = textBars.some((b) => b.qr) ? await QRCode.toDataURL(qrCode.url, { margin: 1, width: 256 }).catch(() => "") : "";

  const loaded = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    [...artUrls, plateUrl || "", qrUrl || ""].filter(Boolean).map(async (u) => {
      loaded.set(u, await loadImage(u));
    })
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, H);

  // Plate
  if (plate) {
    const r = Math.max(3, plate.width * 0.012);
    ctx.save();
    roundRect(ctx, plate.x, plate.y, plate.width, plate.height, r);
    ctx.clip();
    ctx.fillStyle = "#e9e6df";
    ctx.fillRect(plate.x, plate.y, plate.width, plate.height);
    const pimg = plateUrl ? loaded.get(plateUrl) : null;
    if (pimg) {
      const disp = getPlateImageDisplay(plateState);
      drawFit(ctx, pimg, plate.x, plate.y, plate.width, plate.height, disp.objectFit, disp.scale);
    }
    ctx.restore();
  }

  // Tiles — a normal cell sits on WHITE (tiles print on white snappets), so
  // transparent artwork shows white behind it and blank/empty cells render white
  // too. A DIE-CUT-eligible tile (when the design's die-cut mode is on) is a
  // floating sticker: skip the white fill so the frame behind shows through the
  // cut-away alpha, matching what PlacedTileView renders on-screen. This keeps
  // the proof WYSIWYG with the builder for both modes.
  for (const slot of frameSlots) {
    if (covered.has(slot.id)) continue;
    const placed = slots[slot.id];
    const piece = placed ? getPiece(placed.pieceId) : null;
    const isDieCut = dieCut && placed != null && canDieCut(placed.pieceId);
    ctx.save();
    roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 2);
    ctx.clip();
    if (!isDieCut) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
    }
    if (piece) {
      const img = piece.artworkUrl ? loaded.get(piece.artworkUrl) : null;
      if (img) {
        drawFit(ctx, img, slot.x, slot.y, slot.width, slot.height, "cover", 1);
      } else {
        ctx.fillStyle = piece.backgroundColor;
        ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
      }
    }
    ctx.restore();
  }

  // Text bars
  const qrImg = qrUrl ? loaded.get(qrUrl) ?? null : null;
  for (const bar of textBars) {
    drawTextBar(ctx, bar, bar.startIndex * tile, bar.row === "top" ? 0 : H - tile, bar.widthUnits * tile, tile, qrImg);
  }

  return canvas.toDataURL("image/png");
}

/**
 * Render a single placed text bar to a print-ready PNG data URL.
 * unitPx 357 ≈ 360 DPI at the 0.991" tile pitch — crisp banner text (a touch
 * higher than the tiles' 300 DPI, since text edges benefit) while keeping the
 * file small.
 */
export async function composeBarImage(barId: string, unitPx = 357): Promise<string> {
  if (typeof document === "undefined") return "";
  const s = defaultDesignStore.getState();
  const bar = s.textBars.find((b) => b.id === barId);
  if (!bar) return "";

  const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) { try { await fonts.ready; } catch { /* ignore */ } }

  const w = bar.widthUnits * unitPx;
  const h = unitPx;
  const qrImg = bar.qr
    ? await loadImage(await QRCode.toDataURL(s.qrCode.url, { margin: 1, width: 256 }).catch(() => ""))
    : null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  drawTextBar(ctx, bar, 0, 0, w, h, qrImg);
  return canvas.toDataURL("image/png");
}
