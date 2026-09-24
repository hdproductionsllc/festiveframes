// Two-tier bottom banner geometry — a big HEADLINE over a smaller TAGLINE. Shared by
// the on-screen render (SectionTextElement) and the print render (drawTextBlock in
// compose-school-frame) so the two never diverge: both split the (padding-inset)
// content box into the same vertical bands and fit each line to its own band. Only the
// per-engine text MEASUREMENT differs; the bands are identical.

import { SCHOOL_PRINT_DPI } from "@/lib/constants/frame";

export const BANNER_HEADLINE_FRACTION = 0.6; // top band — the big line
export const BANNER_GAP_FRACTION = 0.08; // breathing room between the tiers
export const BANNER_TAGLINE_FRACTION = 0.32; // bottom band — the smaller line

export interface BannerBands {
  headlineH: number;
  taglineH: number;
  /** Y of each band's TOP, measured from the content box's top (after padding). */
  headlineTop: number;
  taglineTop: number;
}

/** Split a content box of height `contentH` into the headline + tagline bands. */
export function bannerBands(contentH: number): BannerBands {
  const headlineH = contentH * BANNER_HEADLINE_FRACTION;
  const taglineH = contentH * BANNER_TAGLINE_FRACTION;
  const gap = contentH * BANNER_GAP_FRACTION;
  return {
    headlineH,
    taglineH,
    headlineTop: 0,
    taglineTop: headlineH + gap,
  };
}

// ─── Where a line of lettering sits VERTICALLY: on its capitals ──────────────
//
// Both renderers used to centre a line by their own native convention: canvas on
// textBaseline "middle", CSS on the em line box. The capitals land in different
// places under the two, so the keystone tagline sat about 0.1" higher on screen
// than in print, and the bar's name drifted the same way. Banner lettering is set
// in capitals, so the one rule is: THE CAP BLOCK IS CENTRED ON THE LINE'S CENTRE.
//
//   print   textBaseline "alphabetic" at `capSeatBaseline(centre, capHeight)`,
//           capHeight measured off the font ('H' ink ascent) at that size;
//   screen  `CAP_SEAT_CSS` trims each line's box to cap-top..baseline, so the
//           flex centring that already places it centres the capitals.
//
// A browser without `text-box-trim` (Firefox, as of 2026-09) ignores the two
// properties and falls back to line-box centring — the old behaviour, a hair
// high — rather than to anything broken.

/** The alphabetic baseline that centres a line's capitals on `centreY`. */
export function capSeatBaseline(centreY: number, capHeightPx: number): number {
  return centreY + capHeightPx / 2;
}

/** CSS that makes a line's box exactly its cap block (see above). */
export const CAP_SEAT_CSS = {
  textBoxTrim: "trim-both",
  textBoxEdge: "cap alphabetic",
} as unknown as import("react").CSSProperties;

// ─── Tracking, and the width the type actually occupies ──────────────────────
//
// `letterSpacing` is stored in PIXELS OF THE PRINT SHEET (SCHOOL_PRINT_DPI) — the
// scale every seeded value was tuned against — and each renderer converts it
// through its OWN px-per-inch with `trackingAt`. It used to be applied as raw
// pixels at whatever scale the renderer drew, so the same stored 4 was 0.013" of
// space in print, 0.073" on a 55 px/in desktop preview and about 0.2" on a phone:
// the builder showed "W I L D C A T S" spaced out and shrunk while the print set
// it tight and heavy, and the parent approves the phone view. One unit, converted
// in one place, and the two renderers agree on the ink box.
//
// Tracking is also a typographic proportion, so it is capped as a fraction of the
// font it is applied to. With the scale fixed the cap is a GUARD, not the thing
// doing the work: it never binds on a seeded banner at any scale.

/** Stored `letterSpacing` → px, for a renderer drawing at `pxPerInch`. */
export function trackingAt(letterSpacing: number, pxPerInch: number): number {
  return (letterSpacing * pxPerInch) / SCHOOL_PRINT_DPI;
}

/** Ceiling on letter-spacing, as a fraction of the font size. */
export const MAX_TRACKING_EM = 0.16;

/**
 * The stroke that sits OUTSIDE the glyphs (the merrow thread, half of its width
 * on each side), as a fraction of the font size. It is ink, it is part of what
 * has to fit, and neither fitter used to account for it.
 *
 * Kept in step with `textEmboss`'s `merrow.width` in tile-theme.ts.
 */
export const INK_BLEED_EM = 0.075;

/** The letter-spacing actually used at this font size. */
export function trackingPx(letterSpacing: number, fontPx: number): number {
  return Math.min(letterSpacing, Math.max(0, fontPx) * MAX_TRACKING_EM);
}

/**
 * The largest font size whose glyph run, tracking and merrow all fit `contentW`.
 *
 * `emWidth` is the run's width in ems — measure it at any probe size and divide.
 * `chars` is the FULL character count, not count-1: both CSS and canvas add the
 * spacing after the last character too, and reserving one fewer is how a line
 * fitted to the pixel ended up one gap too wide for its bar.
 */
export function widthLimitedFont(
  emWidth: number,
  chars: number,
  letterSpacing: number,
  contentW: number,
): number {
  const glyph = Math.max(1e-6, emWidth + INK_BLEED_EM);
  const uncapped = (contentW - letterSpacing * chars) / glyph;
  // Does the stored spacing sit inside the cap at that size? Then nothing changes.
  if (uncapped > 0 && letterSpacing <= uncapped * MAX_TRACKING_EM) return uncapped;
  // Otherwise spacing scales with the type, and the two are solved together.
  return contentW / (glyph + MAX_TRACKING_EM * chars);
}
