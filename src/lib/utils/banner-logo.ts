import type { BottomBarConfig } from "@/lib/types";

// ─── A crest set INTO the banner ─────────────────────────────────────────────
//
// The banner is the widest single element on the frame and it was text-only, so a
// school's actual mark could never sit beside its name — the arrangement every gym
// wall, letterhead and jersey already uses.
//
// This is the GEOMETRY, computed once and consumed by both renderers. The two draw
// with completely different primitives (CSS boxes and canvas rects) and would
// otherwise each need their own idea of how much width a crest takes, which is
// exactly how the on-screen banner and the printed one drift apart.

/**
 * The crest's height as a fraction of the banner's.
 *
 * Not 1.0: a mark that touches both edges reads as a background image rather than a
 * lockup, and on a two-row bottom panel it would collide with the bevel. 0.72 leaves
 * the banner's own chrome visible above and below it.
 */
export const LOGO_HEIGHT_RATIO = 0.72;

/** Gap between the crest and the text, as a fraction of the banner's height. */
export const LOGO_GAP_RATIO = 0.08;

export interface BannerLogoLayout {
  /** Square box for the crest. Crests are usually square-ish; a wide mark letterboxes
   *  inside this rather than stealing width the text needs. */
  size: number;
  /** Left inset of the left-hand crest, or null when there isn't one. */
  leftX: number | null;
  /** Left inset of the right-hand crest, or null when there isn't one. */
  rightX: number | null;
  /** Top inset — vertically centred in the banner. */
  y: number;
  /** Where the TEXT may live once the crests have taken their share. */
  textX: number;
  textWidth: number;
}

/**
 * Where the crest(s) and the remaining text area sit inside a banner.
 *
 * `inset` is the chrome the banner already reserves (rim + bevel + air) — the crest
 * lives inside it for the same reason the text does.
 *
 * Returns null when there is no crest, so a caller can keep its existing text-only
 * path untouched rather than branching on a degenerate layout.
 */
export function bannerLogoLayout(
  config: Pick<BottomBarConfig, "logo">,
  width: number,
  height: number,
  inset: number,
): BannerLogoLayout | null {
  const logo = config.logo;
  if (!logo?.url) return null;

  const contentH = Math.max(1, height - inset * 2);
  const size = Math.max(1, Math.round(contentH * LOGO_HEIGHT_RATIO));
  const gap = Math.max(2, Math.round(height * LOGO_GAP_RATIO));
  const y = Math.round((height - size) / 2);

  const wantsLeft = logo.placement === "left" || logo.placement === "both";
  const wantsRight = logo.placement === "right" || logo.placement === "both";

  const leftX = wantsLeft ? inset : null;
  const rightX = wantsRight ? width - inset - size : null;

  // The text gets what is left. A crest that would leave no room for the words is
  // the wrong trade on a banner whose whole job is the words, so the text area is
  // never allowed below a third of the bar — past that the crest simply overlaps
  // less rather than the text vanishing.
  const takenLeft = wantsLeft ? size + gap : 0;
  const takenRight = wantsRight ? size + gap : 0;
  const rawX = inset + takenLeft;
  const rawWidth = width - inset * 2 - takenLeft - takenRight;
  const floor = Math.round((width - inset * 2) / 3);

  if (rawWidth >= floor) {
    return { size, leftX, rightX, y, textX: rawX, textWidth: rawWidth };
  }
  // Squeezed: keep the text at its floor, centred in what remains.
  const textWidth = floor;
  const textX = Math.round((width - textWidth) / 2);
  return { size, leftX, rightX, y, textX, textWidth };
}
