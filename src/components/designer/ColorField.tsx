"use client";

import { useState } from "react";

// ─── One colour control, used everywhere a colour is chosen ─────────────────
//
// Two problems it exists to fix, both reported:
//
//  1. "The colour picker is gone." It never was — the swatch IS a native
//     `<input type="color">` with the input laid over it at zero opacity. That is
//     a fine mechanism and a terrible affordance: a flat square reads as a
//     read-only preview, so nobody clicked it. It now carries a visible marker
//     that says "this opens something".
//
//  2. No way to specify an EXACT colour. Presets cover the common cases and the
//     eyedropper covers "something like this", but a school's brand colour is a
//     specific hex from a brand sheet, and this product PRINTS. Typing #1B3F6E is
//     the only way to be sure the part matches the guide.
//
// The hex field is deliberately forgiving while typing and strict on commit: it
// holds whatever is being typed as local text, and only pushes upstream when the
// value actually parses. Otherwise every intermediate keystroke ("#1", "#1B")
// would be a colour change, and the frame would strobe as you type.

/** #RGB or #RRGGBB, with or without the hash. */
function parseHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$/.test(v) && !/^[0-9a-fA-F]{6}$/.test(v)) return null;
  const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return `#${full.toUpperCase()}`;
}

/**
 * The swatch, which IS the native picker, plus a marker so it looks clickable.
 * `size` is the square's px edge — the panel rows and the floating tile control
 * use different scales.
 */
export function ColorSwatch({
  value,
  onChange,
  label,
  size = 28,
  background,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  size?: number;
  /** Paint something other than `value` — used to show the default a null
   *  override falls back to (the brass ramp, the designed navy). */
  background?: string;
}) {
  return (
    <label
      // 44px on a phone whatever `size` asks for: min-* outranks the inline size.
      // The keyline is an INSET SHADOW, not a border: a 1px border sat outside the
      // input's `inset-0` box, so the actual tap target measured 42 x 42.
      className="relative shrink-0 cursor-pointer overflow-hidden rounded-[var(--ff-radius-sm,6px)] max-lg:min-h-11 max-lg:min-w-11"
      style={{
        width: size,
        height: size,
        background: background ?? value,
        boxShadow: "inset 0 0 0 1px var(--ff-line-strong, #d3d1cb)",
      }}
      title={`${label} — click for the full color picker`}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      {/* The affordance: a small corner fold. Drawn in both black and white so it
          survives on a swatch of any lightness without measuring luminance. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0"
        style={{
          width: 0,
          height: 0,
          borderLeft: `${Math.round(size * 0.34)}px solid transparent`,
          borderBottom: `${Math.round(size * 0.34)}px solid rgba(255,255,255,0.9)`,
          filter: "drop-shadow(-1px -1px 0 rgba(0,0,0,0.45))",
        }}
      />
    </label>
  );
}

/**
 * A text field for an exact value. Accepts #RGB, #RRGGBB, or the same without the
 * hash; reverts to the live value on blur if what was typed never parsed, so the
 * field can never be left showing a colour the design does not have.
 */
export function HexInput({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  className?: string;
}) {
  // The field shows the DESIGN's value (so a preset, the eyedropper or undo is
  // reflected at once) except while it is being edited, when it shows what is
  // being typed. Derived, not synced by an effect: a half-typed "#1B3" is never
  // overwritten mid-keystroke, and blurring falls back to the design's value.
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);

  return (
    <input
      type="text"
      inputMode="text"
      spellCheck={false}
      value={focused ? text : value}
      aria-label={`${label} hex value`}
      placeholder="#1B3F6E"
      onFocus={() => {
        setText(value);
        setFocused(true);
      }}
      onChange={(e) => {
        setText(e.target.value);
        const hex = parseHex(e.target.value);
        if (hex) onChange(hex);
      }}
      onBlur={() => setFocused(false)}
      className={
        "h-7 w-[92px] rounded-[var(--ff-radius-sm,6px)] border border-[var(--ff-line-strong,#d3d1cb)] max-lg:h-11 max-lg:w-[104px] max-lg:text-[16px] " +
        "bg-white px-2 font-mono text-[12px] uppercase tracking-tight text-[var(--ff-ink,#16181c)] " +
        "placeholder:text-[var(--ff-ink-3,#5f656e)] " +
        className
      }
    />
  );
}
