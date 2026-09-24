"use client";

import type { BottomBarConfig, BottomTab } from "@/lib/types";
import { tabTextBox } from "@/lib/utils/bottom-tab";
import { CAP_SEAT_CSS, widthLimitedFont } from "@/lib/utils/banner-tiers";
import { textChenilleCss } from "@/lib/utils/tile-theme";
import { useDesignStore } from "@/stores/design-store";

// ─── The keystone's TAGLINE, on screen ──────────────────────────────────────
//
// Text only. The tab's field, rim and bevel are painted with the bar's as ONE
// part by `KeystoneBarChrome`; this element seats the class-year line inside the
// tab exactly where the print composer does (`tabTextBox`), low in the rise and
// toward the name it belongs with.
//
// It is mounted by FrameCanvas as a SIBLING of the bottom banner, not a child:
// the banner's wrapper clips to its own box, and the tab stands above it.

let probe: CanvasRenderingContext2D | null = null;
/** A line's glyph run in ems of `family` (the print path's measurement). */
function emWidth(line: string, family: string): number {
  if (!probe && typeof document !== "undefined") probe = document.createElement("canvas").getContext("2d");
  if (!probe) return line.length * 0.5;
  probe.font = `700 100px ${family}`;
  return probe.measureText(line).width / 100;
}

export function BottomTabElement({
  tab,
  config,
  pxPerInch,
  centerX,
  barTopY,
}: {
  tab: BottomTab;
  /** The bottom banner's config — the tab carries its tagline in its colours. */
  config: BottomBarConfig;
  pxPerInch: number;
  /** Frame-space x of the banner's centre, and y of its top edge. */
  centerX: number;
  barTopY: number;
}) {
  const rimColor = useDesignStore((s) => s.rimColor);
  const line = config.tagline?.trim() ?? "";
  const rise = tab.riseInches * pxPerInch;
  const base = tab.baseInches * pxPerInch;
  if (rise <= 0 || base <= 0 || !line) return null;

  const box = tabTextBox(tab, pxPerInch);
  const family = config.taglineFontFamily ?? config.fontFamily;
  // The em-width the fitter needs, MEASURED the way the print composer measures it
  // (weight 700 at a 100px probe), so both size the line alike. A rough per-glyph
  // estimate stands in only where there is no canvas (server render).
  const fontPx = Math.min(box.height, widthLimitedFont(emWidth(line, family), line.length, 0, box.width));

  return (
    <div
      aria-hidden
      data-keystone-tagline
      style={{
        position: "absolute",
        left: centerX - box.width / 2,
        top: barTopY - rise + box.centerFromTop - box.height / 2,
        width: box.width,
        height: box.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: family,
          fontSize: fontPx,
          fontWeight: 800,
          fontSynthesis: "none",
          lineHeight: 1,
          whiteSpace: "pre",
          color: config.textColor,
          // The tab's lettering is the banner's lettering. Same merrow, same
          // contrast rule, or the two lines of the lockup read as two products.
          ...textChenilleCss(fontPx, config.textColor, rimColor, config.backgroundColor),
          // Capitals centred on the box centre, as the print seats them
          // (capSeatBaseline). A flex item is a block, so the trim applies.
          ...CAP_SEAT_CSS,
        }}
      >
        {line}
      </span>
    </div>
  );
}
