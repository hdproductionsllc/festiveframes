"use client";

// ─── SCHOOL / FUNDRAISING FRAME — direct-print prototype ─────────────────────
//
// A DIFFERENT product from the live tile builder: bigger, ALL direct-to-print
// (every zone is a printed PNG snappet — no snap-in tiles). Geometry, per Henry:
//   • 11 units wide × 8 units tall rectangle.
//   • Left + right SIDE PANELS: 3 wide × 8 tall each (full height), large snappets.
//   • TOP BAR: 11 wide × 1 tall (thin), spans the full width.
//   • BOTTOM BANNER: 11 wide × 2 tall, spans the full width.
//   • PHOTO / plate: the 5 × 5 middle (between the side panels, under the top bar,
//     above the bottom banner).
// The top bar and bottom banner overlay the side panels at the corners (they're
// separate physical print pieces). Jig placement is TBD — the pieces just export
// as PNGs for now.
//
// THIS FILE is the geometry foundation only: it lays out and labels the zones so we
// can iterate on proportions before wiring up art, the design store, and PNG export.

const UNITS_W = 11;
const UNITS_H = 8;

/** A print zone on the 11×8 grid (1-based grid lines). */
interface Zone {
  key: string;
  label: string;
  sub: string;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
  className: string;
  z: number;
}

const ZONES: Zone[] = [
  {
    key: "left",
    label: "Left panel",
    sub: "3 × 8 snappet",
    colStart: 1,
    colSpan: 3,
    rowStart: 1,
    rowSpan: 8,
    className: "bg-[#1f3a5f] text-[#dbe7f5] border-[#0e1c2e]",
    z: 0,
  },
  {
    key: "right",
    label: "Right panel",
    sub: "3 × 8 snappet",
    colStart: 9,
    colSpan: 3,
    rowStart: 1,
    rowSpan: 8,
    className: "bg-[#1f3a5f] text-[#dbe7f5] border-[#0e1c2e]",
    z: 0,
  },
  {
    key: "photo",
    label: "Photo",
    sub: "5 × 5 plate",
    colStart: 4,
    colSpan: 5,
    rowStart: 2,
    rowSpan: 5,
    className: "bg-[#e9edf2] text-[#1e1b17] border-[#b9c2cd]",
    z: 0,
  },
  {
    key: "top",
    label: "Top bar",
    sub: "11 × 1",
    colStart: 1,
    colSpan: 11,
    rowStart: 1,
    rowSpan: 1,
    className: "bg-[#a3132b] text-white border-[#5f0a18]",
    z: 10,
  },
  {
    key: "bottom",
    label: "Bottom banner",
    sub: "11 × 2 — mascot · slogan · logo",
    colStart: 1,
    colSpan: 11,
    rowStart: 7,
    rowSpan: 2,
    className: "bg-[#a3132b] text-white border-[#5f0a18]",
    z: 10,
  },
];

export function SchoolFrameLab() {
  return (
    <main className="min-h-screen bg-[#12100e] px-4 py-8 text-[#faf0d6]">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#f8c53b]">
            Internal prototype · direct-print
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">School / Fundraising Frame</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#faf0d6]/70">
            An 11 × 8 all-direct-print layout: tall 3 × 8 side panels, a thin 11-wide
            top bar, an 11 × 2 bottom banner (school mascot / slogan / logo), and a
            5 × 5 photo in the middle. This is the geometry foundation — art, the
            design store, and per-piece PNG export come next.
          </p>
        </header>

        {/* The 11×8 frame. Aspect ratio locks the proportions; zones are placed on a
            grid of 11 columns × 8 rows. The top bar + bottom banner sit above the
            side panels (z-10) so the corners read as bar-over-panel. */}
        <div
          className="grid w-full overflow-hidden rounded-lg border-2 border-[#0e1c2e] bg-[#0b1626] shadow-[8px_8px_0_rgba(30,27,23,0.5)]"
          style={{
            aspectRatio: `${UNITS_W} / ${UNITS_H}`,
            gridTemplateColumns: `repeat(${UNITS_W}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${UNITS_H}, minmax(0, 1fr))`,
          }}
        >
          {ZONES.map((zone) => (
            <div
              key={zone.key}
              className={`flex flex-col items-center justify-center border-2 text-center ${zone.className}`}
              style={{
                gridColumn: `${zone.colStart} / span ${zone.colSpan}`,
                gridRow: `${zone.rowStart} / span ${zone.rowSpan}`,
                zIndex: zone.z,
              }}
            >
              <span className="text-xs font-extrabold uppercase tracking-wide sm:text-sm">
                {zone.label}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold opacity-70 sm:text-[11px]">
                {zone.sub}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-[#faf0d6]/45">
          Grid: {UNITS_W} × {UNITS_H} units · sides 3 × 8 · top 11 × 1 · bottom 11 × 2
          · photo 5 × 5. Bar-over-panel corners are separate print pieces.
        </p>
      </div>
    </main>
  );
}
