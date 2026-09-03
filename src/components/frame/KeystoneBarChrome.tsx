"use client";

import type { BottomTab } from "@/lib/types";
import { keystoneBox, keystoneChrome, keystoneOutline, pathD, type Box } from "@/lib/utils/bottom-tab";
import { bevelGradient, cornerRadii, luminance, rimRamp, shift } from "@/lib/utils/tile-theme";
import { useDesignStore } from "@/stores/design-store";

// ─── The keystone-shaped bar's chrome, on screen ────────────────────────────
//
// The SVG twin of `drawKeystoneChrome` in compose-school-frame. Same outline
// (`keystoneOutline`), same band reaches (`keystoneChrome`), same trick: clip to
// the outline and stroke it from the inside, widest band first. CSS cannot stroke
// a clip-path and a border follows the box, not the shape, which is why the old
// version was a rounded bar with a trapezoid laid over it and a skirt to hide the
// join. This is one shape with one edge, the way the part is printed.
//
// Chrome only. The name and the tagline are HTML, rendered by SectionTextElement
// (bare) and BottomTabElement above this layer.

export function KeystoneBarChrome({
  tab,
  bar,
  pxPerInch,
  unit,
  background,
  selected = false,
}: {
  tab: BottomTab;
  /** The bar's box in frame px. The tab rises above its top edge. */
  bar: Box;
  pxPerInch: number;
  /** ONE grid cell in px: the chrome is measured against it, like every badge. */
  unit: number;
  background: string;
  /** The editor's selection ring, drawn along the PART's outline rather than as a
   *  box around the bar — a rectangle around half of one shape says two pieces. */
  selected?: boolean;
}) {
  const rimColor = useDesignStore((s) => s.rimColor);
  const box = keystoneBox(tab, bar, pxPerInch);
  if (box.w <= 0 || box.h <= 0) return null;
  // In the SVG's own coordinates: the box's top-left is (0, 0).
  const local = { x: 0, y: box.y >= bar.y ? 0 : bar.y - box.y, w: bar.w, h: bar.h };
  const outline = keystoneOutline(tab, local, pxPerInch, cornerRadii(unit));
  const d = pathD(outline);
  const c = keystoneChrome(unit, background);
  const ramp = rimRamp(rimColor);
  const surround = shift(background, luminance(background) > 0.5 ? -0.1 : -0.22);
  const id = `ks-${Math.round(box.w)}-${Math.round(box.h)}`;

  return (
    <svg
      aria-hidden
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${box.w} ${box.h}`}
      // BELOW the section overlay (z 2, or 3 when selected) that carries the name,
      // and above the plate and grooves, which stack in DOM order beneath it.
      style={{ position: "absolute", left: box.x, top: box.y, overflow: "visible", pointerEvents: "none", zIndex: 1 }}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={d} />
        </clipPath>
        <linearGradient id={`${id}-bevel`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={box.w} y2={box.h}>
          {bevelGradient(background, box.w, box.h).map(([at, colour]) => (
            <stop key={at} offset={at} stopColor={colour} />
          ))}
        </linearGradient>
        <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={box.w} y2={box.h}>
          <stop offset={0} stopColor={ramp.light} />
          <stop offset={0.5} stopColor={ramp.mid} />
          <stop offset={1} stopColor={ramp.dark} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <path d={d} fill={background} />
        <path d={d} fill="none" stroke={`url(#${id}-bevel)`} strokeWidth={c.bevelTo * 2} strokeLinejoin="round" />
        <path d={d} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={c.rimTo * 2} strokeLinejoin="round" />
        {c.surroundTo > 0 && (
          <path d={d} fill="none" stroke={surround} strokeWidth={c.surroundTo * 2} strokeLinejoin="round" />
        )}
        <path d={d} fill="none" stroke="rgba(0,0,0,0.30)" strokeWidth={2} strokeLinejoin="round" />
      </g>
      {selected && (
        <>
          {/* The same gold as every other selection ring, along the part's edge. */}
          <path d={d} fill="none" stroke="rgba(248,197,59,0.55)" strokeWidth={12} strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#f8c53b" strokeWidth={5} strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
