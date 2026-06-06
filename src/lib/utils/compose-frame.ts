import QRCode from "qrcode";
import type { PlacedTextBar } from "@/lib/types";
import { useDesignStore } from "@/stores/design-store";
import { generateSlots } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { getScale, getContainerHeight, getPlateArea } from "@/lib/utils/layout";
import { getPiece } from "@/data/sets";
import { getPlateImageUrl, getPlateImageDisplay } from "@/data/plate-images";

// Canvas-based frame renderer. We composite tiles, plate, and text bars onto a
// <canvas> with drawImage instead of screenshotting the DOM, because WebKit
// (iOS Safari/Chrome) will not paint <img> inside the SVG <foreignObject> that
// html-to-image uses — leaving artwork tiles and the plate blank. drawImage of
// same-origin images works everywhere and keeps the canvas untainted.

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
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
  roundRect(ctx, x, y, w, h, Math.max(2, h * 0.06));
  ctx.clip();
  ctx.fillStyle = cfg.backgroundColor;
  ctx.fillRect(x, y, w, h);

  const qrSize = bar.qr ? h * 0.82 : 0;
  const sidePad = h * 0.16 + (bar.qr ? qrSize + h * 0.12 : 0);
  const avail = w - sidePad * 2;
  const text = (cfg.text || "YOUR TEXT HERE");
  let fontPx = h * (cfg.fontSize ?? 0.8);
  const font = () => { ctx.font = `700 ${fontPx}px ${cfg.fontFamily}`; };
  font();
  let guard = 0;
  while (ctx.measureText(text).width > avail && fontPx > 6 && guard++ < 200) {
    fontPx -= 1;
    font();
  }
  ctx.fillStyle = cfg.textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);

  if (bar.qr && qrImg) {
    const s = qrSize;
    const qx = x + w - s - h * 0.12;
    const qy = y + (h - s) / 2;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qx, qy, s, s, s * 0.06);
    ctx.fill();
    ctx.drawImage(qrImg, qx, qy, s, s);
  }
  ctx.restore();
}

/** Render the current design to a PNG data URL. Works on iOS (unlike DOM screenshot). */
export async function composeFrameImage(width = 1600): Promise<string> {
  if (typeof document === "undefined") return "";
  const s = useDesignStore.getState();
  const { frameConfig, slots, textBars, qrCode, plateState } = s;

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

  // Tiles
  for (const slot of frameSlots) {
    if (covered.has(slot.id)) continue;
    const placed = slots[slot.id];
    if (!placed) continue;
    const piece = getPiece(placed.pieceId);
    if (!piece) continue;
    const img = piece.artworkUrl ? loaded.get(piece.artworkUrl) : null;
    if (img) {
      ctx.save();
      roundRect(ctx, slot.x, slot.y, slot.width, slot.height, 2);
      ctx.clip();
      drawFit(ctx, img, slot.x, slot.y, slot.width, slot.height, "cover", 1);
      ctx.restore();
    } else {
      ctx.fillStyle = piece.backgroundColor;
      roundRect(ctx, slot.x, slot.y, slot.width, slot.height, slot.width * 0.05);
      ctx.fill();
    }
  }

  // Text bars
  const qrImg = qrUrl ? loaded.get(qrUrl) ?? null : null;
  for (const bar of textBars) {
    drawTextBar(ctx, bar, bar.startIndex * tile, bar.row === "top" ? 0 : H - tile, bar.widthUnits * tile, tile, qrImg);
  }

  return canvas.toDataURL("image/png");
}

/** Render a single placed text bar to a print-ready PNG data URL. */
export async function composeBarImage(barId: string, unitPx = 220): Promise<string> {
  if (typeof document === "undefined") return "";
  const s = useDesignStore.getState();
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
