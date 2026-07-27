// ─── Why an SVG crest is a trap, and how this module refuses it ──────────────
//
// MEASURED, not theorised, against the @napi-rs/canvas 1.0.1 that this repo already
// depends on:
//
//   An SVG whose fills live in an internal stylesheet —
//       <style>.st0{fill:#C8102E;} .st1{fill:#FFFFFF;}</style>
//       <path class="st0" d="…"/>
//   — rasterises to meanRGB [0,0,0]. A BLACK SILHOUETTE. Not an error, not a blank:
//   a correctly-sized, correctly-shaped, fully-opaque black blob where the crest
//   should be.
//
// Two things make that the worst possible failure mode:
//
//   1. `<style>` + `class=` IS THE DEFAULT ADOBE ILLUSTRATOR EXPORT. Illustrator's
//      "Save As SVG / Style Elements" writes exactly `.st0`, `.st1`, `.st2`. It is
//      not an edge case, it is what a school's designer sends the webmaster, and
//      the class names are literally how you recognise the file.
//
//   2. IT PASSES EVERY QC CHECK WE HAVE. Run the black blob through
//      `analyzeArtwork`: resolution is whatever we rendered it at, so fine; the
//      background is transparent, so no `background-opaque`; the edges are
//      anti-aliased black against transparent, so `estimateMatte` finds a black
//      matte matching the black art and correctly returns null; ink coverage is
//      well above `MIN_INK_FRACTION`. Zero findings. `isUsable` says yes. The user
//      is shown a card, crops it, and the printer lays down a black rectangle in
//      the shape of their school crest.
//
// So the defence cannot be downstream quality control — QC has already been proven
// blind to this. It has to be a SOURCE-LEVEL REFUSAL before the candidate is ever
// ranked, plus a pixel-level backstop for whatever the source scan misses.
//
// Both halves are here, both pure. No canvas: the pixel check takes RGBA that
// somebody else produced.

import type { Pixels } from "@/lib/utils/artwork-qc";

/** Stable codes. The UI maps them through `SVG_RISK_COPY`; tests assert on them. */
export type SvgRisk =
  | "internal-stylesheet"
  | "class-styled"
  | "current-color"
  | "use-reference"
  | "text-element"
  | "embedded-image"
  | "foreign-object"
  | "script";

export const SVG_RISK_COPY: Record<SvgRisk, string> = {
  "internal-stylesheet":
    "Its colours live in an internal <style> block, which the renderer drops — it would print as a black silhouette.",
  "class-styled":
    "Its shapes are painted by CSS class, and there is no CSS at print time — it would print as a black silhouette.",
  "current-color":
    "It inherits its colour from the page (fill=\"currentColor\"), and there is no page at print time.",
  "use-reference":
    "It is assembled from <use> references to a sprite sheet we do not have.",
  "text-element":
    "It sets type with <text>, so it needs the school's font installed to render — it will reflow or vanish.",
  "embedded-image":
    "It embeds another image, which has to be fetched separately and usually is not.",
  "foreign-object":
    "It contains <foreignObject> (HTML inside SVG), which a non-browser renderer cannot draw at all.",
  script: "It contains <script>. We do not execute markup we downloaded.",
};

/**
 * Every reason this SVG source cannot be trusted to rasterise as it looks.
 *
 * Returns `[]` for an SVG that paints itself with presentation attributes
 * (`fill="#C8102E"` on the path) — the one form that survives a headless render,
 * and the form worth keeping.
 *
 * A NON-EMPTY RESULT IS FATAL. It is not a warning and not a score penalty: the
 * whole finding above is that a broken SVG looks perfect to every other check, so a
 * penalised-but-present candidate would still surface the moment a page had nothing
 * better. `rank-candidates.ts` drops these before ranking.
 *
 * Deliberately string-matching rather than parsing. This runs on downloaded markup
 * from an untrusted host; a scanner that skips a construct it does not understand
 * fails OPEN, and failing open is exactly the thing that got us a black crest. A
 * substring match cannot be talked out of a hit by malformed markup.
 */
export function svgRenderRisks(source: string): string[] {
  const risks: string[] = [];
  const s = source;
  const has = (re: RegExp) => re.test(s);

  // The Illustrator idiom, both halves. Both are flagged separately because a file
  // can have one without the other: an external stylesheet leaves `class=` with no
  // `<style>`, and that renders black just the same.
  if (has(/<\s*style[\s>]/i)) risks.push("internal-stylesheet");
  if (has(/\sclass\s*=/i)) risks.push("class-styled");

  // `currentColor` resolves against the CSS cascade. There is no cascade in a
  // canvas; the spec default is black, so this is the same silhouette by a
  // different route. Matched in both attribute and inline-style form.
  if (has(/currentcolor/i)) risks.push("current-color");

  // <use xlink:href="#icon-crest"> points into a sprite that lives in another file
  // (or in the page's body, which we are not sending to the renderer). The referenced
  // geometry is simply absent — this one renders EMPTY rather than black, which is
  // arguably worse because an empty badge looks like our bug.
  if (has(/<\s*use[\s>]/i)) risks.push("use-reference");

  // <text> needs the font. Schools set their wordmark in a licensed face that is not
  // installed on the render host, so the renderer substitutes — the mark comes out in
  // the wrong face at the wrong width, or (with no fallback) not at all. Converting to
  // outlines is the fix, and it is the designer's fix, not ours.
  if (has(/<\s*text[\s>]/i)) risks.push("text-element");

  // <image href=…> is a second fetch we are not going to make. Matches href and the
  // legacy xlink:href.
  if (has(/<\s*image[^>]*\s(?:xlink:)?href\s*=/i)) risks.push("embedded-image");

  // Not in the original brief; added because both fail the same way (a renderer with
  // no HTML engine and no JS engine draws nothing) and they cost one regex each.
  if (has(/<\s*foreignobject[\s>]/i)) risks.push("foreign-object");
  if (has(/<\s*script[\s>]/i)) risks.push("script");

  return risks;
}

/** Convenience for call sites that only want the verdict. */
export function isSvgSafeToRaster(source: string): boolean {
  return svgRenderRisks(source).length === 0;
}

/**
 * Hex colours the SVG source actually declares, uppercased and de-duped.
 *
 * Includes colours inside `<style>` — that is the point. If the file SAYS
 * `fill:#C8102E` anywhere and the raster comes back black, the declaration was
 * dropped, and that inference is what makes the pixel check below safe to act on.
 */
export function declaredFillColors(source: string): string[] {
  const out = new Set<string>();
  const re = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const h = m[1];
    const full =
      h.length === 3 ? `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}` : h;
    out.add(`#${full.toUpperCase()}`);
  }
  return [...out];
}

export interface RasterSanity {
  /** False when the raster must not be shown to the user. */
  ok: boolean;
  reason?: "black-blob";
  /** Share of pixels that are essentially opaque. */
  opaqueFraction: number;
  /** Mean RGB over opaque pixels only. `null` when the raster is empty. */
  meanRGB: [number, number, number] | null;
  /** Largest per-channel standard deviation over opaque pixels. */
  spread: number;
  message?: string;
}

/**
 * Below this mean channel value the raster is "black" for our purposes.
 *
 * The measured failure came back at exactly [0,0,0]; 10/255 leaves room for the
 * anti-aliasing and for a renderer that composites onto a near-black card, without
 * reaching any real ink colour (the darkest school navy in this repo's palette,
 * #0B1B3A, means 27).
 */
const BLACK_MEAN = 10;
/**
 * And below this per-channel spread it is UNIFORM black — one flat colour, no
 * internal structure at all. A real two-tone crest that happens to be very dark
 * still has a spread in the tens because its second colour is not black.
 */
const BLACK_SPREAD = 6;
/**
 * Ignore rasters with almost nothing in them. Under 0.5% opaque coverage the mean
 * is dominated by a handful of pixels and the verdict is noise — `near-empty` in
 * artwork-qc is the check that should speak for those, not this one.
 */
const MIN_COVERAGE = 0.005;

/**
 * The backstop: did this SVG render as a black silhouette?
 *
 * THE HARD PART IS THE FALSE POSITIVE. Plenty of school marks genuinely ARE solid
 * black — a black-and-gold high school's wordmark, a black seal. Pixels alone
 * cannot tell "black because it is a black logo" from "black because the fills were
 * dropped", because the two are pixel-identical.
 *
 * So this check does not use pixels alone. It rejects only when the pixels say
 * "uniform black" AND THE SOURCE SAID OTHERWISE:
 *
 *   - the source declared a non-black colour (`declaredFillColors`) → the file
 *     literally names a colour that is not in the output. That is a dropped
 *     declaration, full stop. Reject.
 *   - or the source carries a render risk → it was going to fail anyway; a black
 *     result confirms it. Reject.
 *   - neither → a black raster from a source that only ever asked for black is a
 *     black logo. ACCEPT it, and let the human looking at the preview decide.
 *
 * Callers with no source (a downloaded .svg we did not keep) can pass `{}` and get
 * the pixel measurements with `ok: true`, which is the honest answer: we cannot
 * tell, so we do not accuse.
 */
export function rasterSanity(
  px: Pixels,
  opts: { source?: string } = {},
): RasterSanity {
  const { data, width, height } = px;
  const total = width * height;
  if (total === 0) {
    return { ok: true, opaqueFraction: 0, meanRGB: null, spread: 0 };
  }

  let n = 0;
  const sum = [0, 0, 0];
  const sumSq = [0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    // Fully transparent RGB is undefined and reading it is how a bogus 49/255
    // measurement once got reported in this codebase. Opaque pixels only.
    if (data[i + 3] < 250) continue;
    n++;
    for (let c = 0; c < 3; c++) {
      sum[c] += data[i + c];
      sumSq[c] += data[i + c] * data[i + c];
    }
  }

  const opaqueFraction = n / total;
  if (n === 0) {
    return { ok: true, opaqueFraction, meanRGB: null, spread: 0 };
  }

  const mean: [number, number, number] = [sum[0] / n, sum[1] / n, sum[2] / n];
  let spread = 0;
  for (let c = 0; c < 3; c++) {
    spread = Math.max(spread, Math.sqrt(Math.max(0, sumSq[c] / n - mean[c] * mean[c])));
  }

  const looksBlack =
    opaqueFraction >= MIN_COVERAGE &&
    Math.max(mean[0], mean[1], mean[2]) < BLACK_MEAN &&
    spread < BLACK_SPREAD;

  if (!looksBlack) return { ok: true, opaqueFraction, meanRGB: mean, spread };

  const source = opts.source ?? "";
  const declared = declaredFillColors(source).filter((hex) => {
    const n2 = parseInt(hex.slice(1), 16);
    const max = Math.max((n2 >> 16) & 255, (n2 >> 8) & 255, n2 & 255);
    return max >= 32; // #000/#0a0a0a/#111 are "black"; anything brighter is a colour
  });
  const risks = source ? svgRenderRisks(source) : [];

  if (declared.length === 0 && risks.length === 0) {
    return {
      ok: true,
      opaqueFraction,
      meanRGB: mean,
      spread,
      message:
        "Renders as flat black, but nothing in the file asked for another colour — treating it as a black mark.",
    };
  }

  return {
    ok: false,
    reason: "black-blob",
    opaqueFraction,
    meanRGB: mean,
    spread,
    message: declared.length
      ? `Rendered as a flat black silhouette even though the file declares ${declared.slice(0, 3).join(", ")} — the colours were dropped.`
      : "Rendered as a flat black silhouette, and the file has render risks that explain it.",
  };
}
