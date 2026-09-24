"use client";

import { DEFAULT_FRAME_COLOR, useDesignStore } from "@/stores/design-store";
import { TILE_BG, brassGradientCss, luminance } from "@/lib/utils/tile-theme";
import { ColorSwatch, HexInput } from "./ColorField";

// ─── The frame's colours: ONE background, and the rim ────────────────────────
//
// This panel used to offer three colours — "Frame color" (the body), "Background"
// (behind the badges and banners) and "Rim". On the flush frame the badges and the
// banners cover the body completely, so the biggest, first control on the panel
// changed nothing you could see: a parent tapped swatches and the frame sat still.
//
// The owner's rule is that the badge background IS the banner colour, so there is
// one background decision, not two. "Frame color" now sets it — body, every badge
// field and both banners, on screen and in print (`setFrameColor`) — and the rim is
// the only other colour. The native `<input type="color">` stays the custom picker:
// it is the control every parent already knows, works on a phone, and is accessible
// for free.

/** The stock anchors offered beside the school's own colour. A free-form picker with
 *  no anchors invites a colour that fights every badge; these are the fields the
 *  tiles were designed against. */
const STOCK: ReadonlyArray<[string, string]> = [
  [DEFAULT_FRAME_COLOR, "Matte black"],
  [TILE_BG.navy, "Navy"],
  [TILE_BG.blue, "Blue"],
  [TILE_BG.crimson, "Crimson"],
];

const same = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").toLowerCase() === (b ?? "").toLowerCase();

export function FrameColorPicker() {
  const frameColor = useDesignStore((s) => s.frameColor);
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);
  const rimColor = useDesignStore((s) => s.rimColor);
  const brandDefaults = useDesignStore((s) => s.brandDefaults);
  const topBg = useDesignStore((s) => s.sections.top?.text?.backgroundColor);
  const bottomBg = useDesignStore((s) => s.sections.bottom?.text?.backgroundColor);
  const setFrameColor = useDesignStore((s) => s.setFrameColor);
  const setRimColor = useDesignStore((s) => s.setRimColor);
  const resetColors = useDesignStore((s) => s.resetColors);

  // What the parent SEES: the badge field when there is one (it is also the banner
  // colour), else the body. Never the body over the field — that was the bug.
  const current = tileFieldColor || frameColor || DEFAULT_FRAME_COLOR;

  // The school's own colours, offered first. Without a kit there is no "school"
  // swatch, and Reset returns the stock defaults.
  const schoolSurface = brandDefaults.tileFieldColor ?? null;
  const surfaces: Array<[string, string]> = [
    ...(schoolSurface ? [[schoolSurface, "School color"] as [string, string]] : []),
    ...STOCK.filter(([hex]) => !same(hex, schoolSurface)),
  ];

  const surfaceAtDefault = same(current, brandDefaults.tileFieldColor ?? brandDefaults.frameColor);
  const bannersAtDefault = [topBg, bottomBg].every((bg) => bg === undefined || same(bg, current));
  const atDefaults = surfaceAtDefault && bannersAtDefault && same(rimColor, brandDefaults.rimColor);

  return (
    <div className="ff-panel p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="ff-h2">Frame color</h3>
        <button
          type="button"
          onClick={resetColors}
          disabled={atDefaults}
          className="ff-btn ff-btn-secondary shrink-0 px-2 py-1 text-[11px] max-lg:min-h-11 disabled:opacity-40"
        >
          {schoolSurface ? "Reset to school colors" : "Reset colors"}
        </button>
      </div>
      <p className="ff-help mb-3">Behind every badge and both banners.</p>

      <div className="flex items-center gap-2">
        {/* The swatch IS the input. A separate preview would be one more thing that
            can disagree with the truth. */}
        <ColorSwatch value={current} onChange={setFrameColor} label="Frame color" size={36} />
        <HexInput value={current} onChange={setFrameColor} label="Frame color" />
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {surfaces.map(([hex, label]) => (
            <PresetChip
              key={hex}
              label={label}
              paint={hex}
              ring={hex}
              active={same(current, hex)}
              onClick={() => setFrameColor(hex)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ff-line, rgba(30,27,23,0.15))" }}>
        <div className="flex items-center gap-2">
          <ColorSwatch
            value={rimColor ?? "#C9A227"}
            onChange={setRimColor}
            label="Rim color"
            background={rimColor ? undefined : brassGradientCss()}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-tight text-[var(--ff-ink,#1e1b17)]">Rim</p>
            <p className="ff-help leading-tight">The edge around every badge and banner</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            {brandDefaults.rimColor && (
              <PresetChip
                label="School rim"
                paint={brandDefaults.rimColor}
                ring={brandDefaults.rimColor}
                active={same(rimColor, brandDefaults.rimColor)}
                onClick={() => setRimColor(brandDefaults.rimColor)}
              />
            )}
            <PresetChip
              label="Gold"
              paint={brassGradientCss()}
              ring="#C9A227"
              active={rimColor === null}
              onClick={() => setRimColor(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One tap-to-apply colour. `paint` is the CSS background (a gradient for gold);
 *  `ring` is the hex its active ring is legible against. */
function PresetChip({
  label,
  paint,
  ring,
  active,
  onClick,
}: {
  label: string;
  paint: string;
  ring: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className="h-11 w-11 rounded-[var(--ff-radius-sm,6px)] border transition-transform active:translate-y-0.5 lg:h-7 lg:w-7"
      style={{
        background: paint,
        // The ACTIVE ring has to be legible on both a near-black and a near-white
        // swatch, so it flips with the swatch's own luminance.
        borderColor: active
          ? luminance(ring) > 0.5
            ? "#1e1b17"
            : "#ffffff"
          : "var(--ff-line, rgba(30,27,23,0.25))",
        borderWidth: active ? 2 : 1,
        boxShadow: active ? "0 0 0 2px var(--ff-accent, #1e1b17)" : undefined,
      }}
    />
  );
}
