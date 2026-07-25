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
 * Only `top` and `bottom` appear here — `sectionSupportsText` allows text on those
 * two panels alone, and the side wings stay tiles.
 */
export const SCHOOL_DEFAULT_SECTIONS = {
  top: {
    mode: "text" as const,
    text: {
      ...DEFAULT_BOTTOM_BAR,
      text: "HOME OF THE",
      fontFamily: "'Graduate', 'Rockwell', serif",
      letterSpacing: 4,
    },
  },
  bottom: {
    mode: "text" as const,
    text: {
      ...DEFAULT_BOTTOM_BAR,
      text: "WILDCATS",
      tagline: "CLASS OF 2026",
      fontFamily: "'Graduate', 'Rockwell', serif",
      letterSpacing: 2,
    },
  },
};
