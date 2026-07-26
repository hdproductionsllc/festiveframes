import type { BottomBarConfig, QRCodeConfig } from "@/lib/types";

export const DEFAULT_BOTTOM_BAR: BottomBarConfig = {
  text: "FESTIVE FRAMES",
  fontFamily: "'Stars and Stripes', 'Bebas Neue', sans-serif",
  fontSize: 1, // FILL — auto-fit grows text to fill the bar; slider scales down from 100%
  textColor: "#FFFFFF",
  backgroundColor: "#1B2A4A",
  textAlign: "center",
  letterSpacing: 2,
};

export const DEFAULT_QR_CODE: QRCodeConfig = {
  enabled: false, // QR is opt-in — off by default; toggle it on per design
  url: "https://festiveframes.co",
  size: 40,
};

/**
 * SCHOOL BUILDER: the top and bottom banners start in TEXT mode.
 *
 * These bars are where a school's name and mascot go — that is what the frame is
 * FOR — so tiles there are the exception rather than the default. Starting them as
 * text means a first-time user sees the shape of the finished product instead of an
 * empty rail they have to discover a mode toggle to use. Switching a bar to tiles is
 * one tap in the section editor, and doing so writes an explicit `mode: "tiles"`.
 *
 * The copy is deliberately placeholder-ish ("HOME OF THE" / "WILDCATS") so it reads
 * as something to replace, and it exercises BOTH tiers of the double-height bottom
 * banner (headline + smaller tagline) so the feature is discoverable.
 *
 * The tagline seeds a real year rather than a blank. A blank asks to be completed,
 * but it also looks unfinished in a demo and in the shop's own sample frames, and
 * the year is a single tap to change in the section editor.
 *
 * Only `top` and `bottom` appear here — `sectionSupportsText` allows text on those
 * two panels alone, and the side wings stay tiles.
 */
/**
 * The HEADLINE face for school banners: a true collegiate block.
 *
 * Graduate is the varsity lettering of letterman jackets, gym floors and
 * championship banners — squared serifs with spurs. Alfa Slab One, which this
 * builder seeded for a while, is a revival of Robert Thorne's Six-lines Pica
 * Egyptian (Thorowgood, 1821): a Victorian advertising slab. Bold and legible, but
 * a fairground face rather than an athletic one, which is why it read as almost-
 * right and never quite right.
 */
export const SCHOOL_HEADLINE_FONT = "'Graduate', 'Rockwell', serif";

/**
 * The TAGLINE face — a condensed athletic sans, the modern uniform-nameplate look.
 *
 * Real banners are set in two voices: a heavy block headline over a condensed
 * secondary line. Setting the tagline in the headline's face at a smaller size just
 * looks like the headline shrank.
 */
export const SCHOOL_TAGLINE_FONT = "'Oswald', 'Saira Condensed', sans-serif";

/**
 * Exact family strings this builder has SEEDED in the past and no longer wants.
 *
 * A section's font is persisted, so a returning user keeps whatever was seeded when
 * they first opened the builder — a new default alone never reaches them. Matching
 * the EXACT seeded string (not merely "contains Alfa Slab") means only our own value
 * is refreshed; anyone who deliberately picked this face from the font picker set a
 * different family string and keeps it.
 */
export const LEGACY_SEEDED_BANNER_FONTS: readonly string[] = [
  "'Alfa Slab One', 'Graduate', serif",
];

export const SCHOOL_DEFAULT_SECTIONS = {
  top: {
    mode: "text" as const,
    text: {
      ...DEFAULT_BOTTOM_BAR,
      text: "HOME OF THE",
      fontFamily: SCHOOL_HEADLINE_FONT,
      letterSpacing: 4,
    },
  },
  bottom: {
    mode: "text" as const,
    text: {
      ...DEFAULT_BOTTOM_BAR,
      text: "WILDCATS",
      tagline: "CLASS OF 2027",
      fontFamily: SCHOOL_HEADLINE_FONT,
      taglineFontFamily: SCHOOL_TAGLINE_FONT,
      letterSpacing: 2,
    },
  },
};
