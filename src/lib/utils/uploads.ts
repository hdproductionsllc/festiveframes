import type { TilePiece, TileSpan } from "@/lib/types";
import { TILE_BG } from "@/lib/utils/tile-theme";

// ─── Uploaded art as a REUSABLE palette piece ────────────────────────────────
//
// Uploading behaved like a photo upload: pick a panel, crop, and the art lands in
// exactly one place. Which is right for a photo and wrong for the thing people
// actually upload here — a mascot or a crest. Wanting the crest on both wings meant
// uploading the same file twice, and there was no way to drag a second copy on,
// because the art existed only as a placed tile and never as something you could
// pick up.
//
// So an upload now ALSO lands in the tile palette, beside the catalogue badges, and
// from there it drags and taps exactly like any other badge. Nothing about the
// placement path changes: a placed upload is still a tile carrying an `image`, the
// same record `placeImageSnappet` has always written, so print, export, the parts
// list and the tally all see what they already saw.

/** Palette ids are namespaced `upload:<uuid>` — so `pieceId.split(":")[0]` yields
 *  the reserved upload set id for free, exactly like a catalogue piece. */
export const UPLOAD_ID_PREFIX = "upload:";

/**
 * How many uploads the palette keeps.
 *
 * Every preview is a data URL inside the persisted design, and localStorage is the
 * ~5 MB budget that already raises the builder's "storage is full" banner. A cap is
 * what keeps a session of trial-and-error uploads from filling it; the oldest go
 * first, because the one you just added is the one you are working with.
 */
export const MAX_UPLOADS = 6;

/**
 * The tray thumbnail's long edge, in px.
 *
 * The crop modal's own preview is up to 1200px, and measured on a real upload that
 * came to a 4.1 MB data URL — one of those very nearly fills localStorage on its own,
 * and the design failed to save the moment a second copy went in. The tray does not
 * need that: this image is only ever drawn at swatch size or as an on-screen badge
 * (a 2x2 is about 150 CSS px on a laptop), and PRINT does not read it at all — the
 * print path pulls the full-resolution original from IndexedDB by `fullResId` and
 * falls back to the preview only if that is missing.
 *
 * 256 covers a badge on a retina screen with room to spare and costs a few tens of KB.
 */
export const UPLOAD_THUMB_PX = 256;

/**
 * Shrink a preview data URL to `UPLOAD_THUMB_PX` on its long edge.
 *
 * Keeps PNG for anything with alpha — a crest keyed to transparency re-encoded as
 * JPEG comes back with a black box round it — and takes JPEG otherwise, where it is
 * several times smaller for the same result. Returns the original on any failure:
 * a tray entry that is too big is a storage problem, but a tray entry that is MISSING
 * is a broken feature.
 */
export function thumbnailDataUrl(url: string, maxPx: number = UPLOAD_THUMB_PX): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(url);
    const img = new Image();
    img.onload = () => {
      try {
        const long = Math.max(img.naturalWidth, img.naturalHeight);
        if (!long || long <= maxPx) return resolve(url);
        const scale = maxPx / long;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(url);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = url.startsWith("data:image/png");
        resolve(isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export interface UploadedArt {
  /** `upload:<uuid>`. */
  id: string;
  /** Shown on the palette swatch's tooltip — the file's own name, trimmed. */
  name: string;
  /** The ≤1200px preview data URL. Small enough to persist, enough to render. */
  url: string;
  /** IndexedDB key for the print-resolution original (see image-store). */
  fullResId?: string;
  /** Source aspect (w / h), so a re-place can size itself the way the first did. */
  aspect: number;
  /** The footprint the crop was sized against — the shape the user already saw. */
  span: TileSpan;
}

export function isUploadId(pieceId: string | null | undefined): boolean {
  return typeof pieceId === "string" && pieceId.startsWith(UPLOAD_ID_PREFIX);
}

export function findUpload(uploads: readonly UploadedArt[], pieceId: string | null | undefined) {
  if (!isUploadId(pieceId)) return undefined;
  return uploads.find((u) => u.id === pieceId);
}

/**
 * An upload dressed as a `TilePiece`, so the palette, the drag hook and the drag
 * ghost can all take it without learning a second shape.
 *
 * It is deliberately NOT registered with `getPiece`: that map is the catalogue, and
 * every consumer of it (the print renderer, the parts list, `dropUnknownPieces`)
 * already handles uploaded art through the tile's `image` field. Making uploads
 * resolvable there would give those paths two ways to find the same art, which is
 * how the two renderers drift.
 */
export function uploadPiece(art: UploadedArt): TilePiece {
  return {
    id: art.id,
    setId: "upload",
    name: art.name,
    artworkUrl: art.url,
    emoji: "",
    backgroundColor: TILE_BG.navy,
    defaultSpan: art.span,
    // A preference, not a fixture: a crest that prefers 2x2 must still shrink into a
    // one-row banner rather than refuse the drop.
    spanRequired: false,
  };
}
