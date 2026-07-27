// ─── Which CMS built this page ───────────────────────────────────────────────
//
// Worth knowing for exactly two reasons, and no more:
//
//   1. WHERE THE COLOURS ARE. Edlio puts its `:root` custom properties in a <style>
//      block inside <main>; WordPress block themes put theirs in
//      `--wp--preset--color--*`; Finalsite uses `--fs-*`. Knowing the platform turns
//      a frequency guess into a named lookup.
//
//   2. WHOSE LOGO IS IN THE HEADER. Every one of these platforms stamps its OWN
//      corporate mark into the school's chrome. See rank-candidates.ts.
//
// It is NOT a gate. `unknown` has to produce a full profile — a large share of
// school sites are hand-built or run something nobody has fingerprinted, and those
// pages still have a <title>, a header <img> and a stylesheet full of hex. Detection
// only ever adds hints; extraction never asks permission.

import type { PlatformDetection, SchoolPlatform } from "./types";

interface Fingerprint {
  platform: SchoolPlatform;
  /** What to look for in the raw HTML. */
  pattern: RegExp;
  /**
   * Weight. 3 = only this platform ever emits this string. 2 = strongly
   * indicative. 1 = suggestive but shared with other tools (a CDN hostname a
   * reseller might also use).
   */
  weight: 1 | 2 | 3;
  label: string;
}

/**
 * The strings are taken from each vendor's own published markup and from the
 * chrome they inject. Where a signal is weak, it is weighted 1 rather than left
 * out, because the sum is what decides and a lone weak signal cannot win.
 */
const FINGERPRINTS: Fingerprint[] = [
  // Edlio. The `edlio-` class prefix and `apps.edlio.com` are theirs alone. The
  // `/pics/` path is Edlio's media route and shows up in every image src on a
  // school running it.
  { platform: "edlio", pattern: /\bedlio-(?:logo|footer|header|nav)\b/i, weight: 3, label: "edlio-* class in the chrome" },
  { platform: "edlio", pattern: /apps\.edlio\.com|cdn\.edlio\.com|edlioadmin/i, weight: 3, label: "Edlio host" },
  { platform: "edlio", pattern: /powered by\s*<[^>]*>?\s*edlio|>\s*edlio\s*</i, weight: 2, label: "Powered by Edlio" },
  { platform: "edlio", pattern: /<meta[^>]+generator[^>]+edlio/i, weight: 3, label: "generator: Edlio" },
  { platform: "edlio", pattern: /src=["'][^"']*\/pics\//i, weight: 1, label: "/pics/ media path" },

  // Finalsite. `fsElement`/`fs-element` and the `#fsPoweredByFinalsite` node are
  // unmistakable; `resources.finalsite.net` is their CDN.
  { platform: "finalsite", pattern: /fsPoweredByFinalsite/i, weight: 3, label: "#fsPoweredByFinalsite node" },
  { platform: "finalsite", pattern: /\bfs(?:Element|Content|Banner|Page)\b|\bfs-element\b/i, weight: 3, label: "fsElement markup" },
  { platform: "finalsite", pattern: /resources\.finalsite\.net|finalsite\.com/i, weight: 2, label: "Finalsite host" },
  { platform: "finalsite", pattern: /--fs-[a-z-]+\s*:/i, weight: 2, label: "--fs-* custom properties" },

  // Apptegy. Their product is branded Thrillshare; the CMS assets sit on
  // apptegy.net.
  { platform: "apptegy", pattern: /apptegy|thrillshare/i, weight: 3, label: "Apptegy/Thrillshare asset" },
  { platform: "apptegy", pattern: /cmsv2-assets|\bdata-apptegy\b/i, weight: 2, label: "Apptegy CMS assets" },

  // WordPress. wp-content/wp-includes are structural; the generator meta is exact.
  { platform: "wordpress", pattern: /<meta[^>]+generator[^>]+wordpress/i, weight: 3, label: "generator: WordPress" },
  { platform: "wordpress", pattern: /\/wp-(?:content|includes)\//i, weight: 2, label: "/wp-content/ asset path" },
  { platform: "wordpress", pattern: /\/wp-json\/|wp-emoji-release|class=["'][^"']*\bwp-block-/i, weight: 2, label: "WordPress runtime markup" },
  { platform: "wordpress", pattern: /--wp--preset--color--/i, weight: 2, label: "--wp--preset--color--* palette" },

  // Squarespace. They ship a literal HTML comment saying so.
  { platform: "squarespace", pattern: /this is squarespace/i, weight: 3, label: "\"This is Squarespace\" comment" },
  { platform: "squarespace", pattern: /static1\.squarespace\.com|squarespace-cdn\.com/i, weight: 3, label: "Squarespace CDN" },
  { platform: "squarespace", pattern: /\bsqs-block\b|\bsqs-layout\b|Static\.SQUARESPACE_CONTEXT/i, weight: 2, label: "sqs-* markup" },
];

/**
 * Fingerprint the page.
 *
 * Sum of weights per platform; highest total wins. A sum rather than first-match,
 * because school sites are layered — a WordPress site can embed a Finalsite
 * calendar widget, and the widget's one hostname must not outvote four structural
 * WordPress signals.
 *
 * `confidence` is the winner's share of all points scored, scaled by whether it
 * cleared the "one exclusive signal" bar. A lone weight-1 hit tops out at ~0.35,
 * which is a number the UI can treat as "probably, but do not rely on it".
 */
export function detectPlatform(html: string, pageUrl = ""): PlatformDetection {
  const scores = new Map<SchoolPlatform, number>();
  const signals = new Map<SchoolPlatform, string[]>();
  const haystack = `${html}\n${pageUrl}`;

  for (const fp of FINGERPRINTS) {
    if (!fp.pattern.test(haystack)) continue;
    scores.set(fp.platform, (scores.get(fp.platform) ?? 0) + fp.weight);
    const list = signals.get(fp.platform) ?? [];
    list.push(fp.label);
    signals.set(fp.platform, list);
  }

  if (scores.size === 0) {
    return {
      platform: "unknown",
      confidence: 0,
      // Said out loud so the debug panel does not read as a crash. "unknown" is a
      // supported platform, not a missing one.
      signals: ["No platform fingerprint matched — using the generic extractors."],
    };
  }

  let best: SchoolPlatform = "unknown";
  let bestScore = 0;
  let total = 0;
  for (const [platform, score] of scores) {
    total += score;
    if (score > bestScore) {
      bestScore = score;
      best = platform;
    }
  }

  // Share of the evidence, then capped by how strong the best single signal was: a
  // platform identified only by a shared CDN hostname should never report 1.0 just
  // because nothing else matched.
  const share = bestScore / total;
  const ceiling = bestScore >= 5 ? 0.98 : bestScore >= 3 ? 0.85 : bestScore >= 2 ? 0.6 : 0.35;
  return {
    platform: best,
    confidence: Math.min(share, ceiling),
    signals: signals.get(best) ?? [],
  };
}
