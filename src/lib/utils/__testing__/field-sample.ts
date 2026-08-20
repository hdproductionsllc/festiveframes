// ─── Sampling a FIELD colour out of a real render ────────────────────────────
//
// Test-only. Not matched by vitest's include glob (`src/**/*.{test,spec}.ts`), so
// this file is a helper and never a suite.
//
// WHY THIS EXISTS. Two suites asserted that a rendered element's face is a given
// colour by reading ONE pixel and comparing the RGB triplet for exact equality.
// Both broke, and neither break was the defect they were written to catch:
//
//  · `banner-tile-shade` sampled the banner's face at 10% of its height and
//    demanded it equal a tile's face exactly. But an empty banner does not render
//    empty — `drawSchoolFrame` falls back to "YOUR TEXT HERE" — so that sample sat
//    in the DROP SHADOW of placeholder glyphs and read 26,41,72 against the
//    declared 27,42,74. Which glyphs land where depends on font fallback, so the
//    contamination moves between platforms: green on the Linux box the baseline
//    was taken on, one unit out on Windows.
//
//  · `compose-school-frame`'s keystone-join test compared a vertical run to a
//    reference taken 60px deeper into the bar. The run itself is perfectly uniform
//    at the declared colour; the REFERENCE was the odd one, sitting far enough down
//    the bevel's faint ramp to round a unit low.
//
// So the lesson is the one CLAUDE.md already states about fringes: prefer measuring
// to squinting, and measure the thing you actually mean. A "field" is the colour
// the bulk of a shape is painted, which is a MODE over many samples — not whatever
// happens to be under one arbitrary coordinate. Text, shadows and chrome are then
// outliers that cannot move the answer, and the defect these tests guard (a bevel
// flooding the face, ~120 units of white) is still caught with room to spare.

/** An RGB triple as the suites report it: "r,g,b". */
export type Rgb = string;

/** Read one pixel as "r,g,b". `ctx` is any canvas 2D context with getImageData. */
export function pixel(
  ctx: { getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> } },
  x: number,
  y: number,
): Rgb {
  // Array.from, not spread: the context types `data` as ArrayLike<number>, which
  // has no iterator. Both Uint8ClampedArray and a plain array satisfy it.
  return Array.from(ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data)
    .slice(0, 3)
    .join(",");
}

/**
 * The FIELD colour of a rectangle: the most common pixel value over an inset grid
 * of samples.
 *
 * `inset` is a fraction of the shorter side, dropped from every edge so the rim and
 * bevel band — which are legitimately not the field — stay out of the count. The
 * default 0.25 keeps the middle half of the shape, which on every geometry this
 * codebase renders is bare face plus whatever text sits on it.
 */
export function fieldColour(
  ctx: { getImageData(x: number, y: number, w: number, h: number): { data: ArrayLike<number> } },
  rect: { x: number; y: number; width: number; height: number },
  opts: { steps?: number; inset?: number } = {},
): Rgb {
  const steps = opts.steps ?? 12;
  const inset = opts.inset ?? 0.25;
  const pad = Math.min(rect.width, rect.height) * inset;
  const x0 = rect.x + pad;
  const y0 = rect.y + pad;
  const w = Math.max(1, rect.width - pad * 2);
  const h = Math.max(1, rect.height - pad * 2);

  const tally = new Map<Rgb, number>();
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const x = x0 + (w * (i + 0.5)) / steps;
      const y = y0 + (h * (j + 0.5)) / steps;
      const v = pixel(ctx, x, y);
      tally.set(v, (tally.get(v) ?? 0) + 1);
    }
  }
  let best: Rgb = "";
  let bestN = -1;
  for (const [v, n] of tally) if (n > bestN) { best = v; bestN = n; }
  return best;
}

/** Largest per-channel difference between two "r,g,b" strings. */
export function channelDelta(a: Rgb, b: Rgb): number {
  const pa = a.split(",").map(Number);
  const pb = b.split(",").map(Number);
  return Math.max(...pa.map((v, i) => Math.abs(v - pb[i])));
}

/**
 * The tolerance every cross-render colour comparison in this codebase uses.
 *
 * ONE unit of 255. Big enough to absorb a rasterizer rounding a gradient stop
 * differently between platforms — the only difference actually observed — and far
 * too small to admit any defect worth a test: the bevel flood that
 * `banner-tile-shade` exists to catch moves a channel by more than a hundred.
 *
 * If a comparison needs more than this, the samples are landing on different
 * things and the fix is to sample better, not to widen the gate.
 */
export const SHADE_TOLERANCE = 1;
