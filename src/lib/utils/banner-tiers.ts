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
