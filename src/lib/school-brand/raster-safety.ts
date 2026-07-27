// ─── The three ways downloading a school's logo takes the server down ────────
//
// The fetch and the decode themselves live outside this folder — they need the
// network and a canvas, so they cannot be tested here. What lives here is every
// DECISION those two steps make, expressed as pure functions over bytes and
// numbers, so the rules can be unit-tested even though the pipeline they guard
// cannot be.
//
// All three are measured, not imagined:
//
//   1. TIFF and ICO SEGFAULT the decoder. Feeding either to the installed decoder
//      exits the process with 139 (SIGSEGV). Not an exception — a signal. There is
//      no try/catch around a segfault: the node process is gone, the request never
//      answers, and in a serverless container it takes every concurrent request
//      with it. So the shield cannot be error handling; it has to be refusing to
//      hand over the bytes at all.
//
//   2. A 10 MP RGBA image through analyzeArtwork + repairArtwork measured
//      heapUsed +480 MB. Which is arithmetic, not a leak: 10 MP × 4 bytes = 40 MB
//      per buffer, and the pipeline holds the decoded original, the QC copy,
//      `repairArtwork`'s `new Uint8ClampedArray(px.data)`, `cutBackground`'s second
//      copy, the flood-fill's `seen`, and the re-encoded PNG at once. Six-ish live
//      buffers plus GC slack is how 40 MB becomes 480. Two 10 MP candidates in
//      flight exceeds a 1 GB container.
//
//   3. The preview is not the artwork. Covered at the bottom.

/** Formats the decoder is known not to crash on. An ALLOWLIST, never a blocklist. */
export type DecodableFormat = "png" | "jpeg" | "webp" | "gif";

export type SniffResult =
  | { format: DecodableFormat; decodable: true }
  | { format: "svg"; decodable: false; reason: "svg-needs-source-scan" }
  | { format: "tiff" | "ico" | "bmp" | "avif" | "heic" | "unknown"; decodable: false; reason: string };

/**
 * Identify an image by its leading bytes, and refuse anything not on the allowlist.
 *
 * WHY AN ALLOWLIST AND NOT A "IS THIS FILE COMPLETE" CHECK. The obvious guard —
 * verify the container is intact before decoding — was tried and it guards the
 * WRONG FAILURE. A truncated PNG or a half-downloaded JPEG does NOT crash the
 * decoder; it returns an error or a short image, which the existing code handles
 * fine. The crash comes from COMPLETE, VALID TIFF and ICO files. A completeness
 * check passes those with flying colours and hands them straight to the segfault.
 * The only property that correlates with the crash is the format itself.
 *
 * WHY BYTES AND NOT THE EXTENSION OR CONTENT-TYPE. Both are attacker-controlled and
 * both are wrong by accident all the time: school CMSes serve `logo.png` that is
 * really a Windows ICO (the favicon pipeline does this constantly), and serve every
 * upload as `application/octet-stream`. The bytes are the only thing that cannot lie.
 */
export function sniffImageFormat(bytes: Uint8Array): SniffResult {
  const b = bytes;
  const at = (i: number) => (i < b.length ? b[i] : -1);
  const matches = (...sig: number[]) => sig.every((v, i) => at(i) === v);

  // ── allowlist ──
  if (matches(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { format: "png", decodable: true };
  }
  if (matches(0xff, 0xd8, 0xff)) return { format: "jpeg", decodable: true };
  if (matches(0x47, 0x49, 0x46, 0x38)) return { format: "gif", decodable: true };
  if (
    matches(0x52, 0x49, 0x46, 0x46) &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return { format: "webp", decodable: true };
  }

  // ── named refusals, so the UI can say something specific ──
  // TIFF: "II*\0" little-endian, "MM\0*" big-endian. THE SEGFAULT.
  if (matches(0x49, 0x49, 0x2a, 0x00) || matches(0x4d, 0x4d, 0x00, 0x2a)) {
    return {
      format: "tiff",
      decodable: false,
      reason: "TIFF crashes the image decoder (SIGSEGV), so it is never opened.",
    };
  }
  // ICO/CUR: 00 00 01 00 / 00 00 02 00. Blocked, and the reason is subtler than the
  // TIFF one above — worth stating exactly, because a reviewer who tests only the
  // happy path will conclude this block is unnecessary and be wrong.
  //
  // A WELL-FORMED ICO decodes fine: a 16x16 32bpp icon through `loadImage` returns
  // a normal image, exit 0. It is the MALFORMED ones that are fatal, and each fails
  // differently — measured against the installed @napi-rs/canvas:
  //   truncated (directory points past EOF)  -> exit 139 (SIGSEGV)
  //   header + garbage body                  -> exit 139 (SIGSEGV)
  //   absurd declared dimensions (65535 sq)  -> exit 132, SkBitmap fatal assert
  //
  // Which means the format cannot be admitted on a "just decode it and catch the
  // error" basis: telling a good ICO from a bad one requires decoding it, and
  // decoding a bad one is the thing that kills the process. There is no exception to
  // catch — a signal takes every concurrent request in the container with it, and
  // `/favicon.ico` is a candidate source we are handed by definition, from a host
  // chosen by whoever pasted the URL.
  if (at(0) === 0x00 && at(1) === 0x00 && (at(2) === 0x01 || at(2) === 0x02) && at(3) === 0x00) {
    return {
      format: "ico",
      decodable: false,
      reason:
        "ICO is not opened: a malformed one crashes the decoder outright, and telling a good one from a bad one would mean decoding it first.",
    };
  }
  if (matches(0x42, 0x4d)) {
    return { format: "bmp", decodable: false, reason: "BMP is not on the allowlist." };
  }
  if (
    at(4) === 0x66 && at(5) === 0x74 && at(6) === 0x79 && at(7) === 0x70 // "ftyp"
  ) {
    const brand = String.fromCharCode(at(8), at(9), at(10), at(11)).toLowerCase();
    const heic = brand.startsWith("hei") || brand.startsWith("mif");
    return {
      format: heic ? "heic" : "avif",
      decodable: false,
      reason: "ISO-BMFF images are not on the allowlist.",
    };
  }
  // SVG is text; it is decodable in principle but only after `svgRenderRisks`, so it
  // is reported separately rather than allowed here.
  const head = new TextDecoder().decode(b.slice(0, 256)).trim().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg") || head.includes("<svg")) {
    return { format: "svg", decodable: false, reason: "svg-needs-source-scan" };
  }

  return {
    format: "unknown",
    decodable: false,
    reason: "Unrecognised image format — not on the allowlist.",
  };
}

/** The one-line gate the fetch layer calls before it touches a decoder. */
export function isDecodableImage(bytes: Uint8Array): boolean {
  return sniffImageFormat(bytes).decodable;
}

/**
 * Hard ceiling on decoded pixels: 4 MP (2000 × 2000).
 *
 * Derived from the +480 MB measurement above: the pipeline costs roughly 12× the
 * RGBA size in live buffers, and 4 MP × 4 bytes × 12 ≈ 190 MB peak, which two
 * concurrent candidates survive in a 1 GB container. 10 MP does not. It is also
 * more than the job needs — the largest school panel is ~2" × 8" at 300 DPI, i.e.
 * 600 × 2400 = 1.44 MP.
 */
export const MAX_DECODE_PIXELS = 4_000_000;
/** The square that ceiling corresponds to, quoted in the UI copy. */
export const MAX_DECODE_SIDE = 2000;

export interface DecodePlan {
  sourceWidth: number;
  sourceHeight: number;
  /** Dimensions to decode AT. Equal to the source when no downscale is needed. */
  width: number;
  height: number;
  /** 1 when untouched, <1 when the image has to come down. */
  scale: number;
  mustDownscale: boolean;
  /** Bytes of RGBA the decode will allocate at the planned size. */
  estimatedBytes: number;
  /** What the RGBA would have cost at full size. Only differs when downscaling. */
  fullResBytes: number;
}

/**
 * Decide the decode size BEFORE anything is allocated.
 *
 * The order is the whole point. Reading the header for dimensions costs a few dozen
 * bytes; decoding to RGBA and *then* checking the size costs the 40 MB you were
 * trying to avoid, and by then you have already paid the peak you are guarding
 * against. Every image path must call this with header dimensions and decode at the
 * result, not decode and resize.
 *
 * Aspect ratio is preserved and both sides are floored at 1, so a 12000 × 3 banner
 * scan cannot plan a zero-height decode.
 */
export function planDecode(
  sourceWidth: number,
  sourceHeight: number,
  maxPixels: number = MAX_DECODE_PIXELS,
): DecodePlan {
  const w = Math.max(0, Math.floor(sourceWidth));
  const h = Math.max(0, Math.floor(sourceHeight));
  const pixels = w * h;
  const fullResBytes = pixels * 4;
  if (pixels === 0 || pixels <= maxPixels) {
    return {
      sourceWidth: w,
      sourceHeight: h,
      width: w,
      height: h,
      scale: 1,
      mustDownscale: false,
      estimatedBytes: fullResBytes,
      fullResBytes,
    };
  }
  const scale = Math.sqrt(maxPixels / pixels);
  const width = Math.max(1, Math.floor(w * scale));
  const height = Math.max(1, Math.floor(h * scale));
  return {
    sourceWidth: w,
    sourceHeight: h,
    width,
    height,
    scale,
    mustDownscale: true,
    estimatedBytes: width * height * 4,
    fullResBytes,
  };
}

/**
 * Longest side of the CARD THUMBNAIL. Not of the artwork.
 *
 * 1200 is generous for a card that renders at ~300 CSS px on a 2× screen; it exists
 * so the picker feels instant on a slow phone, and for no other reason.
 */
export const PREVIEW_MAX_PX = 1200;

export interface PreviewPlan {
  width: number;
  height: number;
  scale: number;
}

export function planPreview(
  width: number,
  height: number,
  maxSide: number = PREVIEW_MAX_PX,
): PreviewPlan {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest === 0) return { width, height, scale: 1 };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** A candidate that has been decoded, repaired and prepared for the picker. */
export interface PreparedArtwork {
  /**
   * THE image. Whatever goes to `putFullRes`, the crop flow and the print sheet is
   * this one — repaired at its decoded size, never the preview.
   */
  fullRes: { width: number; height: number };
  /** Card thumbnail. Display only. */
  preview: { width: number; height: number };
}

export interface HandoffCheck {
  ok: boolean;
  reason?: "preview-handed-to-print" | "unknown-image";
  message?: string;
}

/**
 * Assert that what is about to be printed is the full-res image.
 *
 * THIS EXISTS BECAUSE THE BUG IS INVISIBLE. Repair the full-res, build a ≤1200px
 * preview for the card, then hand the crop flow "the image" — and everything looks
 * right. The card looks right (it is the preview's job). The crop modal looks right
 * (1200px fills a phone screen). The DPI meter even looks right if the preview is
 * measured against the panel. It is only wrong on the printed part, weeks later,
 * where a 2" badge cropped from a 1200px preview of a 3000px original throws away
 * 60% of the pixels for nothing.
 *
 * The check is one comparison, and the reason it is a function rather than a comment
 * is that a comment cannot fail a test.
 */
export function checkFullResHandoff(
  prepared: PreparedArtwork,
  handedOff: { width: number; height: number },
): HandoffCheck {
  const { fullRes, preview } = prepared;
  if (handedOff.width === fullRes.width && handedOff.height === fullRes.height) {
    return { ok: true };
  }
  if (handedOff.width === preview.width && handedOff.height === preview.height) {
    return {
      ok: false,
      reason: "preview-handed-to-print",
      message: `The ${preview.width}x${preview.height} card preview was handed to the print path; it must get the ${fullRes.width}x${fullRes.height} full-res image.`,
    };
  }
  return {
    ok: false,
    reason: "unknown-image",
    message: `Print path was handed a ${handedOff.width}x${handedOff.height} image that is neither the full-res (${fullRes.width}x${fullRes.height}) nor the preview.`,
  };
}
