"use client";

import { useEffect, useState } from "react";
import type { BottomBarConfig } from "@/lib/types";

// A section's TEXT rendered as a MULTI-LINE block that honors `\n` line breaks and
// works on a wide top/bottom bar AND a tall/narrow side panel (wing).
//
// The font AUTO-FITS so the block is ALWAYS fully contained: the widest line fits
// the box width and every line fits the box height — no matter how long the phrase
// or how narrow the single-tile wing. Lines break ONLY at `\n` (no soft-wrapping),
// so the measured fit is exact and nothing clips. `config.fontSize` is a FILL
// fraction (1.0 fills the box, lower shrinks) — the SAME slider semantics as the
// bottom banner, so both editors behave identically.

const LINE_HEIGHT = 1.06; // line box per text line (em)
const PAD_RATIO = 0.06; // padding as a fraction of the box's SHORT edge (both axes)

/** Module-scoped measuring canvas so every render doesn't allocate one. */
let _ctx: CanvasRenderingContext2D | null = null;
function measureCtx(): CanvasRenderingContext2D | null {
  if (_ctx) return _ctx;
  if (typeof document === "undefined") return null;
  _ctx = document.createElement("canvas").getContext("2d");
  return _ctx;
}

/**
 * The largest font (px) at which EVERY `\n` line fits `contentW` and ALL lines fit
 * `contentH`, then scaled by the `fill` slider. Width is measured with the real font
 * so narrow faces (Anton) size up and wide faces (Ultra) size down correctly; height
 * is bounded by the line count. letterSpacing is absolute (it does not scale with the
 * font), so it's reserved from the width budget before the glyph run is fitted.
 */
function fitBlockFont(
  text: string,
  fontFamily: string,
  letterSpacing: number,
  contentW: number,
  contentH: number,
  fill: number,
): number {
  const lines = (text.length ? text : " ").split("\n");

  // Height ceiling: N line-boxes must fit within the content height.
  let fontPx = contentH / (LINE_HEIGHT * lines.length);

  // Width clamp: shrink so the WIDEST line fits, measured against a probe font size.
  const ctx = measureCtx();
  const probe = 100;
  let widthLimited = Number.POSITIVE_INFINITY;
  if (ctx) {
    ctx.font = `700 ${probe}px ${fontFamily}`;
    for (const ln of lines) {
      const glyphs = ctx.measureText(ln).width; // glyph run at the probe size
      const avail = Math.max(1, contentW - letterSpacing * Math.max(0, ln.length - 1));
      if (glyphs > 0) widthLimited = Math.min(widthLimited, (avail / glyphs) * probe);
    }
  } else {
    // SSR / no-canvas fallback: rough char-width estimate (0.62em per glyph).
    const longest = Math.max(1, ...lines.map((l) => l.length));
    widthLimited = contentW / (longest * 0.62);
  }
  fontPx = Math.min(fontPx, widthLimited);

  return Math.max(6, fontPx * fill); // 6px readability floor
}

export function SectionTextElement({
  width,
  height,
  config,
}: {
  width: number;
  height: number;
  config: BottomBarConfig;
}) {
  const text = config.text ?? "";
  const fontFamily = config.fontFamily;
  const letterSpacing = config.letterSpacing ?? 0;
  const fill = config.fontSize ?? 1;

  // Symmetric px padding on both axes (keyed off the short edge so a narrow wing
  // doesn't lose most of its height to padding). Content box the text must fit in.
  const pad = Math.min(width, height) * PAD_RATIO;
  const contentW = Math.max(1, width - pad * 2);
  const contentH = Math.max(1, height - pad * 2);

  // Bumped once web fonts finish loading so we re-measure with real glyph metrics
  // (Anton/Bebas report different widths before vs. after load). The measure itself
  // runs during render — canvas measureText is synchronous and needs no live DOM —
  // so this state change just forces a recompute, avoiding setState-in-effect churn.
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    let active = true;
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => active && setFontTick((t) => t + 1));
    return () => {
      active = false;
    };
  }, []);

  void fontTick; // referenced so a font-load bump re-renders → font is re-measured
  const fontPx = fitBlockFont(text, fontFamily, letterSpacing, contentW, contentH, fill);

  const align =
    config.textAlign === "left" ? "flex-start" : config.textAlign === "right" ? "flex-end" : "center";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: config.backgroundColor,
        color: config.textColor,
        fontFamily,
        fontSize: fontPx,
        fontWeight: 700,
        lineHeight: LINE_HEIGHT,
        letterSpacing,
        whiteSpace: "pre", // honor \n only — never soft-wrap (keeps the fit exact)
        textAlign: config.textAlign,
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        justifyContent: "center",
        overflow: "hidden",
        padding: pad,
      }}
    >
      {text}
    </div>
  );
}
