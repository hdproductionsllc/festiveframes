// Two-tier bottom banner geometry — a big HEADLINE over a smaller TAGLINE. Shared by
// the on-screen render (SectionTextElement) and the print render (drawTextBlock in
// compose-school-frame) so the two never diverge: both split the (padding-inset)
// content box into the same vertical bands and fit each line to its own band. Only the
// per-engine text MEASUREMENT differs; the bands are identical.

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

// ─── Tracking, and the width the type actually occupies ──────────────────────
//
// `letterSpacing` is stored in PIXELS and applied in pixels by both renderers,
// but the two draw at wildly different scales: the print sheet is thousands of
// pixels wide and a phone's preview is a few hundred. So the same stored 4 is a
// whisper on the print sheet and, on a 390px-wide phone, eats a hundred pixels
// of a two-hundred-pixel banner — which starves the glyphs, forces the fitter
// down to about 7px in a 21px-tall bar, and leaves lettering that is both tiny
// and, once the edge treatment is added on top, thick. It also overflowed: the
// bar clipped the first letter of a long school name.
//
// Tracking is a typographic proportion, so it is capped as a fraction of the
// font it is applied to. The cap NEVER binds at print scale or on a desktop
// preview — the stored values are already well inside it there — so this changes
// nothing that currently looks right. It only stops the starved case.

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
