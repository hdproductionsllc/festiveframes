"use client";

import type { BottomBarConfig, BottomTab } from "@/lib/types";
import { tabClipPath, tabTextBox } from "@/lib/utils/bottom-tab";
import { widthLimitedFont } from "@/lib/utils/banner-tiers";
import { textChenilleCss, rimRamp } from "@/lib/utils/tile-theme";
import { useDesignStore } from "@/stores/design-store";

// ─── The keystone, on screen ────────────────────────────────────────────────
//
// The CSS twin of the shape `compose-school-frame` strokes on canvas. Both take
// their geometry from `lib/utils/bottom-tab.ts`, which exists so they cannot
// disagree — the same arrangement as tile-theme and banner-tiers, and for the
// same reason: this product has two renderers and every divergence between them
// has been found by the owner rather than by a test.
//
// It is mounted by FrameCanvas as a SIBLING of the bottom banner, not a child.
// The banner's wrapper is `overflow-hidden` (it has to be, for the rounded
// corners and the rail grooves), and the tab's whole job is to stand above that
// wrapper's top edge, so a child would be cut off at the base.

export function BottomTabElement({
  tab,
  config,
  pxPerInch,
  centerX,
  barTopY,
}: {
  tab: BottomTab;
  /** The bottom banner's config — the tab wears its colours and carries its tagline. */
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
  if (rise <= 0 || base <= 0) return null;

  // The rim scales with the tab, like every other edge in this product. A fixed
  // 2px band is invisible on a desktop preview and eats a fifth of the tab on a
  // phone, where the whole tab is about eleven pixels tall — which is exactly the
  // class of bug the banner lettering just had.
  const rimPx = Math.max(0.75, rise * 0.07);
  const box = tabTextBox(tab, pxPerInch);
  const family = config.taglineFontFamily ?? config.fontFamily;
  // Rough em-width for the fitter. The canvas side measures with real metrics; a
  // banner tagline is short and this is bounded by the height anyway, so the two
  // agree to within a hair.
  const fontPx = Math.min(box.height, widthLimitedFont(line.length * 0.5, line.length, 0, box.width));

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: centerX - base / 2,
        top: barTopY - rise,
        width: base,
        height: rise,
        // Rim FIRST, as a slightly larger clipped layer behind the fill, so the
        // metal shows only along the two slopes and the top. Stroking a clip-path
        // is not possible in CSS, and a border would follow the box, not the shape.
        background: rimRamp(rimColor).mid,
        clipPath: tabClipPath(tab, pxPerInch),
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: config.backgroundColor,
          // The same polygon brought inward, then pushed DOWN by the same amount,
          // so the metal band lands on the slopes and the top edge and NOT on the
          // base. The base is where the tab meets the bar: they are one piece of
          // material there, and a line across it draws a seam through solid metal.
          clipPath: tabClipPath(
            {
              ...tab,
              riseInches: tab.riseInches - rimPx / pxPerInch,
              baseInches: tab.baseInches - (rimPx * 2) / pxPerInch,
              topInches: tab.topInches - (rimPx * 2) / pxPerInch,
            },
            pxPerInch,
          ),
          transform: `translate(${rimPx}px, ${rimPx}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {line && (
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
              ...textChenilleCss(fontPx, config.textColor, rimColor),
            }}
          >
            {line}
          </span>
        )}
      </div>
    </div>
  );
}
