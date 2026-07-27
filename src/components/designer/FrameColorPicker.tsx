"use client";

import { DEFAULT_FRAME_COLOR, useDesignStore } from "@/stores/design-store";
import { TILE_BG, luminance } from "@/lib/utils/tile-theme";

// ─── The frame BODY colour, as a global override ─────────────────────────────
//
// The body is the largest single area of the product — the material every badge
// sits on — and it was a hard-coded `#111111` in the on-screen renderer and a
// hard-coded black in the print one. That meant the school-branding scan could
// recolour the two banners and nothing else, which is not what "make it their
// school's frame" means to anyone looking at it.
//
// This is the manual override that sits beside the automatic one. The scan proposes
// a colour; this is where a human disagrees, and it is deliberately a plain
// `<input type="color">` plus a few presets rather than a bespoke picker: the native
// control is the one every parent already knows, works on a phone, and is accessible
// for free.

/** Presets: the product's own field palette, plus the shipping default. Offered
 *  because a free-form picker with no anchors invites a colour that fights every
 *  badge on the frame — these four are the ones the tiles were designed against. */
const PRESETS: ReadonlyArray<[string, string]> = [
  [DEFAULT_FRAME_COLOR, "Matte black"],
  [TILE_BG.navy, "Navy"],
  [TILE_BG.blue, "Blue"],
  [TILE_BG.crimson, "Crimson"],
];

export function FrameColorPicker() {
  const frameColor = useDesignStore((s) => s.frameColor);
  const setFrameColor = useDesignStore((s) => s.setFrameColor);
  const tileFieldColor = useDesignStore((s) => s.tileFieldColor);
  const setTileFieldColor = useDesignStore((s) => s.setTileFieldColor);
  const rimColor = useDesignStore((s) => s.rimColor);
  const setRimColor = useDesignStore((s) => s.setRimColor);
  const current = frameColor || DEFAULT_FRAME_COLOR;

  return (
    <div className="ff-panel p-4">
      <h3 className="ff-h2 mb-1">Frame colour</h3>
      <p className="ff-help mb-3">
        The body every badge sits on. Set it to your school&apos;s colour, or pick your
        own.
      </p>

      <div className="flex items-center gap-2">
        {/* The swatch IS the input. A separate preview would be one more thing that
            can disagree with the truth. */}
        <label
          className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-[var(--ff-radius-sm,6px)] border"
          style={{ background: current, borderColor: "var(--ff-line, #1e1b17)" }}
          title="Choose a frame colour"
        >
          <input
            type="color"
            value={current}
            onChange={(e) => setFrameColor(e.target.value)}
            aria-label="Frame colour"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {PRESETS.map(([hex, label]) => {
            const active = current.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => setFrameColor(hex)}
                aria-label={label}
                aria-pressed={active}
                title={label}
                className="h-7 w-7 rounded-[var(--ff-radius-sm,6px)] border transition-transform active:translate-y-0.5"
                style={{
                  background: hex,
                  // The ACTIVE ring has to be legible on both a near-black and a
                  // near-white swatch, so it flips with the swatch's own luminance
                  // rather than being one fixed colour that vanishes on half of them.
                  borderColor: active
                    ? luminance(hex) > 0.5
                      ? "#1e1b17"
                      : "#ffffff"
                    : "var(--ff-line, rgba(30,27,23,0.25))",
                  borderWidth: active ? 2 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* THE OTHER TWO SURFACES. Kept in one panel rather than three scattered
          controls, because they are one decision: a frame whose body, badges and rim
          disagree does not read as a scheme, it reads as a mistake. */}
      <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "var(--ff-line, rgba(30,27,23,0.15))" }}>
        <SwatchRow
          label="Badges"
          hint="Behind every tile"
          value={tileFieldColor}
          onChange={setTileFieldColor}
          resetLabel="Each tile's own"
        />
        <SwatchRow
          label="Rim"
          hint="Replaces the gold edge"
          value={rimColor}
          onChange={setRimColor}
          resetLabel="Gold"
        />
      </div>
    </div>
  );
}

/**
 * One overridable colour with a reset. `null` is a real state here, not an empty
 * string: it means "keep the designed default" (each tile's own field, or the brass),
 * which is different from having chosen a colour that happens to match.
 */
function SwatchRow({
  label,
  hint,
  value,
  onChange,
  resetLabel,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (hex: string | null) => void;
  resetLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-[var(--ff-radius-sm,6px)] border"
        style={{
          background: value ?? "transparent",
          backgroundImage: value
            ? undefined
            : "linear-gradient(45deg,rgba(0,0,0,.12) 25%,transparent 25%,transparent 75%,rgba(0,0,0,.12) 75%)",
          backgroundSize: value ? undefined : "8px 8px",
          borderColor: "var(--ff-line, #1e1b17)",
        }}
        title={`Choose a ${label.toLowerCase()} colour`}
      >
        <input
          type="color"
          value={value ?? "#1B2A4A"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour`}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight text-[var(--ff-ink,#1e1b17)]">{label}</p>
        <p className="ff-help leading-tight">{hint}</p>
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ff-btn ff-btn-secondary shrink-0 px-2 py-1 text-[11px]"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}
