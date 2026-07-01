"use client";

import { useState } from "react";

// ─── SCHOOL / FUNDRAISING FRAME — direct-print prototype ─────────────────────
//
// A DIFFERENT product from the live tile builder: bigger, ALL direct-to-print
// (every zone is a printed PNG snappet — no snap-in tiles). Geometry, per Henry:
//   • 11 units wide × 8 units tall rectangle.
//   • Left + right SIDE PANELS: 3 wide × 8 tall each (full height), large snappets.
//   • TOP BAR: 11 wide × 1 tall (thin), spans the full width — the school name.
//   • BOTTOM BANNER: 11 wide × 2 tall — mascot / slogan / logo.
//   • PHOTO / plate: the 5 × 5 middle.
// The top bar + bottom banner overlay the side panels at the corners (separate
// physical print pieces). Jig placement is TBD.
//
// THIS ITERATION: editable school name + slogan and school colors, so we can review
// the customization feel. NEXT: standardized mascot/logo art into the panels/banner,
// wire to a design store, and per-piece PNG export for the eufy.

const UNITS_W = 11;
const UNITS_H = 8;

interface School {
  name: string;
  slogan: string;
  /** School colors — primary drives the bars, secondary the side panels. */
  primary: string;
  secondary: string;
  ink: string;
}

const DEFAULT_SCHOOL: School = {
  name: "MARQUETTE MUSTANGS",
  slogan: "GO MUSTANGS · CLASS OF 2026",
  primary: "#a3132b",
  secondary: "#1f3a5f",
  ink: "#ffffff",
};

export function SchoolFrameLab() {
  const [s, setS] = useState<School>(DEFAULT_SCHOOL);
  const set = (patch: Partial<School>) => setS((prev) => ({ ...prev, ...patch }));

  return (
    <main className="min-h-screen bg-[#12100e] px-4 py-8 text-[#faf0d6]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f8c53b]">
            Internal prototype · direct-print
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">School / Fundraising Frame</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#faf0d6]/70">
            An 11 × 8 all-direct-print layout: tall 3 × 8 side panels, an 11-wide top
            bar (school name), an 11 × 2 bottom banner (mascot / slogan / logo), and a
            5 × 5 photo. Editable text + school colors below. Next: mascot/logo art,
            store wiring, and per-piece PNG export.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          {/* ── The 11×8 frame ──────────────────────────────────────────── */}
          <div
            className="grid w-full overflow-hidden rounded-lg border-2 border-[#0e1c2e] shadow-[8px_8px_0_rgba(30,27,23,0.5)]"
            style={{
              aspectRatio: `${UNITS_W} / ${UNITS_H}`,
              gridTemplateColumns: `repeat(${UNITS_W}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${UNITS_H}, minmax(0, 1fr))`,
              background: s.secondary,
            }}
          >
            {/* Left panel (3×8) */}
            <Zone col="1 / span 3" row="1 / span 8" bg={s.secondary} z={0} />
            {/* Right panel (3×8) */}
            <Zone col="9 / span 3" row="1 / span 8" bg={s.secondary} z={0} />
            {/* Photo (5×5) */}
            <Zone col="4 / span 5" row="2 / span 5" bg="#e9edf2" z={0}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1e1b17]/45 sm:text-xs">
                Photo · 5 × 5
              </span>
            </Zone>
            {/* Top bar (11×1) — school name */}
            <Zone col="1 / span 11" row="1 / span 1" bg={s.primary} z={10}>
              <span
                className="truncate px-2 text-sm font-extrabold uppercase tracking-wide sm:text-lg"
                style={{ color: s.ink }}
              >
                {s.name || "School name"}
              </span>
            </Zone>
            {/* Bottom banner (11×2) — mascot / slogan / logo */}
            <Zone col="1 / span 11" row="7 / span 2" bg={s.primary} z={10}>
              <span
                className="px-3 text-center text-sm font-extrabold uppercase tracking-wide sm:text-2xl"
                style={{ color: s.ink }}
              >
                {s.slogan || "Mascot · slogan · logo"}
              </span>
            </Zone>
          </div>

          {/* ── Controls ────────────────────────────────────────────────── */}
          <aside className="space-y-4 rounded-xl border border-[#faf0d6]/15 bg-[#1b1815] p-4">
            <Field label="School name (top bar)">
              <input
                value={s.name}
                onChange={(e) => set({ name: e.target.value })}
                className="w-full rounded-lg border border-[#faf0d6]/20 bg-[#12100e] px-3 py-2 text-sm font-semibold text-[#faf0d6] focus:border-[#f8c53b] focus:outline-none"
              />
            </Field>
            <Field label="Bottom banner (mascot · slogan)">
              <input
                value={s.slogan}
                onChange={(e) => set({ slogan: e.target.value })}
                className="w-full rounded-lg border border-[#faf0d6]/20 bg-[#12100e] px-3 py-2 text-sm font-semibold text-[#faf0d6] focus:border-[#f8c53b] focus:outline-none"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Swatch label="Primary" value={s.primary} onChange={(primary) => set({ primary })} />
              <Swatch label="Panels" value={s.secondary} onChange={(secondary) => set({ secondary })} />
              <Swatch label="Text" value={s.ink} onChange={(ink) => set({ ink })} />
            </div>
            <p className="text-[11px] leading-relaxed text-[#faf0d6]/45">
              Grid: 11 × 8 · sides 3 × 8 · top 11 × 1 · bottom 11 × 2 · photo 5 × 5.
              Bars overlay the panel corners (separate print pieces).
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* A placed print zone on the 11×8 grid. */
function Zone({
  col,
  row,
  bg,
  z,
  children,
}: {
  col: string;
  row: string;
  bg: string;
  z: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-center border-2 border-black/25 text-center"
      style={{ gridColumn: col, gridRow: row, zIndex: z, background: bg }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#faf0d6]/60">
        {label}
      </span>
      {children}
    </label>
  );
}

function Swatch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#faf0d6]/60">
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer rounded-lg border border-[#faf0d6]/20 bg-[#12100e]"
      />
    </label>
  );
}
