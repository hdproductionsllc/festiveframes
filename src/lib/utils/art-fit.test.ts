import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ART_FIT, ART_FIT_ALPHA, ART_FIT_ROOTS } from "@/data/sets/art-fit.generated";
import { tileSets } from "@/data/sets";
import { kitMarkPieces } from "@/data/sets/school-marks";
import { allSchoolKits } from "@/data/school-kits";
import { hasArtFit } from "@/lib/utils/art-fit";
import {
  artInset,
  artRect,
  badgeArtworkUrls,
  cornerRadii,
  swatchArtRect,
  SWATCH_AIR_RATIO,
  SWATCH_RADIUS_PX,
  TILE_BG,
  type CornerRadii,
} from "@/lib/utils/tile-theme";

// ─── Every badge art is measured, the measurement is current, and it never clips ─
//
// scripts/art-fit.mjs measures each artwork's ink so a badge can draw it as large
// as its own shape allows (utils/art-fit). The table is only as good as its
// coverage: art that skips the script falls back to the uniform corner rule and
// quietly stays small, and art that CHANGED after it was measured could be drawn
// from a stale silhouette and clip. Both fail here, by name.

const PUBLIC = join(process.cwd(), "public");

function pngsUnder(rel: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(PUBLIC, rel)).sort()) {
    const r = `${rel}/${name}`;
    if (statSync(join(PUBLIC, r)).isDirectory()) out.push(...pngsUnder(r));
    else if (name.toLowerCase().endsWith(".png")) out.push(`/${r}`);
  }
  return out;
}

const onDisk = ART_FIT_ROOTS.flatMap(pngsUnder);

describe("the art-fit table covers every artwork, and is current", () => {
  it("has an entry for every PNG under its roots, and none for a file that is gone", () => {
    const missing = onDisk.filter((u) => !ART_FIT[u]);
    expect(missing, "run `npm run art:fit`").toEqual([]);
    const orphans = Object.keys(ART_FIT).filter((u) => !onDisk.includes(u));
    expect(orphans, "run `npm run art:fit`").toEqual([]);
  });

  it("matches every file byte for byte (sha) and in size", () => {
    const stale: string[] = [];
    for (const url of onDisk) {
      const bytes = readFileSync(join(PUBLIC, url));
      const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
      // PNG IHDR: width and height, big-endian, at bytes 16 and 20.
      const w = bytes.readUInt32BE(16);
      const h = bytes.readUInt32BE(20);
      const e = ART_FIT[url];
      if (!e || e.sha !== sha || e.w !== w || e.h !== h) stale.push(url);
    }
    expect(stale, "art changed since it was measured — run `npm run art:fit`").toEqual([]);
  });

  it("measures every artwork a school badge can draw (library, ivory twins, kit marks)", () => {
    const pieces = [...tileSets.flatMap((s) => s.pieces), ...allSchoolKits().flatMap((k) => kitMarkPieces(k))];
    const urls = new Set(
      pieces
        .flatMap((p) => badgeArtworkUrls(p))
        .filter((u) => /^\/(tiles\/high-school|kits)\//.test(u)),
    );
    expect(urls.size).toBeGreaterThan(100);
    expect([...urls].filter((u) => !hasArtFit(u))).toEqual([]);
  });
});

// ─── Geometry ────────────────────────────────────────────────────────────────

/** The flush frame's side badge: 2.25" square on a 1" cell, at print DPI. */
const DPI = 300;
const UNIT = DPI;
const SIDE = Math.round(2.25 * DPI);
const ALL_CORNERS = cornerRadii(UNIT, { tl: true, tr: true, br: true, bl: true });
const PLAIN = cornerRadii(UNIT);

/** Whether px centre (x, y) lies inside the rounded rect `inset` in from a w x h box. */
function inside(x: number, y: number, w: number, h: number, inset: number, r: CornerRadii): boolean {
  const L = inset, T = inset, R = w - inset, B = h - inset;
  if (x < L || x > R || y < T || y > B) return false;
  const test = (cx: number, cy: number, rad: number, inX: boolean, inY: boolean) =>
    !(inX && inY) || (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad;
  const tl = Math.max(0, r.tl - inset), tr = Math.max(0, r.tr - inset);
  const br = Math.max(0, r.br - inset), bl = Math.max(0, r.bl - inset);
  return (
    test(L + tl, T + tl, tl, x < L + tl, y < T + tl) &&
    test(R - tr, T + tr, tr, x > R - tr, y < T + tr) &&
    test(R - br, B - br, br, x > R - br, y > B - br) &&
    test(L + bl, B - bl, bl, x < L + bl, y > B - bl)
  );
}

/** Ink pixels (alpha above the table's threshold) that land outside the safe region. */
async function strays(
  url: string,
  w: number,
  h: number,
  radii: CornerRadii,
  bg: string,
  rect = artRect(w, h, bg, UNIT, radii, url),
) {
  const img = await loadImage(readFileSync(join(PUBLIC, url)));
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
  const px = ctx.getImageData(0, 0, w, h).data;
  // One pixel of grace: resampling spreads an edge pixel into its neighbour.
  const inset = artInset(w, h, bg, UNIT) - 1;
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (px[(y * w + x) * 4 + 3] > ART_FIT_ALPHA && !inside(x + 0.5, y + 0.5, w, h, inset, radii)) n++;
  return n;
}

/** A side badge with ONE wide corner, in each of the four places the frame puts one. */
const ORIENTATIONS = (["tl", "tr", "br", "bl"] as const).map((k) => ({
  k,
  radii: cornerRadii(UNIT, { tl: false, tr: false, br: false, bl: false, [k]: true }),
}));

describe("per-art fit never clips", () => {
  const WORST = ["art", "ice-hockey", "lacrosse", "field-hockey", "orchestra", "torch", "grad-cap"];

  it("the check has teeth: the palette drawn full size on a frame corner is caught", async () => {
    const url = "/tiles/high-school/art.png";
    const i = artInset(SIDE, SIDE, TILE_BG.white, UNIT);
    const naive = { x: i, y: i, width: SIDE - 2 * i, height: SIDE - 2 * i };
    const caught = await Promise.all(ORIENTATIONS.map(({ radii }) => strays(url, SIDE, SIDE, radii, TILE_BG.white, naive)));
    expect(caught.some((n) => n > 0), `${caught}`).toBe(true);
  });

  it("keeps every measured artwork's ink inside the chrome and the WIDE frame corner, at all four corners", async () => {
    const bad: string[] = [];
    for (const url of Object.keys(ART_FIT)) {
      for (const { k, radii } of ORIENTATIONS) {
        const n = await strays(url, SIDE, SIDE, radii, TILE_BG.white);
        if (n) bad.push(`${url} @${k}: ${n}px`);
      }
    }
    expect(bad).toEqual([]);
  }, 180_000);

  it("holds on a wide 2x1 badge with two frame corners, where ink-box fitting grows the art", async () => {
    const radii = cornerRadii(UNIT, { tl: true, tr: false, br: false, bl: true });
    for (const name of [...WORST, "band", "weightlifting", "softball"]) {
      const url = `/tiles/high-school/${name}.png`;
      expect(await strays(url, UNIT * 2, UNIT, radii, TILE_BG.navy), url).toBe(0);
    }
  }, 60_000);

  it("holds in a tray swatch's rounded corners", async () => {
    for (const name of WORST) {
      const url = `/tiles/high-school/${name}.png`;
      const w = 56;
      const img = await loadImage(readFileSync(join(PUBLIC, url)));
      const r = swatchArtRect(w, w, url);
      const c = createCanvas(w, w);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, r.x, r.y, r.width, r.height);
      const px = ctx.getImageData(0, 0, w, w).data;
      const air = Math.max(1, Math.round(w * SWATCH_AIR_RATIO)) - 1;
      const rad = { tl: SWATCH_RADIUS_PX, tr: SWATCH_RADIUS_PX, br: SWATCH_RADIUS_PX, bl: SWATCH_RADIUS_PX };
      let n = 0;
      for (let y = 0; y < w; y++)
        for (let x = 0; x < w; x++)
          if (px[(y * w + x) * 4 + 3] > ART_FIT_ALPHA && !inside(x + 0.5, y + 0.5, w, w, air, rad)) n++;
      expect(n, url).toBe(0);
    }
  });
});

describe("per-art fit is as big as the art allows", () => {
  const uniform = (radii: CornerRadii) => SIDE - 2 * artInset(SIDE, SIDE, TILE_BG.navy, UNIT, radii);
  /** Drawn size of the art's INK, which is what a viewer sees as "how big". */
  const inkWidth = (url: string, radii: CornerRadii) => {
    const e = ART_FIT[url];
    const r = artRect(SIDE, SIDE, TILE_BG.navy, UNIT, radii, url);
    return ((e.box[2] - e.box[0]) / e.w) * r.width;
  };

  it("gives compact art its FULL size on a frame corner, bigger than the uniform rule", () => {
    const full = SIDE - 2 * artInset(SIDE, SIDE, TILE_BG.navy, UNIT);
    for (const url of [
      "/tiles/high-school/softball.png",
      "/tiles/high-school/soccer.png",
      "/tiles/high-school/basketball.png",
      "/kits/ladue-rams/mascot.png",
      "/kits/marquette-mustangs/mascot.png",
      "/kits/eureka-wildcats/mascot.png",
    ]) {
      const e = ART_FIT[url];
      const inkMax = Math.max(e.box[2] - e.box[0], e.box[3] - e.box[1]);
      for (const { k, radii } of ORIENTATIONS) {
        const drawnMax = (inkMax / Math.max(e.w, e.h)) * artRect(SIDE, SIDE, TILE_BG.navy, UNIT, radii, url).width;
        expect(drawnMax, `${url} @${k}`).toBeGreaterThan(uniform(radii) * (inkMax / Math.max(e.w, e.h)));
        // Full size: the ink spans the whole safe box, corner or not.
        expect(drawnMax, `${url} @${k}`).toBeGreaterThan(full - 1);
      }
    }
  });

  it("gives art that reaches its corners no more than it must, and never less than the uniform rule", () => {
    for (const url of Object.keys(ART_FIT)) {
      const e = ART_FIT[url];
      const inkW = e.box[2] - e.box[0];
      const inkH = e.box[3] - e.box[1];
      expect(inkH).toBeGreaterThan(0);
      for (const { k, radii } of [...ORIENTATIONS, { k: "all", radii: ALL_CORNERS }]) {
        // What the uniform rule drew: the whole IMAGE contained in the uniform box.
        const old = (uniform(radii) / Math.max(e.w, e.h)) * inkW;
        expect(inkWidth(url, radii), `${url} @${k}`).toBeGreaterThanOrEqual(old - 0.5);
      }
    }
  });

  it("fits art on an ordinary badge to the chrome, exactly as big as before or bigger", () => {
    for (const url of Object.keys(ART_FIT)) {
      const e = ART_FIT[url];
      const old = ((SIDE - 2 * artInset(SIDE, SIDE, TILE_BG.navy, UNIT)) / Math.max(e.w, e.h)) * (e.box[2] - e.box[0]);
      expect(inkWidth(url, PLAIN), url).toBeGreaterThanOrEqual(old - 0.5);
    }
  });

  it("leaves art that was never measured on the uniform rule, unchanged", () => {
    const url = "/tiles/july4th/flag.png";
    expect(hasArtFit(url)).toBe(false);
    const i = artInset(SIDE, SIDE, TILE_BG.navy, UNIT, ALL_CORNERS);
    expect(artRect(SIDE, SIDE, TILE_BG.navy, UNIT, ALL_CORNERS, url)).toEqual({ x: i, y: i, width: SIDE - 2 * i, height: SIDE - 2 * i });
    const pad = 52 * 0.09;
    expect(swatchArtRect(52, 52, url)).toEqual({ x: pad, y: pad, width: 52 - pad * 2, height: 52 - pad * 2 });
  });
});
