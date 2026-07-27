// ─── Finding the school's mark, and refusing everyone else's ─────────────────
//
// Collect, blocklist, dedupe, score. In that order, and the order is the argument.
//
// THE BLOCKLIST RUNS FIRST — before scoring, before dedupe, before anything looks
// at a single quality signal. The reason is specific and was reproduced: the <svg>
// inside `.edlio-logo` is EDLIO'S CORPORATE MARK, not the school's. It sits in the
// school's header, in a container whose class name contains the word "logo", at a
// sensible size, as clean inline SVG. Every quality heuristic this file has loves
// it. On score alone it beats the school's own 180px PNG crest, and the parent gets
// a frame with their CMS vendor's logo on it.
//
// Finalsite does the same with `#fsPoweredByFinalsite`. Apptegy, Blackboard,
// SchoolMessenger and Peachjar all stamp the chrome too. There is no score low
// enough to be safe, because "lowest-scoring candidate" still wins on a page where
// it is the only candidate — which is precisely the page a small school has. So
// these are REMOVED, not penalised.

import { MIN_DPI } from "@/lib/utils/artwork-qc";
import { evaluateResolution, type ResolutionVerdict } from "@/lib/utils/print-resolution";
import type { DropReason, LogoCandidate, LogoKind } from "./types";
import {
  elementOuter,
  elementRange,
  resolveUrl,
  type PageScan,
  type ScannedTag,
} from "./html-scan";
import { svgRenderRisks } from "./svg-risks";

// ─── vendor marks ────────────────────────────────────────────────────────────

/**
 * Containers whose CONTENTS belong to somebody other than the school.
 *
 * Matched against class and id, and applied to the element's whole byte range, so
 * anything nested inside — img, inline svg, background image — is excluded with it.
 */
const VENDOR_CONTAINER =
  /(edlio-logo|edlio-footer|fspoweredbyfinalsite|fs-powered-by|powered-?by|poweredby|site-credit|footer-credit|credits?-bar|vendor-logo|cms-logo|designed-?by|built-?by)/i;

/** Assets that are somebody else's mark wherever they appear. */
const VENDOR_ASSET =
  /(edlio|finalsite|apptegy|thrillshare|schoolmessenger|blackboard|powerschool|parentsquare|peachjar|schoology|clever\.com|instructure|wordpress|wp-logo|squarespace|wixstatic|weebly|godaddy|duda|sitemap)/i;

/** Social buttons. Header-resident, logo-shaped, and never the school's crest. */
const SOCIAL_ASSET =
  /(facebook|fb-icon|twitter|x-logo|instagram|youtube|yt-icon|tiktok|linkedin|vimeo|flickr|pinterest|snapchat|threads|social[-_]?(icon|media))/i;

/** Beacons and furniture that are shaped like images but contain nothing. */
const TRACKING_ASSET =
  /(spacer|pixel\.(gif|png)|blank\.(gif|png)|1x1\.|transparent\.(gif|png)|doubleclick|googletagmanager|google-analytics|facebook\.com\/tr|beacon)/i;

/**
 * UI-library sprite sheets and icon atlases. Shaped exactly like a candidate — a few
 * hundred pixels square, referenced from CSS, sitting in the page chrome — and never
 * anybody's crest.
 *
 * `ui-icons_444444_256x240.png` is jQuery UI's icon atlas, and it was offered to a
 * real user as a possible school logo the first time stylesheets were read. The name
 * pattern is stable across the libraries that ship one.
 */
const UI_SPRITE_ASSET =
  /(ui-icons?[-_]|icon-?sprite|sprites?\.(png|svg|gif)|glyphicons|iconfont|icomoon|fontawesome|material-?icons)/i;

/** Byte ranges of vendor containers. Computed once, before candidates are scored. */
export function vendorRanges(scan: PageScan): [number, number][] {
  const ranges: [number, number][] = [];
  for (const tag of scan.tags) {
    const marker = `${tag.attrs.class ?? ""} ${tag.attrs.id ?? ""}`;
    if (!VENDOR_CONTAINER.test(marker)) continue;
    const r = elementRange(scan.html, tag);
    ranges.push([tag.start, r.outerEnd]);
  }
  return ranges;
}

const inRanges = (offset: number, ranges: [number, number][]): boolean =>
  ranges.some(([a, b]) => offset >= a && offset < b);

/**
 * The part of a URL that is allowed to accuse it: everything EXCEPT the hostname.
 *
 * THE HOST MUST NOT BE MATCHED, and getting this wrong is worse than not having a
 * blocklist at all. Finalsite hosts its customers' own uploads on
 * `resources.finalsite.net`; Edlio serves school crests from `cdn.edlio.com`. A
 * blocklist that greps the whole URL for "finalsite" therefore throws away THE
 * SCHOOL'S OWN LOGO on every Finalsite site in the country, silently, and leaves
 * the picker empty on exactly the pages that had a perfectly good crest.
 *
 * A vendor's own mark gives itself away in the FILE NAME (`edlio-logo-footer.png`,
 * `powered-by-apptegy.svg`) or in the markup around it — never in the host alone.
 */
function assetIdentity(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}`;
  } catch {
    return url; // relative URL, a data: URI, or "" — already host-free
  }
}

/**
 * Everything we know about a candidate that could identify it as not-the-school's.
 * Asset path, alt text, and the class/id of the element AND its ancestors — because
 * the Edlio mark's own <svg> tag carries no telltale attribute at all; only its
 * parent does.
 */
function vendorVerdict(
  candidate: LogoCandidate,
  markerText: string,
): DropReason | null {
  const haystack = `${assetIdentity(candidate.url)} ${candidate.alt ?? ""} ${markerText}`;
  if (VENDOR_ASSET.test(haystack) || VENDOR_CONTAINER.test(haystack)) return "vendor-mark";
  if (SOCIAL_ASSET.test(haystack)) return "social-icon";
  if (TRACKING_ASSET.test(haystack)) return "tracking-pixel";
  if (UI_SPRITE_ASSET.test(haystack)) return "tracking-pixel";
  return null;
}

// ─── collection ──────────────────────────────────────────────────────────────

/** Class/id/alt patterns that mean "this is the site's mark". */
const LOGO_MARKER = /(^|[-_ ])(logo|crest|seal|emblem|brandmark|wordmark|site-?brand|custom-logo)/i;
/** Weaker: the chrome the mark usually lives in. */
const CHROME_MARKER = /(header|masthead|navbar|site-?nav|site-?title|branding|top-?bar|hero)/i;

const numAttr = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

function markerFor(tag: ScannedTag): string {
  return [
    tag.attrs.class ?? "",
    tag.attrs.id ?? "",
    tag.attrs["aria-label"] ?? "",
    ...tag.ancestors.map((a) => `${a.name} ${a.id} ${a.className}`),
  ].join(" ");
}

/**
 * The marker text the VENDOR test is allowed to see: everything `markerFor` sees
 * except `<html>` and `<body>`.
 *
 * Caught by running it: Edlio writes `<body class="edlio-site">` and Finalsite
 * writes `<body class="fsElement">`. Those classes are on EVERY element's ancestor
 * chain, so a vendor test over the full chain drops every image on the page —
 * including the school's own crest, which is the one thing we came for. It cost the
 * Edlio fixture its logo the first time this ran.
 *
 * A body class says who BUILT the site. It says nothing about who owns this image.
 * The vendor's own mark identifies itself closer in — its own class (`.edlio-logo`,
 * `#fsPoweredByFinalsite`, both of which are handled as container ranges anyway),
 * its aria-label, or its file name.
 */
function vendorMarkerFor(tag: ScannedTag): string {
  return [
    tag.attrs.class ?? "",
    tag.attrs.id ?? "",
    tag.attrs["aria-label"] ?? "",
    ...tag.ancestors
      .filter((a) => a.name !== "html" && a.name !== "body")
      .map((a) => `${a.id} ${a.className}`),
  ].join(" ");
}

/**
 * Pull every plausible mark off the page.
 *
 * Note what is NOT collected: `og:image`.
 *
 * og:image is the obvious idea and it is wrong here, measured against real pages.
 * Edlio emits og:image capped at 250px on its long edge — 125 DPI on a 2" badge,
 * blocked by `evaluateResolution` before the user can crop it. Other pages emit it
 * EMPTY, or point it at a video poster frame, or at the current news article's
 * photo, so on a Tuesday the "school logo" is a picture of the eighth-grade bake
 * sale. It is a social-sharing card, not a brand asset, and treating it as one
 * produces a confident wrong answer.
 *
 * What it IS good for is a filename hint — "…/lincoln-crest-og.png" tells us the
 * word "crest" is in this school's asset naming — so it comes back as
 * `imageHints`, which only ever adjusts the score of a candidate found elsewhere.
 */
export function collectLogoCandidates(scan: PageScan): LogoCandidate[] {
  const out: LogoCandidate[] = [];
  const base = scan.pageUrl;

  // 1. <img>. `src`, or the lazy-loading attributes, because a header logo behind a
  //    lazyloader has `src` pointing at a 1x1 placeholder and the real file in
  //    `data-src` — take the placeholder and every candidate is a transparent pixel.
  //
  //    srcset OUTRANKS src, and we take its LARGEST entry. The first live scan
  //    rejected a school whose 512px logo was sitting in the same srcset as the
  //    150px variant we fetched: srcset lists are conventionally smallest-first,
  //    and `split(",")[0]` was literally selecting the smallest available file for
  //    a pipeline whose whole gate is "is this big enough to print".
  for (const tag of scan.tags) {
    if (tag.name !== "img") continue;
    const rawSrc =
      largestFromSrcset(tag.attrs.srcset ?? tag.attrs["data-srcset"] ?? "") ||
      tag.attrs["data-src"] ||
      tag.attrs["data-lazy-src"] ||
      tag.attrs.src ||
      "";
    const url = resolveUrl(rawSrc, base);
    if (!url) continue;
    out.push({
      url,
      kind: /\.svg(\?|#|$)/i.test(url) ? "svg-file" : "raster",
      source: "img",
      score: 0,
      declaredWidth: numAttr(tag.attrs.width),
      declaredHeight: numAttr(tag.attrs.height),
      alt: tag.attrs.alt,
      risks: [],
      offset: tag.start,
    });
  }

  // 2. Inline <svg>. Only in a logo or chrome context — a page's icon set is inline
  //    SVG too, and 40 chevrons and magnifying glasses are not candidates.
  for (const tag of scan.tags) {
    if (tag.name !== "svg") continue;
    const marker = markerFor(tag);
    if (!LOGO_MARKER.test(marker) && !CHROME_MARKER.test(marker)) continue;
    const source = elementOuter(scan.html, tag);
    out.push({
      url: "",
      kind: "inline-svg",
      source: "inline-svg",
      score: 0,
      alt: tag.attrs["aria-label"] ?? undefined,
      svgSource: source,
      declaredWidth: numAttr(tag.attrs.width),
      declaredHeight: numAttr(tag.attrs.height),
      // Measured at collection time so the drop can happen before ranking.
      risks: svgRenderRisks(source),
      offset: tag.start,
    });
  }

  // 3. CSS background images on the chrome. A surprising number of themes set the
  //    crest this way, and an `<img>`-only scan finds nothing on those pages.
  for (const css of scan.styles) {
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const selector = m[1].replace(/\s+/g, " ").trim();
      if (!LOGO_MARKER.test(selector) && !CHROME_MARKER.test(selector)) continue;
      for (const u of m[2].matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
        const url = resolveUrl(u[1], base);
        if (!url) continue;
        out.push({
          url,
          kind: /\.svg(\?|#|$)/i.test(url) ? "svg-file" : "css-background",
          source: `css:${selector.slice(0, 40)}`,
          score: 0,
          alt: selector,
          risks: [],
          // A CSS rule has no position in the element tree, so it cannot be inside a
          // vendor container by offset. -1 says "not positioned"; the vendor check
          // still sees the selector text, which is where `.edlio-logo` would show up.
          offset: -1,
        });
      }
    }
  }

  // 4. Favicons, last and lowest. A 32px icon is ~16 DPI on a 2" badge — it will be
  //    blocked by the resolution gate every time. It is collected anyway because an
  //    `apple-touch-icon` is often 180px and occasionally 512px, and because a
  //    candidate that gets shown as "too small to print" is more useful than a page
  //    that appears to have no logo at all.
  for (const tag of scan.tags) {
    if (tag.name !== "link") continue;
    const rel = (tag.attrs.rel ?? "").toLowerCase();
    if (!/(^|\s)(icon|shortcut icon|apple-touch-icon|apple-touch-icon-precomposed|mask-icon)(\s|$)/.test(rel)) {
      continue;
    }
    const url = resolveUrl(tag.attrs.href ?? "", base);
    if (!url) continue;
    const size = numAttr((tag.attrs.sizes ?? "").split("x")[0]);
    out.push({
      url,
      kind: "favicon",
      source: `link:${rel}`,
      score: 0,
      declaredWidth: size,
      declaredHeight: size,
      risks: [],
      offset: tag.start,
    });
  }

  return out;
}

/**
 * The largest URL in a `srcset`, by its width (`640w`) or density (`2x`) descriptor.
 * A descriptorless entry counts as 1x. Returns "" for an empty/absent srcset so the
 * caller's `||` chain falls through to the other attributes.
 */
export function largestFromSrcset(srcset: string): string {
  let bestUrl = "";
  let bestScore = -1;
  for (const entry of srcset.split(",")) {
    const parts = entry.trim().split(/\s+/);
    const url = parts[0];
    if (!url) continue;
    const d = parts[1] ?? "1x";
    const m = /^([\d.]+)(w|x)$/i.exec(d);
    // Width descriptors are in px and density in screens; multiplying density by a
    // nominal 400 makes "2x" comparable to "800w" rather than losing to every `w`.
    const score = m ? parseFloat(m[1]) * (m[2].toLowerCase() === "x" ? 400 : 1) : 400;
    if (score > bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }
  return bestUrl;
}

/**
 * A same-URL-family variant likely to be the FULL-SIZE original, or null when the
 * URL carries no size markers. CMS image services serve the header logo through a
 * resizer — `logo.png?width=150`, WordPress's `logo-300x150.png` — so the fetched
 * bytes are small even though the original on the same host is not. The route tries
 * this variant when the original measures too small; a variant that 404s or comes
 * back smaller costs one bounded fetch and changes nothing.
 */
export function upgradeCandidateUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  let changed = false;
  // Query-string resizers: width/height/w/h/size/scale/fit/crop/quality.
  for (const key of [...u.searchParams.keys()]) {
    if (/^(width|height|w|h|size|scale|fit|crop|quality|q|resize)$/i.test(key)) {
      u.searchParams.delete(key);
      changed = true;
    }
  }
  // WordPress-style `-300x150` suffix before the extension.
  const dePath = u.pathname.replace(/-\d{2,4}x\d{2,4}(\.[a-z0-9]+)$/i, "$1");
  if (dePath !== u.pathname) {
    u.pathname = dePath;
    changed = true;
  }

  // CLOUDINARY-STYLE PATH TRANSFORMATIONS. This is the one that matters most in
  // practice and the one this function originally missed: Finalsite (and therefore a
  // large share of US school sites) delivers every image through Cloudinary, where
  // the resize lives in a PATH SEGMENT rather than a query string —
  //
  //   /images/f_auto,q_auto,t_image_size_2/v1686857649/rsdmoorg/.../Logo.png
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ the whole segment is the transformation
  //
  // Dropping that segment asks the CDN for the ORIGINAL upload, which is the
  // full-size mark the school actually gave their CMS. A real example: the segment
  // above serves 512px; the school's original behind it is larger.
  //
  // Matched conservatively — every comma-separated token must look like a Cloudinary
  // parameter (`f_auto`, `w_300`, `t_image_size_2`) AND at least one must be a key
  // that actually affects size or format. A path segment that merely contains an
  // underscore is left alone, because `/assets/logo_final/` is a directory, not a
  // transformation, and stripping it would 404 every image on such a host.
  const SIZING_KEYS = /^(w|h|c|t|f|q|dpr|ar|e|g|x|y|z|b|bo|r)_/;
  const segments = u.pathname.split("/");
  const kept = segments.filter((seg) => {
    if (!seg.includes("_")) return true;
    const tokens = seg.split(",");
    const allParams = tokens.every((t) => /^[a-z]{1,3}_[A-Za-z0-9_.:%-]+$/.test(t));
    const anySizing = tokens.some((t) => SIZING_KEYS.test(t));
    return !(allParams && anySizing);
  });
  if (kept.length !== segments.length) {
    u.pathname = kept.join("/");
    changed = true;
  }

  return changed ? u.toString() : null;
}

/**
 * Icon candidates from a web-app manifest's `icons` array.
 *
 * The manifest is where the ONE reliably large icon lives: 512x512 is the size the
 * PWA install spec demands, so sites that have a manifest almost always have a 512
 * — frequently the only >=400px mark anywhere on the site. The first live scan's
 * school had exactly that: every visible logo too small, and a printable 512 sitting
 * unread in the manifest. Pure (parsed JSON in, candidates out); the route fetches.
 *
 * Sizes come from the DECLARED `sizes` field and are still verified by measurement
 * after fetch, like every other declared dimension in this package.
 */
export function manifestIconCandidates(manifest: unknown, manifestUrl: string): LogoCandidate[] {
  if (typeof manifest !== "object" || manifest === null) return [];
  const icons = (manifest as { icons?: unknown }).icons;
  if (!Array.isArray(icons)) return [];
  const out: LogoCandidate[] = [];
  for (const icon of icons) {
    if (typeof icon !== "object" || icon === null) continue;
    const src = (icon as { src?: unknown }).src;
    if (typeof src !== "string" || !src) continue;
    const url = resolveUrl(src, manifestUrl);
    if (!url) continue;
    // "512x512" or "48x48 96x96" — take the largest declared edge.
    const sizes = String((icon as { sizes?: unknown }).sizes ?? "");
    let edge: number | undefined;
    for (const m of sizes.matchAll(/(\d+)x(\d+)/gi)) {
      const e = Math.max(Number(m[1]), Number(m[2]));
      if (edge === undefined || e > edge) edge = e;
    }
    out.push({
      url,
      kind: /\.svg(\?|#|$)/i.test(url) ? "svg-file" : "raster",
      source: "manifest-icon",
      score: 0,
      declaredWidth: edge,
      declaredHeight: edge,
      risks: [],
      offset: -1,
    });
  }
  return out;
}

/** Filenames from og:image and friends. Hints only — never candidates. */
export function imageHints(scan: PageScan): string[] {
  const hints: string[] = [];
  for (const key of ["og:image", "og:image:secure_url", "twitter:image", "msapplication-tileimage"]) {
    const value = scan.meta[key];
    if (!value) continue;
    const url = resolveUrl(value, scan.pageUrl);
    if (!url) continue;
    const file = url.split("?")[0].split("/").pop();
    if (file) hints.push(file);
  }
  return [...new Set(hints)];
}

// ─── scoring ─────────────────────────────────────────────────────────────────

/**
 * Additive score. Every term is a sentence someone could argue with, which is the
 * point — a single opaque number nobody can defend is how the Edlio mark won.
 *
 * `schoolName` lets alt text that names the school outrank alt text that does not,
 * which is the strongest same-page discriminator there is.
 */
export function scoreLogoCandidate(
  candidate: LogoCandidate,
  opts: { schoolName?: string; hints?: string[]; markerText?: string } = {},
): number {
  let score = 0;
  const url = candidate.url.toLowerCase();
  const file = url.split("?")[0].split("/").pop() ?? "";
  const alt = (candidate.alt ?? "").toLowerCase();
  const marker = (opts.markerText ?? "").toLowerCase();

  // Kind. Vector wins on the one axis that matters most for a 2" print — it has no
  // resolution at all, so it can never be blocked by the DPI gate.
  const kindScore: Record<LogoKind, number> = {
    "inline-svg": 30,
    "svg-file": 30,
    raster: 20,
    "css-background": 12,
    favicon: 4,
    unknown: 0,
  };
  score += kindScore[candidate.kind];

  // Context. Being inside something called "logo" is the single strongest signal on
  // the page; being in the header is good but the header holds a lot of things.
  if (LOGO_MARKER.test(marker) || LOGO_MARKER.test(alt) || LOGO_MARKER.test(file)) score += 35;
  else if (CHROME_MARKER.test(marker)) score += 15;

  // Filename shape.
  if (/(logo|crest|seal|emblem|mark|brand)/i.test(file)) score += 18;
  if (/(icon|sprite|placeholder|spacer|blank|default|avatar|thumb|banner-ad|arrow|chevron)/i.test(file)) {
    score -= 15;
  }
  // The og:image filename told us this school's naming convention; a candidate
  // sharing its stem is probably the same asset family.
  for (const hint of opts.hints ?? []) {
    const stem = hint.split(".")[0].replace(/[-_](og|social|share|1200x630)$/i, "");
    if (stem.length >= 5 && file.includes(stem.toLowerCase())) score += 8;
  }

  // Alt text naming the school.
  if (opts.schoolName && alt) {
    const words = opts.schoolName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const hit = words.filter((w) => alt.includes(w)).length;
    if (words.length && hit / words.length >= 0.5) score += 12;
  }

  // Declared size. Markup lies about this often enough that it is worth less than
  // context — but a `width="32"` is still a reliable "this is not a crest".
  const side = Math.min(candidate.declaredWidth ?? Infinity, candidate.declaredHeight ?? Infinity);
  if (Number.isFinite(side)) {
    if (side >= 200) score += 12;
    else if (side >= 120) score += 8;
    else if (side <= 32) score -= 30;
    else if (side <= 48) score -= 18;
  }

  // Format, weighted by what each one costs downstream in artwork-qc's own terms.
  if (/\.svg(\?|#|$)/.test(url)) score += 10; // no DPI floor at all
  else if (/\.png(\?|#|$)/.test(url)) score += 6; // has alpha; crest cut-outs survive
  else if (/\.webp(\?|#|$)/.test(url)) score += 3;
  else if (/\.jpe?g(\?|#|$)/.test(url)) score -= 8; // no alpha → guaranteed matte fringe
  else if (/\.gif(\?|#|$)/.test(url)) score -= 12; // palette → `palette-quantized`
  else if (/\.ico(\?|#|$)/.test(url)) score -= 40; // a malformed one crashes the decoder; see raster-safety

  return score;
}

// ─── ranking ─────────────────────────────────────────────────────────────────

export interface RankedLogos {
  logos: LogoCandidate[];
  dropped: LogoCandidate[];
}

/**
 * The whole pipeline: blocklist → risk drop → dedupe → score → sort.
 *
 * Dropped candidates are RETAINED (with their reason) rather than discarded. A
 * page that comes back empty is the common case, and the difference between
 * debugging "we found nothing" and "we found four things and dropped all four as
 * vendor marks" is the difference between an afternoon and a minute.
 */
export function rankLogoCandidates(
  scan: PageScan,
  opts: { schoolName?: string } = {},
): RankedLogos {
  const ranges = vendorRanges(scan);
  const hints = imageHints(scan);
  const collected = collectLogoCandidates(scan);
  const dropped: LogoCandidate[] = [];
  const kept: { candidate: LogoCandidate; marker: string }[] = [];

  // Marker text per candidate, recovered from the tag that produced it. Needed both
  // for the vendor check and for scoring, so it is computed once.
  const markerByOffset = new Map<number, string>();
  const vendorMarkerByOffset = new Map<number, string>();
  for (const tag of scan.tags) {
    markerByOffset.set(tag.start, markerFor(tag));
    vendorMarkerByOffset.set(tag.start, vendorMarkerFor(tag));
  }

  for (const candidate of collected) {
    const marker = markerByOffset.get(candidate.offset) ?? candidate.alt ?? "";
    const vendorMarker = vendorMarkerByOffset.get(candidate.offset) ?? candidate.alt ?? "";

    // ── 1. blocklist, before anything else ──
    if (candidate.offset >= 0 && inRanges(candidate.offset, ranges)) {
      dropped.push({ ...candidate, dropped: "vendor-mark" });
      continue;
    }
    const vendor = vendorVerdict(candidate, vendorMarker);
    if (vendor) {
      dropped.push({ ...candidate, dropped: vendor });
      continue;
    }

    // ── 2. render risks are fatal, not a penalty ──
    // An Illustrator SVG scores beautifully and prints as a black silhouette. See
    // svg-risks.ts for the measurement. There is no score at which it is acceptable.
    if (candidate.risks.length > 0) {
      dropped.push({ ...candidate, dropped: "svg-render-risk" });
      continue;
    }

    kept.push({ candidate, marker });
  }

  // ── 3. dedupe ──
  // Keyed on the URL without its query string: WordPress appends `?ver=6.4.2` and
  // Edlio appends a cache-buster, so the same crest arrives two or three times and
  // would otherwise fill the picker with itself.
  const byKey = new Map<string, LogoCandidate>();
  for (const { candidate, marker } of kept) {
    const scored: LogoCandidate = {
      ...candidate,
      score: scoreLogoCandidate(candidate, { ...opts, hints, markerText: marker }),
    };
    const key =
      scored.kind === "inline-svg"
        ? `svg:${(scored.svgSource ?? "").replace(/\s+/g, "").slice(0, 400)}`
        : scored.url.split("?")[0].toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, scored);
      continue;
    }
    // Keep the better-scoring copy; the loser is still reported, so a "why is there
    // only one" question has an answer.
    if (scored.score > prev.score) {
      byKey.set(key, scored);
      dropped.push({ ...prev, dropped: "duplicate" });
    } else {
      dropped.push({ ...scored, dropped: "duplicate" });
    }
  }

  const logos = [...byKey.values()].sort(
    (a, b) => b.score - a.score || a.offset - b.offset,
  );
  return { logos, dropped };
}

// ─── the resolution gate (constraint 5) ──────────────────────────────────────

/**
 * The smallest thing a school badge can be: 2×2 tiles at the school frame's 0.991"
 * pitch. `sectionSupportsTiles` already forces 2×2 as the floor — a 1×1 badge does
 * not exist — so this is the real physical size every candidate must survive.
 */
export const MIN_BADGE_INCHES = 2 * 0.991;

/** Pixels a candidate needs on its short side to clear the block. 397 at 200 DPI. */
export const MIN_BADGE_PIXELS = Math.ceil(MIN_DPI * MIN_BADGE_INCHES);

export interface UsabilityVerdict {
  usable: boolean;
  verdict: ResolutionVerdict;
  message: string;
}

/**
 * Would the crop flow accept this image at badge size?
 *
 * This calls `evaluateResolution` — THE SAME FUNCTION the crop modal gates on —
 * rather than restating the threshold. That is the whole point of the function
 * existing. The two used to be separate numbers (150 here, 200 there) and the gap
 * was a dead end the user could walk into and not walk out of: this module called a
 * 300px logo usable, the picker offered it, and the crop modal then refused it with
 * no path forward. `MIN_DPI` in artwork-qc is now literally `BLOCK_DPI`; this
 * function is how the school-brand picker inherits that.
 *
 * Vector art has no pixels and is never blocked — pass `null` for it.
 */
export function gateByResolution(
  px: { width: number; height: number } | null,
  targetInches: { width: number; height: number } = {
    width: MIN_BADGE_INCHES,
    height: MIN_BADGE_INCHES,
  },
): UsabilityVerdict {
  if (!px) {
    const verdict = evaluateResolution(
      { width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER },
      targetInches,
    );
    return { usable: true, verdict, message: "Vector art — sharp at any size." };
  }
  const verdict = evaluateResolution(px, targetInches);
  if (verdict.blocked) {
    return {
      usable: false,
      verdict,
      message: `Only ${Math.round(verdict.dpi)} DPI on a ${targetInches.width.toFixed(1)}" badge — needs about ${MIN_BADGE_PIXELS}px on its short side.`,
    };
  }
  return {
    usable: true,
    verdict,
    message:
      verdict.level === "green"
        ? "Sharp at badge size."
        : "Prints, but softer than we would like.",
  };
}
