import { getPiece } from "@/data/sets";
import type { PlacedTile } from "@/lib/types";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance([r, g, b]: RGB): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrast(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Pick the text color (white or near-black) with the most contrast on bg. */
export function pickTextColor(bgHex: string): string {
  const bg = luminance(hexToRgb(bgHex));
  return contrast(bg, luminance([255, 255, 255])) >= contrast(bg, luminance([17, 17, 17]))
    ? "#FFFFFF"
    : "#111111";
}

/** Average non-transparent pixels of an image (downscaled) → RGB. */
async function averageColor(url: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 8;
        c.height = 8;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 10) continue;
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          n++;
        }
        resolve(n ? [r / n, g / n, b / n] : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Derive a bar background + text color from the tiles actually on the frame.
 * Favors the most vivid (saturated), frequently-used tile color so the bar
 * "matches" the design, then picks a guaranteed high-contrast text color.
 */
export async function autoColorFromTiles(
  slots: Record<string, PlacedTile>
): Promise<{ backgroundColor: string; textColor: string } | null> {
  const counts = new Map<string, number>();
  for (const t of Object.values(slots)) counts.set(t.pieceId, (counts.get(t.pieceId) ?? 0) + 1);
  if (counts.size === 0) return null;

  const sampled = await Promise.all(
    [...counts.entries()].map(async ([pieceId, count]) => {
      const piece = getPiece(pieceId);
      let rgb: RGB | null = null;
      if (piece?.artworkUrl) rgb = await averageColor(piece.artworkUrl);
      if (!rgb && piece?.backgroundColor) rgb = hexToRgb(piece.backgroundColor);
      return rgb ? { rgb, count } : null;
    })
  );

  const valid = sampled.filter((x): x is { rgb: RGB; count: number } => x !== null);
  if (valid.length === 0) return null;

  let best = valid[0];
  let bestScore = -1;
  for (const e of valid) {
    const [r, g, b] = e.rgb;
    const mx = Math.max(r, g, b) / 255;
    const mn = Math.min(r, g, b) / 255;
    const sat = mx === 0 ? 0 : (mx - mn) / mx;
    const score = (sat + 0.15) * Math.sqrt(e.count); // vivid + frequent wins; +0.15 keeps neutrals in play
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }

  const backgroundColor = toHex(best.rgb);
  return { backgroundColor, textColor: pickTextColor(backgroundColor) };
}
