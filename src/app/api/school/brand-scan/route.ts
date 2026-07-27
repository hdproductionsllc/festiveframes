// ─────────────────────────────────────────────────────────────────────────────
// POST /api/school/brand-scan — "paste your school's website, get its branding"
//
// A parent pastes a URL. We fetch the page, parse it with the pure
// `src/lib/school-brand` package, then fetch and quality-check the logo candidates
// it ranked, and hand back the ones that would actually survive being printed on a
// 2" badge.
//
// This file is the ONLY impure part of the feature. Everything with a decision in
// it — which candidate wins, whether an SVG will print black, what the user is told
// when a site says no — lives in the pure package next door and is unit-tested
// there. Here there is fetching, decoding and encoding, and as little judgement as
// could be arranged.
//
// FIVE THINGS IN HERE ARE NOT STYLE CHOICES. Each was reproduced against this repo:
//
//   1. An Illustrator-exported SVG (`<style>.st0{fill:#C8102E}</style>` +
//      `class="st0"`) rasterises to meanRGB [0,0,0] under the installed
//      @napi-rs/canvas — a perfect, fully-opaque black silhouette that passes every
//      QC check we have. So it is refused at SOURCE level (`svgRenderRisks`, before
//      ranking) AND checked again at PIXEL level (`rasterSanity`) after rendering.
//      Two gates because the first one only sees markup we downloaded.
//   2. TIFF and ICO SEGFAULT the decoder — exit 139, SIGSEGV. A signal, not an
//      exception: nothing to catch, the process is gone, and in a serverless
//      container it takes every concurrent request with it. `/favicon.ico` is a
//      candidate source, so this is not hypothetical. The shield is the magic-byte
//      ALLOWLIST in `sniffImageType`, applied before any decoder touches the bytes.
//   3. A 10 MP RGBA image through `analyzeArtwork` + `repairArtwork` measured
//      heapUsed +480 MB. Dimensions are therefore read from the container HEADER
//      before anything is allocated, and anything over 4 MP is decoded downscaled.
//      Candidates are processed SEQUENTIALLY for the same reason.
//   4. The preview is not the artwork. A repaired full-res image and a <=1200px
//      card thumbnail are returned as SEPARATE fields, and `checkFullResHandoff`
//      asserts the print path is getting the former. See below for why that bug is
//      invisible until the part is in your hand.
//   5. Exactly one error message is opaque (`unreachable`, covering both the SSRF
//      guard and DNS). Everything else — robots, 4xx/5xx, not-html, timeout — is a
//      distinguishable state with its own copy and its own next action.
//
// The most likely outcome of a successful scan is ZERO usable candidates, because a
// typical school header logo is ~200px wide and a 2" badge needs ~397px. That is
// designed for, not defaulted to: `buildEmptyState` writes copy about the ARTWORK
// ("nothing on this page prints at 2 inches") with "Upload a photo" as the primary
// action.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
// `Canvas` is imported as a type because `createCanvas` is overloaded (the SVG
// overload wins `ReturnType<typeof createCanvas>` and has no `toBuffer`).
import { createCanvas, loadImage, ImageData as NapiImageData, type Canvas } from "@napi-rs/canvas";

import {
  buildEmptyState,
  classifyHttpStatus,
  describeOutcome,
  gateByResolution,
  looksLikeHtml,
  parseSchoolPage,
  rasterSanity,
  svgRenderRisks,
  MAX_DECODE_PIXELS,
  MIN_BADGE_INCHES,
  MIN_BADGE_PIXELS,
  planDecode,
  planPreview,
  checkFullResHandoff,
  type LogoCandidate,
  type OutcomeCopy,
  type PageOutcome,
  type SchoolProfile,
} from "@/lib/school-brand";
import {
  assertPublicUrl,
  checkUrlShape,
  fetchGuarded,
  outcomeForFailure,
  parseRobots,
  robotsAllows,
  readImageHeader,
  sniffImageType,
  IMAGE_TIMEOUT_MS,
  MAX_IMAGE_BYTES,
  MAX_PAGE_BYTES,
  MAX_ROBOTS_BYTES,
  PAGE_TIMEOUT_MS,
  ROBOTS_TIMEOUT_MS,
  USER_AGENT,
} from "@/lib/school-brand/guard.server";
import {
  analyzeArtwork,
  isUsable,
  repairArtwork,
  type Pixels,
  type QcFinding,
} from "@/lib/utils/artwork-qc";
import { DEFAULT_FRAME_CONFIG } from "@/lib/constants/frame";
import { TARGET_DPI } from "@/lib/utils/print-resolution";

export const runtime = "nodejs";
// Twelve candidate fetches at up to 6 s each, plus the page and robots.txt, plus
// decode/repair/encode per candidate. The wall-clock budget below stops us well
// short of this; the platform ceiling is just headroom so a slow-but-working scan
// is not cut off mid-encode.
export const maxDuration = 60;

// ─── budgets ─────────────────────────────────────────────────────────────────

/**
 * How many ranked candidates we are willing to FETCH. A school page yields 3–8
 * after the vendor blocklist and dedupe; 12 covers the pathological theme that
 * scatters the crest across a `<picture>`, a CSS background and three favicons,
 * without turning one paste into a two-dozen-request crawl of somebody's site.
 */
const MAX_CANDIDATES_FETCHED = 12;

/**
 * How many we RETURN with pixels attached. Each carries a full-res PNG data URL,
 * so this number multiplied by a few MB is the response size — six is a picker the
 * user can actually look at, and roughly the point where scrolling replaces
 * choosing.
 */
const MAX_CANDIDATES_RETURNED = 6;

/**
 * Total base64 we will put in one response. Above this we stop preparing more
 * candidates and return what we have, flagged as truncated. A 4 MP repaired PNG
 * can be several MB; without this ceiling six of them is a 40 MB JSON body that
 * times out in transit on the phone this feature is for.
 */
const MAX_RESPONSE_IMAGE_BYTES = 20 * 1024 * 1024;

/**
 * Wall-clock budget for the candidate loop, measured from the moment the page is
 * parsed. School CDNs are slow and the loop is sequential (see the memory note), so
 * a page with 12 slow candidates could otherwise spend a minute. Returning four
 * good candidates in 20 s beats returning six in 55.
 */
const CANDIDATE_BUDGET_MS = 22_000;

/**
 * Absolute pixel ceiling before we will even hand bytes to the decoder.
 *
 * `planDecode` caps the RGBA we allocate at 4 MP, but the decoder still has to
 * expand the whole source frame internally before we can draw it downscaled — a
 * 20000x20000 PNG is 1.6 GB inside the decode step, long before any of our code
 * runs. 40 MP is ten times the working cap and comfortably above any real logo
 * (the largest school panel is 2"x8" at 300 DPI = 1.44 MP), so anything past it is
 * a scan, a poster, or an attack.
 */
const MAX_SOURCE_PIXELS = 40_000_000;

/**
 * The physical footprint every candidate is judged against: the smallest badge that
 * exists on this frame. `sectionSupportsTiles` forces 2x2 as the floor — a 1x1 badge
 * is unreadable and is not offered — so 2 x 0.991" is the real requirement, matching
 * `MIN_BADGE_INCHES` in the pure package.
 */
const BADGE_REQUIREMENT = {
  span: { cols: 2, rows: 2 },
  tileSizeInches: DEFAULT_FRAME_CONFIG.tileSizeInches,
  dpi: TARGET_DPI,
} as const;

/**
 * Short side we rasterise vector art to.
 *
 * An SVG has no resolution, so we choose one, and the only wrong answer is "too
 * small". 600px on the SHORT side is ~1.5x `MIN_BADGE_PIXELS` (397), which clears
 * the block with margin on a square crest AND on a 6:1 wordmark — scaling by the
 * long side instead would give that wordmark a 200px short side and hand the user a
 * vector that our own gate refuses. Capped by `MAX_DECODE_PIXELS` so a 20:1 banner
 * cannot plan a 12 MP raster.
 */
const VECTOR_SHORT_SIDE_PX = 600;

// ─── response shapes ─────────────────────────────────────────────────────────

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
   * THE image. This is what goes to `putFullRes`, the crop flow and the print
   * sheet — never `preview`. Repaired at its decoded size.
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

export type BrandScanResponse =
  | {
      ok: true;
      profile: Omit<SchoolProfile, "logos" | "droppedLogos">;
      candidates: ScanCandidate[];
      rejected: RejectedCandidate[];
      /** True when nothing survived. `emptyState` then carries the designed copy. */
      empty: boolean;
      emptyState: SchoolProfile["emptyState"];
      /** True when a budget stopped us early, so the picker can say "showing 4 of 9". */
      truncated: boolean;
      robots: { checked: boolean; matchedAgent: string };
    }
  | { ok: false; outcome: PageOutcome; copy: OutcomeCopy }
  | { ok: false; error: "invalid-url" | "bad-request"; copy: OutcomeCopy };

// ─── url validation, and the one opaque message ──────────────────────────────

/**
 * Shape failures that are safe to name, versus address failures that are not.
 *
 * `unparseable-url`, `unsupported-scheme`, `embedded-credentials` and `non-web-port`
 * are facts about the string the user just typed. Repeating them back leaks nothing
 * — they already know what they pasted — and "that isn't a web address" is far more
 * useful than "we couldn't reach that".
 *
 * Everything else collapses into `unreachable`. That includes `ip:*`,
 * `private-suffix`, `malformed-ip-literal`, `dns-failed` and `dns-empty`, and the
 * collapse is the point: if a hostname that resolves to 10.0.0.5 produced a
 * different message from a hostname that does not resolve at all, this endpoint
 * becomes an internal-network scanner. Submit a URL, read the error text, learn
 * whether something is listening behind our firewall. One sentence for both.
 */
const NAMEABLE_SHAPE_REASONS = new Set([
  "unparseable-url",
  "unsupported-scheme",
  "embedded-credentials",
  "non-web-port",
  "no-host",
]);

const INVALID_URL_COPY: OutcomeCopy = {
  headline: "That doesn't look like a web address",
  detail:
    "Paste the school's website address — it should start with https:// and point at their home page.",
  actions: [
    { id: "upload-photo", label: "Upload a photo", primary: true },
    { id: "try-another-page", label: "Try a different page", primary: false },
  ],
  retryable: false,
};

// ─── robots.txt ──────────────────────────────────────────────────────────────

/**
 * Check robots.txt before touching the page.
 *
 * A FAILED FETCH MEANS ALLOWED. A 404 is the overwhelmingly common case (most
 * school sites have no robots.txt at all), and a timeout or a connection error is
 * not consent withheld — it is no answer. Treating "no answer" as "no" would refuse
 * most of the internet on the strength of a missing file. Only a 2xx body that
 * actually contains a matching `Disallow` blocks us.
 *
 * robots.txt is fetched through the same guard as everything else: it is a URL on a
 * host the user chose, and the fact that we constructed the path does not make the
 * origin trustworthy.
 */
async function checkRobots(
  pageUrl: URL,
): Promise<{ allowed: boolean; rule?: string; checked: boolean; matchedAgent: string }> {
  const robotsUrl = new URL("/robots.txt", pageUrl.origin).toString();
  const res = await fetchGuarded(robotsUrl, {
    maxBytes: MAX_ROBOTS_BYTES,
    timeoutMs: ROBOTS_TIMEOUT_MS,
    accept: "text/plain,*/*;q=0.5",
  });
  if (!res.ok || res.status < 200 || res.status >= 300) {
    return { allowed: true, checked: false, matchedAgent: "" };
  }
  const rules = parseRobots(new TextDecoder().decode(res.bytes));
  const verdict = robotsAllows(rules, pageUrl.pathname + pageUrl.search);
  return {
    allowed: verdict.allowed,
    rule: verdict.rule,
    checked: true,
    matchedAgent: rules.matchedAgent,
  };
}

// ─── candidate preparation ───────────────────────────────────────────────────

type PrepareResult =
  | { ok: true; candidate: ScanCandidate; bytes: number }
  | { ok: false; rejected: RejectedCandidate };

const reject = (
  c: LogoCandidate,
  reason: string,
  detail: string,
): PrepareResult => ({ ok: false, rejected: { url: c.url, kind: c.kind, reason, detail } });

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

/**
 * Decode one candidate's bytes into RGBA at a size we can afford.
 *
 * The ORDER here is the memory constraint, and it only works in this order:
 * sniff (so the decoder never sees a format that segfaults) → read the header (a
 * few dozen bytes) → plan the decode → allocate. Decoding first and measuring
 * afterwards has already spent the 40 MB you were trying to avoid, and the
 * downstream pipeline then multiplies it by ~12 in live buffers.
 */
async function decodeRaster(
  bytes: Uint8Array,
  contentType: string,
): Promise<
  | { ok: true; px: Pixels }
  | { ok: false; reason: string; detail: string }
> {
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
    // Unknown size means we cannot bound the allocation, and an unbounded
    // allocation is the failure this whole path exists to prevent. Refuse rather
    // than decode-and-hope.
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

  const canvas = createCanvas(plan.width, plan.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, plan.width, plan.height);
  const raw = ctx.getImageData(0, 0, plan.width, plan.height);
  return { ok: true, px: { data: raw.data, width: plan.width, height: plan.height } };
}

/**
 * Rasterise SVG source at a size that clears the badge gate.
 *
 * The caller must have run `svgRenderRisks` first — this function will happily
 * render an Illustrator export, and the result will be a black rectangle in the
 * shape of the school's crest. `rasterSanity` downstream is the backstop, not the
 * defence.
 */
async function decodeVector(
  source: string,
): Promise<
  | { ok: true; px: Pixels }
  | { ok: false; reason: string; detail: string }
> {
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
    // failing, which downstream would read as `near-empty` and blame the artwork.
    return {
      ok: false,
      reason: "no-intrinsic-size",
      detail: "The SVG declares no width/height or viewBox, so it renders at zero size.",
    };
  }

  let scale = VECTOR_SHORT_SIDE_PX / Math.min(w, h);
  if (scale < 1) scale = 1; // never shrink a vector below its own declared size
  if (w * scale * h * scale > MAX_DECODE_PIXELS) {
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

/**
 * Fetch, decode, QC, repair and package one candidate.
 *
 * `isVector` decides the resolution gate: vector art has no pixels and is never
 * blocked (`gateByResolution(null)`), whereas a raster is measured against the same
 * `evaluateResolution` the crop modal gates on. That shared call is constraint 5 —
 * it is why this endpoint cannot show a candidate as usable that the crop flow will
 * later refuse with no way forward.
 */
async function prepareCandidate(c: LogoCandidate): Promise<PrepareResult> {
  const isVector = c.kind === "inline-svg" || c.kind === "svg-file";
  let source: string | undefined = c.svgSource;
  let decoded: Awaited<ReturnType<typeof decodeRaster>>;

  if (c.kind === "inline-svg") {
    if (!source) return reject(c, "no-source", "Inline SVG had no source attached.");
    // Belt and braces: `rankLogoCandidates` already dropped risky inline SVGs before
    // ranking. If one reaches here the ranking changed, and this is the gate that
    // should notice rather than the printer.
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
      return reject(c, `fetch-${res.failure.kind}`, "Could not download this image.");
    }
    if (res.status < 200 || res.status >= 300) {
      return reject(c, "fetch-status", `The server answered ${res.status} for this image.`);
    }

    if (c.kind === "svg-file") {
      // SVG is text, so the risk scan runs on the DOWNLOADED bytes — which is the
      // only place it can run for a linked file, and the reason the source-level
      // gate cannot live entirely in the pure package.
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
  const px = decoded.px;

  // ── the black-blob backstop ──
  // Source-level refusal catches the Illustrator idiom; this catches whatever the
  // string scan did not understand. It only accuses when the pixels say "uniform
  // black" AND the source declared a colour that is missing from the output, so a
  // school whose mark genuinely is a black seal still gets through.
  const sanity = rasterSanity(px, { source });
  if (!sanity.ok) {
    return reject(c, "black-blob", sanity.message ?? "Rendered as a flat black silhouette.");
  }

  // ── QC, then repair, then re-measure ──
  const before = analyzeArtwork(px, BADGE_REQUIREMENT);
  const repaired = repairArtwork(px, before);
  // Re-analysed because the repairs change the answer: cutting an opaque background
  // is what CREATES the soft edge, so a report taken before it is stale about the
  // exact thing the repair touched.
  const after = analyzeArtwork(repaired.pixels, BADGE_REQUIREMENT);

  const resolution = gateByResolution(
    isVector ? null : { width: repaired.pixels.width, height: repaired.pixels.height },
  );

  // AND, not OR. `isUsable` reads artwork-qc's own findings (whose `MIN_DPI` is
  // literally `BLOCK_DPI`), and `gateByResolution` calls `evaluateResolution`
  // directly. They should agree; they are both consulted anyway, because the
  // failure mode of them disagreeing is a dead end the user walks into and cannot
  // walk out of — the picker offers a 300px crest, the crop modal refuses it, and
  // there is no third screen.
  const usable = isUsable(after) && resolution.usable;

  // ── package: full-res first, preview derived FROM it ──
  const fullCanvas = createCanvas(repaired.pixels.width, repaired.pixels.height);
  const fullCtx = fullCanvas.getContext("2d");
  fullCtx.putImageData(
    new NapiImageData(repaired.pixels.data, repaired.pixels.width, repaired.pixels.height),
    0,
    0,
  );
  const fullRes = encode(fullCanvas);

  const pp = planPreview(fullRes.width, fullRes.height);
  let preview: PreparedImage;
  if (pp.scale === 1) {
    // Already small enough. Reusing the same bytes rather than re-encoding keeps the
    // response honest about the two being identical for this candidate.
    preview = { ...fullRes };
  } else {
    const previewCanvas = createCanvas(pp.width, pp.height);
    const pctx = previewCanvas.getContext("2d");
    pctx.drawImage(fullCanvas, 0, 0, pp.width, pp.height);
    preview = encode(previewCanvas);
  }

  // ── constraint 4, asserted rather than commented ──
  //
  // THIS BUG IS INVISIBLE UNTIL THE PART IS IN YOUR HAND. Repair the full-res, build
  // a <=1200px preview for the card, then hand the crop flow "the image" and
  // everything looks right: the card is right (that is the preview's job), the crop
  // modal is right (1200px fills a phone screen), the DPI meter is even right if it
  // measures the preview. It is only wrong on the printed badge, weeks later, where
  // a 2" crop from a 1200px preview of a 3000px original threw away 60% of the
  // pixels for nothing. A comment cannot fail; this can.
  const handoff = checkFullResHandoff(
    { fullRes: { width: fullRes.width, height: fullRes.height }, preview: { width: preview.width, height: preview.height } },
    { width: fullRes.width, height: fullRes.height },
  );
  if (!handoff.ok) {
    return reject(c, "handoff", handoff.message ?? "Full-res handoff check failed.");
  }

  return {
    ok: true,
    bytes: fullRes.bytes + (preview === fullRes ? 0 : preview.bytes),
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

// ─── the handler ─────────────────────────────────────────────────────────────

const fail = (outcome: PageOutcome): NextResponse =>
  NextResponse.json<BrandScanResponse>(
    { ok: false, outcome, copy: describeOutcome(outcome) },
    // 200, deliberately. The scan RAN and produced a verdict; "the school's site
    // returned 404" is a fact we successfully established, not a failure of this
    // request. A 502 here would send the client's own error handling down a path
    // that has none of this copy in it.
    { status: 200 },
  );

export async function POST(request: Request): Promise<NextResponse> {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return NextResponse.json<BrandScanResponse>(
      { ok: false, error: "bad-request", copy: INVALID_URL_COPY },
      { status: 400 },
    );
  }

  const raw = typeof body.url === "string" ? body.url.trim() : "";
  if (!raw || raw.length > 2048) {
    return NextResponse.json<BrandScanResponse>(
      { ok: false, error: "invalid-url", copy: INVALID_URL_COPY },
      { status: 400 },
    );
  }
  // A bare "lincolnhigh.org" is what people actually paste. Assume https rather
  // than rejecting it; the guard still has to approve whatever that resolves to.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  const shape = checkUrlShape(withScheme);
  if (!shape.ok) {
    if (NAMEABLE_SHAPE_REASONS.has(shape.reason)) {
      return NextResponse.json<BrandScanResponse>(
        { ok: false, error: "invalid-url", copy: INVALID_URL_COPY },
        { status: 400 },
      );
    }
    // Address-shaped refusals share the one opaque message with DNS failures.
    return fail({ kind: "unreachable" });
  }

  let target;
  try {
    target = await assertPublicUrl(shape.url.toString());
  } catch {
    return fail({ kind: "unreachable" });
  }

  // ── robots.txt, before the page ──
  const robots = await checkRobots(target.url);
  if (!robots.allowed) {
    return fail({ kind: "blocked-by-robots", rule: robots.rule });
  }

  // ── the page ──
  const page = await fetchGuarded(target.url.toString(), {
    maxBytes: MAX_PAGE_BYTES,
    timeoutMs: PAGE_TIMEOUT_MS,
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
  });
  if (!page.ok) {
    // The whole mapping lives in `outcomeForFailure` (and is unit-tested there),
    // including the fact that a guard-refused REDIRECT HOP produces the same opaque
    // `unreachable` as a first-hop refusal — the redirect target is exactly the
    // address we must not describe.
    return fail(outcomeForFailure(page.failure));
  }

  const status = classifyHttpStatus(page.status);
  if (status.kind !== "ok") return fail(status);

  const html = new TextDecoder("utf-8", { fatal: false }).decode(page.bytes);
  if (!looksLikeHtml(html, page.contentType)) {
    return fail({ kind: "not-html", contentType: page.contentType.split(";")[0] || undefined });
  }

  // ── parse (pure) ──
  const profile = parseSchoolPage(html, page.finalUrl);

  // ── fetch + QC the candidates, SEQUENTIALLY ──
  //
  // Sequential is the memory constraint, not laziness. Two 10 MP candidates in
  // flight through analyzeArtwork/repairArtwork exceeded a 1 GB container in the
  // measurement that produced the 4 MP cap; the cap makes each one affordable and
  // the sequencing makes the peak one candidate deep rather than twelve.
  const started = Date.now();
  const candidates: ScanCandidate[] = [];
  const rejected: RejectedCandidate[] = [];
  let imageBytes = 0;
  let truncated = false;

  const queue = profile.logos.slice(0, MAX_CANDIDATES_FETCHED);
  for (const c of queue) {
    if (candidates.length >= MAX_CANDIDATES_RETURNED) {
      truncated = true;
      break;
    }
    if (Date.now() - started > CANDIDATE_BUDGET_MS) {
      truncated = true;
      break;
    }
    if (imageBytes > MAX_RESPONSE_IMAGE_BYTES) {
      truncated = true;
      break;
    }

    let result: PrepareResult;
    try {
      result = await prepareCandidate(c);
    } catch (err) {
      // A decoder that throws is fine; a decoder that segfaults never reaches here,
      // which is why `sniffImageType` runs before it rather than around it.
      result = reject(
        c,
        "unexpected",
        err instanceof Error ? err.message : "Preparing this image failed.",
      );
    }
    if (result.ok) {
      candidates.push(result.candidate);
      imageBytes += result.bytes;
    } else {
      rejected.push(result.rejected);
    }
  }
  if (!truncated && profile.logos.length > queue.length) truncated = true;

  // ── the empty state, which is the MOST LIKELY OUTCOME ──
  //
  // Not the sad path. A typical school header logo is ~200px wide, and 200px is
  // ~100 DPI on a 2" badge — blocked before a crop handle is ever drawn. Add the
  // pages whose only mark belongs to Edlio or Finalsite, and the pages whose crest
  // is an Illustrator SVG that would print black, and "nothing here prints" is
  // common enough that it has to read as a normal step with a working next action,
  // not as our bug. `buildEmptyState` writes copy about the ARTWORK and puts
  // "Upload a photo" first.
  const kept = candidates.filter((c) => c.usable);
  const empty = kept.length === 0;
  const emptyState = empty
    ? profile.emptyState ??
      buildEmptyState({
        hadCandidates: profile.logos.length > 0 || rejected.length > 0,
        droppedVendor: profile.droppedLogos.filter((d) => d.dropped === "vendor-mark").length,
        droppedRisk:
          profile.droppedLogos.filter((d) => d.dropped === "svg-render-risk").length +
          rejected.filter((r) => r.reason === "svg-render-risk" || r.reason === "black-blob").length,
      })
    : null;

  // Everything the profile carries EXCEPT the raw candidate lists, which are
  // superseded by `candidates`/`rejected` (those have been through the decoder and
  // these have not — returning both invites the client to render the untested one).
  const { logos: _logos, droppedLogos: _dropped, ...publicProfile } = profile;
  void _logos;
  void _dropped;

  return NextResponse.json<BrandScanResponse>(
    {
      ok: true,
      profile: publicProfile,
      candidates,
      rejected,
      empty,
      emptyState,
      truncated,
      robots: { checked: robots.checked, matchedAgent: robots.matchedAgent },
    },
    {
      status: 200,
      headers: {
        // Nothing here is worth caching: the answer depends on a third-party site
        // that changes, and the response embeds several MB of image data.
        "cache-control": "no-store",
        // Declared so an operator reading a school's access log can identify us and
        // find the contact address without guessing.
        "x-scanner-user-agent": USER_AGENT,
      },
    },
  );
}

/** Exported for the unit tests; the badge footprint every candidate is judged at. */
export const __test__ = {
  BADGE_REQUIREMENT,
  MIN_BADGE_INCHES,
  MIN_BADGE_PIXELS,
  NAMEABLE_SHAPE_REASONS,
  VECTOR_SHORT_SIDE_PX,
  MAX_SOURCE_PIXELS,
};
