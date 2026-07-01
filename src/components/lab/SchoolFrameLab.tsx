"use client";

import { useEffect, useRef, useState } from "react";
import { LicensePlateArea } from "@/components/frame/LicensePlateArea";

// ─── SCHOOL / FUNDRAISING FRAME — a FORK of the real license-plate builder ───
//
// Same product as the live builder: a frame AROUND a real 12"x6" license plate.
// The only change is the frame geometry — instead of the 1-tile-wide tile ring,
// the school frame has big DIRECT-PRINT pieces:
//   • Left + right SIDE PANELS — 3 tile-units wide, full height (school color).
//   • TOP BAR — 1 unit tall, full width (school name).
//   • BOTTOM BANNER — 2 units tall, full width (mascot / slogan / logo).
//   • The real LICENSE PLATE (reused <LicensePlateArea/>) sits in the middle,
//     filling exactly the gap between the bars, flanked by the panels.
//
// All dimensions are in inches (tile unit = 0.991", plate = 12"x6"), scaled off a
// measured container width — the same approach as the live FrameCanvas. NEXT:
// standardized mascot/logo art in the panels/banner, store wiring, PNG export.

const UNIT = 0.991; // one tile unit, inches (matches DEFAULT_FRAME_CONFIG)
const PLATE_W = 12;
const PLATE_H = 6;
const PANEL_W = 3 * UNIT; // 2.973" side panels
const TOP_H = 1 * UNIT; //   0.991" top bar
const BOT_H = 2 * UNIT; //   1.982" bottom banner
const TOTAL_W = PLATE_W + 2 * PANEL_W; // 17.946"
const TOTAL_H = TOP_H + PLATE_H + BOT_H; // 8.973"

const STATES = ["MO", "IL", "KS", "IA", "AR", "TX", "CA", "FL", "NY", "CO", "TN", "OH", "GA", "MI"];

interface School {
  name: string;
  slogan: string;
  primary: string; // bars
  secondary: string; // side panels
  ink: string; // bar text
  plateState: string;
}

const DEFAULT_SCHOOL: School = {
  name: "MARQUETTE MUSTANGS",
  slogan: "GO MUSTANGS · CLASS OF 2026",
  primary: "#0e2f6e",
  secondary: "#8a1a2b",
  ink: "#ffffff",
  plateState: "MO",
};

export function SchoolFrameLab() {
  const [s, setS] = useState<School>(DEFAULT_SCHOOL);
  const set = (patch: Partial<School>) => setS((prev) => ({ ...prev, ...patch }));

  // Measure the frame's container width so every inch dimension can scale to px
  // (mirrors useFrameLayout's ResizeObserver).
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = w > 0 ? w / TOTAL_W : 0;
  const px = (inches: number) => inches * scale;

  return (
    <main className="min-h-screen bg-[#12100e] px-4 py-8 text-[#faf0d6]">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f8c53b]">
            Internal prototype · direct-print · fork of the live builder
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">School / Fundraising Frame</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#faf0d6]/70">
            A real license-plate frame with big direct-print pieces: 3-unit side
            panels, a top bar (school name) and a 2-unit bottom banner (mascot /
            slogan), around the actual {PLATE_W}&Prime;&times;{PLATE_H}&Prime; plate.
            {" "}Next: standardized mascot/logo art, store wiring, per-piece PNG export.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          {/* ── The school frame (17.946" × 8.973", ≈2:1) ─────────────────── */}
          <div
            ref={ref}
            className="relative w-full overflow-hidden rounded-md border-2 border-[#0e1c2e] shadow-[8px_8px_0_rgba(30,27,23,0.5)]"
            style={{ aspectRatio: `${TOTAL_W} / ${TOTAL_H}`, background: "#111111" }}
          >
            {w > 0 && (
              <>
                {/* Side panels — 3 units wide, full height (school color). */}
                <div style={panel(0, 0, PANEL_W, TOTAL_H, s.secondary, scale)} />
                <div style={panel(PANEL_W + PLATE_W, 0, PANEL_W, TOTAL_H, s.secondary, scale)} />

                {/* The REAL license plate — reused from the live builder. Sits in
                    the gap between the bars, flanked by the panels. */}
                <LicensePlateArea
                  x={px(PANEL_W)}
                  y={px(TOP_H)}
                  width={px(PLATE_W)}
                  height={px(PLATE_H)}
                  plateState={s.plateState}
                />

                {/* Top bar — 1 unit tall, full width (school name). */}
                <div style={bar(0, 0, TOTAL_W, TOP_H, s.primary, scale)}>
                  <span
                    className="truncate px-2 font-extrabold uppercase tracking-wide"
                    style={{ color: s.ink, fontSize: px(TOP_H) * 0.5 }}
                  >
                    {s.name || "School name"}
                  </span>
                </div>

                {/* Bottom banner — 2 units tall, full width (mascot / slogan). */}
                <div style={bar(0, TOP_H + PLATE_H, TOTAL_W, BOT_H, s.primary, scale)}>
                  <span
                    className="px-3 text-center font-extrabold uppercase tracking-wide"
                    style={{ color: s.ink, fontSize: px(BOT_H) * 0.42 }}
                  >
                    {s.slogan || "Mascot · slogan · logo"}
                  </span>
                </div>
              </>
            )}
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
            <Field label="License plate state">
              <select
                value={s.plateState}
                onChange={(e) => set({ plateState: e.target.value })}
                className="w-full rounded-lg border border-[#faf0d6]/20 bg-[#12100e] px-3 py-2 text-sm font-semibold text-[#faf0d6] focus:border-[#f8c53b] focus:outline-none"
              >
                {STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Swatch label="Bars" value={s.primary} onChange={(primary) => set({ primary })} />
              <Swatch label="Panels" value={s.secondary} onChange={(secondary) => set({ secondary })} />
              <Swatch label="Text" value={s.ink} onChange={(ink) => set({ ink })} />
            </div>
            <p className="text-[11px] leading-relaxed text-[#faf0d6]/45">
              {TOTAL_W.toFixed(2)}&Prime; &times; {TOTAL_H.toFixed(2)}&Prime; · plate
              12&times;6 · side panels 3 units · top 1 · bottom 2. Bars overlay the
              panel corners (separate print pieces).
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* A full-height solid side panel (behind the bars). */
function panel(
  xIn: number,
  yIn: number,
  wIn: number,
  hIn: number,
  bg: string,
  scale: number,
): React.CSSProperties {
  return {
    position: "absolute",
    left: xIn * scale,
    top: yIn * scale,
    width: wIn * scale,
    height: hIn * scale,
    background: bg,
    zIndex: 0,
  };
}

/* A full-width bar/banner, centered content, above the panels. */
function bar(
  xIn: number,
  yIn: number,
  wIn: number,
  hIn: number,
  bg: string,
  scale: number,
): React.CSSProperties {
  return {
    position: "absolute",
    left: xIn * scale,
    top: yIn * scale,
    width: wIn * scale,
    height: hIn * scale,
    background: bg,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderTop: "2px solid rgba(0,0,0,0.25)",
    borderBottom: "2px solid rgba(0,0,0,0.25)",
  };
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
