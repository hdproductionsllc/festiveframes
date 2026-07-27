// ─── Candidate → printable artwork: fetch, decode, QC, repair, package ───────
//
// The other half of the impure layer. `guard.server.ts` decides whether we are
// allowed to touch a URL; this decides whether what came back can go on a badge.
//
// It lives here rather than inside the route handler for one reason: THE ROUTE
// CANNOT BE UNIT-TESTED IN THIS SANDBOX and this can. Every CONNECT here is
// answered "403" by the proxy, so nothing that fetches is testable — but the
// INLINE-SVG path takes no network at all (the markup came down with the page), and
// that path is the one carrying the defect that matters most: an Illustrator export
// rasterising to a fully-opaque black silhouette that passes every QC check we own.
// Putting the pipeline in an importable module means that path gets a real test
// against a real @napi-rs/canvas render, instead of a comment claiming it works.
//
// Four measured constraints shape the order of operations below, and the order is
// not interchangeable:
//
//   1. SNIFF BEFORE DECODE. TIFF and ICO exit the process with signal 139
//      (SIGSEGV). Not an exception — there is nothing to catch, the process is gone
//      and the request never answers. `/favicon.ico` is one of the sources
//      `collectLogoCandidates` deliberately looks at, so this is a format we will
//      actually be handed. The magic-byte allowlist runs before any decoder sees
//      the bytes.
//   2. HEADER BEFORE ALLOCATE. 10 MP of RGBA through analyzeArtwork +
//      repairArtwork measured heapUsed +480 MB — the pipeline holds ~6 live copies
//      of the buffer at once. Decoding first and measuring afterwards has already
//      spent the peak you were avoiding, so the size question is answered from a
//      few dozen header bytes and the decode is planned around the 4 MP cap.
//   3. SOURCE SCAN BEFORE RASTER, PIXEL CHECK AFTER. `svgRenderRisks` refuses the
//      Illustrator idiom from the markup; `rasterSanity` catches whatever the string
//      scan did not understand. Two gates because the first only sees what we can
//      read and the second only sees what we can render.
//   4. FULL-RES IS THE ARTWORK. The preview is a card thumbnail and nothing else.
//      `checkFullResHandoff` asserts it, because this bug is invisible on every
//      screen and only shows up on the printed part.

import { createCanvas, loadImage, ImageData as NapiImageData, type Canvas } from "@napi-rs/canvas";

import {
  analyzeArtwork,
  isUsable,
  repairArtwork,
  type Pixels,
  type QcFinding,
} from "@/lib/utils/artwork-qc";
import { TARGET_DPI } from "@/lib/utils/print-resolution";
import { DEFAULT_FRAME_CONFIG } from "@/lib/constants/frame";

import { checkFullResHandoff, MAX_DECODE_PIXELS, planDecode, planPreview } from "./raster-safety";
import { gateByResolution } from "./rank-candidates";
// `rasterSanity` lives in svg-risks.ts rather than raster-safety.ts on purpose: it
// is the PIXEL half of the SVG defence and it needs `declaredFillColors` and
// `svgRenderRisks` to decide whether a black raster is a dropped fill or a black logo.
import { rasterSanity, svgRenderRisks } from "./svg-risks";
import type { LogoCandidate } from "./types";
import {
  fetchGuarded,
  readImageHeader,
  sniffImageType,
  IMAGE_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
} from "./guard.server";

// ─── the footprint everything is judged against ──────────────────────────────

/**
 * The smallest badge that exists on this frame: 2x2 tiles at the 0.991" pitch.
 *
 * `sectionSupportsTiles` already forces 2x2 as the floor — a 1x1 badge is
 * unreadable and is never offered — so this is the real physical size, and it is the
 * same number `MIN_BADGE_INCHES` states in the pure package. Judging against
 * anything smaller would pass art the builder then refuses.
 */
export const BADGE_REQUIREMENT = {
  span: { cols: 2, rows: 2 },
  tileSizeInches: DEFAULT_FRAME_CONFIG.tileSizeInches,
  dpi: TARGET_DPI,
} as const;

/**
 * Short side we rasterise vector art to.
 *
 * An SVG has no resolution, so we pick one, and the only wrong answer is "too
 * small". 600px on the SHORT side is ~1.5x the 397px a 2" badge needs, which clears
 * the block with margin on a square crest AND on a 6:1 wordmark. Scaling by the LONG
 * side instead — the obvious version — gives that wordmark a 200px short side and
 * hands the user a vector our own resolution gate then refuses, which is exactly the
 * dead end constraint 5 exists to prevent.
 */
export const VECTOR_SHORT_SIDE_PX = 600;

/**
 * Absolute pixel ceiling before we will hand bytes to the decoder at all.
 *
 * `planDecode` caps the RGBA WE allocate at 4 MP, but the decoder still expands the
 * whole source frame internally before we can draw it downscaled — a 20000x20000
 * PNG is 1.6 GB inside `loadImage`, before a line of our code runs. 40 MP is ten
 * times the working cap and far above any real logo (the largest school panel is
 * 2"x8" at 300 DPI = 1.44 MP), so anything past it is a scan, a poster, or an attack.
 */
export const MAX_SOURCE_PIXELS = 40_000_000;

// ─── shapes ──────────────────────────────────────────────────────────────────

/** An image we decoded, repaired and are handing back. */
export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export interface ScanCandidate {
  /** Absolute URL, or `""` for an inline SVG lifted out of the page. */
  url: string;
  kind: LogoCandidate["kind"];
  source: string;
  score: number;
  alt?: string;
  /**
   * THE image. Whatever goes to `putFullRes`, the crop flow and the print sheet is
   * this one — never `preview`. Repaired, at its decoded size.
   */
  fullRes: PreparedImage;
  /** Card thumbnail, <=1200px on the long side. DISPLAY ONLY. */
  preview: PreparedImage;
  /** True only when QC found nothing fatal AND the resolution gate lets it through. */
  usable: boolean;
  qc: {
    findings: QcFinding[];
    effectiveDpi: number;
    repairs: string[];
  };
  resolution: {
    usable: boolean;
    dpi: number;
    level: string;
    blocked: boolean;
    message: string;
  };
}

/** A candidate we fetched and then refused, kept so "why is this empty" has an answer. */
export interface RejectedCandidate {
  url: string;
  kind: LogoCandidate["kind"];
  reason: string;
  detail: string;
}

export type PrepareResult =
  | { ok: true; candidate: ScanCandidate; bytes: number }
  | { ok: false; rejected: RejectedCandidate };

const reject = (c: LogoCandidate, reason: string, detail: string): PrepareResult => ({
  ok: false,
  rejected: { url: c.url, kind: c.kind, reason, detail },
});

/** Encode a canvas to a PNG data URL, reporting the byte cost so budgets can be kept. */
function encode(canvas: Canvas): PreparedImage {
  const buf = canvas.toBuffer("image/png");
  return {
    dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
    width: canvas.width,
    height: canvas.height,
    bytes: buf.byteLength,
  };
}

type DecodeOutcome =
  | { ok: true; px: Pixels }
  | { ok: false; reason: string; detail: string };

// ─── decoding ────────────────────────────────────────────────────────────────

/**
 * Decode raster bytes into RGBA at a size we can afford.
 *
 * Exported so the sniff/header/plan sequence can be tested on constructed bytes
 * with no network — the refusals are the interesting part and they all happen
 * before `loadImage` is reached.
 */
export async function decodeRaster(
  bytes: Uint8Array,
  contentType?: string,
): Promise<DecodeOutcome> {
  const verdict = sniffImageType(bytes, contentType);
  if (!verdict.decode) {
    return {
      ok: false,
      reason: verdict.svg ? "svg-in-raster-slot" : "undecodable-format",
      detail: verdict.svg
        ? "Served as SVG from a URL that did not look like one; it has to go through the SVG path."
        : verdict.reason,
    };
  }

  const header = readImageHeader(bytes);
  if (!header || header.width <= 0 || header.height <= 0) {
    // Unknown size means the allocation cannot be bounded, and an unbounded
    // allocation is the failure this whole path exists to prevent. Refuse rather
    // than decode-and-hope: a corrupt header is not worth 480 MB to discover.
    return {
      ok: false,
      reason: "unreadable-header",
      detail: `Could not read the image size out of the ${verdict.format} header, so the decode could not be bounded.`,
    };
  }
  if (header.width * header.height > MAX_SOURCE_PIXELS) {
    return {
      ok: false,
      reason: "too-large",
      detail: `${header.width}x${header.height} is past the ${MAX_SOURCE_PIXELS / 1e6} MP ceiling — the decoder expands the whole frame before we can downscale it.`,
    };
  }

  const plan = planDecode(header.width, header.height, MAX_DECODE_PIXELS);
  let image;
  try {
    image = await loadImage(Buffer.from(bytes));
  } catch (err) {
    return {
      ok: false,
      reason: "decode-failed",
      detail: err instanceof Error ? err.message : "The decoder refused the file.",
    };
  }

  // Drawn INTO the planned size rather than decoded-then-resized, so the only RGBA
  // buffer that ever exists is the capped one.
  const canvas = createCanvas(plan.width, plan.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, plan.width, plan.height);
  const raw = ctx.getImageData(0, 0, plan.width, plan.height);
  return { ok: true, px: { data: raw.data, width: plan.width, height: plan.height } };
}

/**
 * Rasterise SVG source at a size that clears the badge gate.
 *
 * The caller MUST have run `svgRenderRisks` first. This function will happily render
 * an Illustrator export and the result will be a black rectangle in the shape of the
 * school's crest — `rasterSanity` downstream is the backstop, not the defence.
 */
export async function decodeVector(source: string): Promise<DecodeOutcome> {
  let image;
  try {
    image = await loadImage(Buffer.from(source, "utf8"));
  } catch (err) {
    return {
      ok: false,
      reason: "decode-failed",
      detail: err instanceof Error ? err.message : "The renderer refused the SVG.",
    };
  }
  const w = image.width || 0;
  const h = image.height || 0;
  if (w <= 0 || h <= 0) {
    // An SVG with no width/height and no viewBox renders at 0x0 rather than
    // failing, and a 0x0 raster reads downstream as `near-empty` — which blames the
    // artwork for a problem in the file's declaration. Say the real thing.
    return {
      ok: false,
      reason: "no-intrinsic-size",
      detail: "The SVG declares no width/height or viewBox, so it renders at zero size.",
    };
  }

  let scale = VECTOR_SHORT_SIDE_PX / Math.min(w, h);
  if (scale < 1) scale = 1; // never render a vector SMALLER than it declares itself
  if (w * scale * (h * scale) > MAX_DECODE_PIXELS) {
    scale = Math.sqrt(MAX_DECODE_PIXELS / (w * h));
  }
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, width, height);
  const raw = ctx.getImageData(0, 0, width, height);
  return { ok: true, px: { data: raw.data, width, height } };
}

// ─── QC + packaging ──────────────────────────────────────────────────────────

/**
 * Run QC on already-decoded pixels and package the result.
 *
 * Split out from the fetch so it can be tested directly: everything from here down
 * is pure-ish (canvas encoding aside) and is where the constraints are enforced.
 */
export function finishCandidate(
  c: LogoCandidate,
  px: Pixels,
  opts: { isVector: boolean; source?: string },
): PrepareResult {
  // ── the black-blob backstop (constraint 1, pixel half) ──
  //
  // It only accuses when the pixels say "uniform black" AND the source declared a
  // colour that is missing from the output, so a school whose mark genuinely IS a
  // black seal still gets through. Pixels alone cannot tell the two apart, which is
  // why the source is passed in.
  const sanity = rasterSanity(px, { source: opts.source });
  if (!sanity.ok) {
    return reject(c, "black-blob", sanity.message ?? "Rendered as a flat black silhouette.");
  }

  const before = analyzeArtwork(px, BADGE_REQUIREMENT);
  const repaired = repairArtwork(px, before);
  // Re-analysed because the repairs change the answer: cutting an opaque background
  // is what CREATES the soft edge, so a report taken before it is stale about the
  // exact thing the repair just touched.
  const after = analyzeArtwork(repaired.pixels, BADGE_REQUIREMENT);

  const resolution = gateByResolution(
    opts.isVector ? null : { width: repaired.pixels.width, height: repaired.pixels.height },
  );

  // AND, not OR (constraint 5). `isUsable` reads artwork-qc's findings — whose
  // `MIN_DPI` is literally `BLOCK_DPI` — and `gateByResolution` calls
  // `evaluateResolution`, the same function the crop modal gates on. They should
  // agree; both are consulted anyway, because the failure mode of them disagreeing
  // is a dead end the user walks into and cannot walk out of: the picker offers a
  // 300px crest, the crop modal refuses it, and there is no third screen.
  const usable = isUsable(after) && resolution.usable;

  // ── full-res first, preview derived FROM it (constraint 4) ──
  const fullCanvas = createCanvas(repaired.pixels.width, repaired.pixels.height);
  fullCanvas
    .getContext("2d")
    .putImageData(
      new NapiImageData(repaired.pixels.data, repaired.pixels.width, repaired.pixels.height),
      0,
      0,
    );
  const fullRes = encode(fullCanvas);

  const pp = planPreview(fullRes.width, fullRes.height);
  let preview: PreparedImage;
  let previewBytes = 0;
  if (pp.scale === 1) {
    // Already inside the thumbnail budget. Reusing the bytes rather than
    // re-encoding keeps the response honest that the two are the same image here.
    preview = { ...fullRes };
  } else {
    const previewCanvas = createCanvas(pp.width, pp.height);
    previewCanvas.getContext("2d").drawImage(fullCanvas, 0, 0, pp.width, pp.height);
    preview = encode(previewCanvas);
    previewBytes = preview.bytes;
  }

  // ── constraint 4, asserted rather than commented ──
  //
  // THIS BUG IS INVISIBLE UNTIL THE PART IS IN YOUR HAND. Repair the full-res, build
  // a <=1200px preview for the card, then hand the crop flow "the image" and
  // everything looks right: the card is right (that is the preview's job), the crop
  // modal is right (1200px fills a phone screen), the DPI meter is even right if it
  // measures the preview against the panel. It is only wrong on the printed badge,
  // weeks later, where a 2" crop taken from a 1200px preview of a 3000px original
  // threw away 60% of the pixels for nothing. A comment cannot fail a test; this can.
  const handoff = checkFullResHandoff(
    {
      fullRes: { width: fullRes.width, height: fullRes.height },
      preview: { width: preview.width, height: preview.height },
    },
    { width: fullRes.width, height: fullRes.height },
  );
  if (!handoff.ok) {
    return reject(c, "handoff", handoff.message ?? "Full-res handoff check failed.");
  }

  return {
    ok: true,
    bytes: fullRes.bytes + previewBytes,
    candidate: {
      url: c.url,
      kind: c.kind,
      source: c.source,
      score: c.score,
      alt: c.alt,
      fullRes,
      preview,
      usable,
      qc: {
        findings: after.findings,
        effectiveDpi: after.effectiveDpi,
        repairs: repaired.repairs,
      },
      resolution: {
        usable: resolution.usable,
        dpi: resolution.verdict.dpi,
        level: resolution.verdict.level,
        blocked: resolution.verdict.blocked,
        message: resolution.message,
      },
    },
  };
}

/**
 * Fetch (if needed), decode, QC, repair and package one ranked candidate.
 *
 * The inline-SVG branch never touches the network — the markup arrived with the
 * page — which is what makes the most dangerous path in this file testable in a
 * sandbox that cannot fetch anything.
 */
export async function prepareCandidate(c: LogoCandidate): Promise<PrepareResult> {
  const isVector = c.kind === "inline-svg" || c.kind === "svg-file";
  let source: string | undefined = c.svgSource;
  let decoded: DecodeOutcome;

  if (c.kind === "inline-svg") {
    if (!source) return reject(c, "no-source", "Inline SVG had no source attached.");
    // Belt and braces: `rankLogoCandidates` already drops risky inline SVGs BEFORE
    // ranking. If one reaches here the ranking changed, and this is the gate that
    // should notice — not the printer.
    const risks = svgRenderRisks(source);
    if (risks.length) {
      return reject(c, "svg-render-risk", `Would not rasterise faithfully: ${risks.join(", ")}.`);
    }
    decoded = await decodeVector(source);
  } else {
    const res = await fetchGuarded(c.url, {
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: IMAGE_TIMEOUT_MS,
      accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8",
    });
    if (!res.ok) {
      // Deliberately not naming the transport reason to the user here. A per-image
      // failure is noise in the picker, and the guard's reason in particular must
      // never be surfaced (see the `unreachable` note in types.ts).
      return reject(c, `fetch-${res.failure.kind}`, "Could not download this image.");
    }
    if (res.status < 200 || res.status >= 300) {
      return reject(c, "fetch-status", `The server answered ${res.status} for this image.`);
    }

    if (c.kind === "svg-file") {
      // SVG is text, so for a LINKED file the risk scan can only run on the
      // downloaded bytes — which is why the source-level gate cannot live entirely
      // in the pure package, and why it is repeated here rather than trusted from
      // ranking.
      source = new TextDecoder().decode(res.bytes);
      const risks = svgRenderRisks(source);
      if (risks.length) {
        return reject(c, "svg-render-risk", `Would not rasterise faithfully: ${risks.join(", ")}.`);
      }
      decoded = await decodeVector(source);
    } else {
      decoded = await decodeRaster(res.bytes, res.contentType);
    }
  }

  if (!decoded.ok) return reject(c, decoded.reason, decoded.detail);
  return finishCandidate(c, decoded.px, { isVector, source });
}
