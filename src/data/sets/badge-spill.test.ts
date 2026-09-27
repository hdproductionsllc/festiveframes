import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

// ─── No magenta at the outline ────────────────────────────────────────────────
//
// Badge art is generated on a magenta backdrop, and polished gold REFLECTS it: the
// outermost pixel or two of every metal rim came out pink. Too opaque for the keyer
// to unmix, invisible at a glance, and a rosy hairline around the gold in print.
// It shipped on nine badges (2026-09-27) because the review measured the AVERAGE
// edge colour, which ramps to gold and hides a one-pixel line. scripts/process-badge.ts
// now despills and refuses what is left; this holds every file on disk, twins
// included, to the same rule, so a badge added any other way cannot bring it back.
//
// Spill = BRIGHT pink: red above 120 and red AND blue both 20+ above green. Gold
// (b < g), navy (r < g), red, green, skin and white never are. The brightness and
// margin matter: racquetball's violet-navy rim (r ~60) and the warm copper glints
// on the sax and the ballet shoes are dark or barely rose and are the drawing; the
// magenta hairline this guards against measured (246,146,186).

const DIR = join(process.cwd(), "public/tiles/high-school");
const EDGE = 8;

async function spillAtOutline(file: string): Promise<number> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const clear = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || data[(y * W + x) * 4 + 3] < 20;
  let n = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 40 || data[i] <= 120 || Math.min(data[i], data[i + 2]) <= data[i + 1] + 20) continue;
      // Only near the outline: interior pinks (a red heart's highlight) are art.
      let near = false;
      for (let d = 1; d <= EDGE && !near; d++)
        near = clear(x - d, y) || clear(x + d, y) || clear(x, y - d) || clear(x, y + d);
      if (near) n++;
    }
  return n;
}

describe("badge art carries no magenta spill at its outline", () => {
  const files = [
    ...readdirSync(DIR).filter((f) => f.endsWith(".png")),
    ...readdirSync(join(DIR, "light")).map((f) => `light/${f}`),
  ];

  it("checks a real library", () => expect(files.length).toBeGreaterThan(80));

  it("every badge and every ivory twin", async () => {
    const bad: string[] = [];
    for (const f of files) {
      const n = await spillAtOutline(join(DIR, f));
      if (n) bad.push(`${f}: ${n} px`);
    }
    expect(bad).toEqual([]);
  }, 180_000);
});
