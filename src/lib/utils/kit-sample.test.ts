import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import { allSchoolKits, type SchoolKit } from "@/data/school-kits";
import { resolveSchoolKit } from "@/data/school-resolve";
import { schoolStoreOptions } from "@/data/school-store";
import { createDesignStore } from "@/stores/design-store";
import { SCHOOL_SHIPPING_VARIANT, type SchoolVariantId } from "@/data/school-variants";
import { getPiece } from "@/data/sets";
import {
  SCHOOL_PRINT_DPI,
  drawSchoolFrame,
  schoolCanvasSize,
  schoolDesignOf,
  type SchoolDesign,
  type SchoolImageBundle,
} from "@/lib/utils/compose-school-frame";
import { registerNodeFonts, registeredFamilies } from "@/lib/utils/node-fonts";
import { badgeArtworkUrls } from "@/lib/utils/tile-theme";
import { bannerLogoFromUpload, sectionSupportsLogo } from "@/lib/utils/banner-logo";
import { tmpdir } from "node:os";
import type { SectionId } from "@/lib/types";

// ─── LOOK AT THE SCHOOL, not at a test fixture ───────────────────────────────
//
// compose-school-frame.test.ts renders one synthetic design and proves the print
// path draws. This renders a REAL KIT on a REAL VARIANT, with the actual badge
// PNGs loaded off disk — which is the only way to see what a parent from that
// school will be handed, and the thing CLAUDE.md requires before any visual
// change is reported.
//
//   KIT_SAMPLE_OUT=/tmp/sluh.png KIT_SAMPLE_SLUG=sluh-jr-bills \
//   KIT_SAMPLE_VARIANT=flush npx vitest run src/lib/utils/kit-sample.test.ts
//
// KIT_SAMPLE_SLUG takes ANY slug /s/<slug> takes, because it resolves through the
// same `resolveSchoolKit` the route does: one of the 27 authored kits, or any of
// the 29,467 roster schools, which come through as generated thin kits. Looking at
// a thin kit is the only way to see whether a name nobody chose for a banner fits
// on one — and there are 29,440 of those against 27 hand-checked ones.
//
// Unset, it still runs as a test: every kit must produce a frame whose seeded
// badges all resolve to artwork that exists on disk. A kit naming a piece whose
// PNG is missing renders an empty pocket and nothing fails anywhere else.

const PUBLIC = join(process.cwd(), "public");

// Without this every banner below renders in node's fallback sans while the
// product draws Graduate over Oswald — a render that looks fine and is a lie.
registerNodeFonts();

async function bundleFor(design: SchoolDesign): Promise<SchoolImageBundle> {
  const pieces = new Map<string, Image>();
  for (const tile of Object.values(design.slots)) {
    const piece = getPiece(tile.pieceId);
    if (!piece?.artworkUrl) continue;
    // Both twins, as the real loader does — the draw picks one by field.
    for (const url of badgeArtworkUrls(piece)) {
      if (!pieces.has(url)) pieces.set(url, await loadImage(await readFile(join(PUBLIC, url))));
    }
  }
  // The banner crest, as the real loader does (compose's logo loader). This used to
  // be an empty map, so every sample printed WITHOUT the crest a kit seeds — a
  // render that looks finished and is missing the school's mark. A site path is
  // read from public/; anything else is a file on disk (a stand-in for an upload,
  // whose original the browser reads from IndexedDB by `fullResId`).
  const logos = new Map<SectionId, Image>();
  for (const [id, sec] of Object.entries(design.sections) as [SectionId, (typeof design.sections)[SectionId]][]) {
    const logo = sec?.mode === "text" && sectionSupportsLogo(id) ? sec.text?.logo : undefined;
    if (!logo?.url) continue;
    const file = logo.url.startsWith("/") && !logo.url.startsWith(tmpdir()) ? join(PUBLIC, logo.url) : logo.url;
    logos.set(id, await loadImage(await readFile(file)));
  }
  return {
    plate: null,
    pieces: pieces as SchoolImageBundle["pieces"],
    snappets: new Map(),
    sections: new Map(),
    qr: null,
    logos: logos as SchoolImageBundle["logos"],
  };
}

/**
 * The design a parent from this school OPENS on: a real design store, created with
 * the builder's own options (`schoolStoreOptions`) and read through the picker
 * every export uses (`schoolDesignOf`). This harness used to type the design out
 * by hand, and once passed only `frameColor`, which rendered every school's badges
 * on stock navy: a sample built any other way than the builder's is not a sample.
 */
function designFor(kit: SchoolKit, variant: SchoolVariantId, frameColor?: string, crest?: string): SchoolDesign {
  const store = createDesignStore(`kit-sample:${kit.slug}:${variant}`, schoolStoreOptions({ kit, variant }));
  // A parent's "Frame color" tap, through the store action the picker calls — so a
  // sample with a changed colour is exactly what that tap sends to print.
  if (frameColor) store.getState().setFrameColor(frameColor);
  // A crest uploaded from the banner editor, landed exactly as the upload flow
  // lands it (`bannerLogoFromUpload` through `setSectionText`).
  if (crest) {
    const current = store.getState().sections.bottom?.text?.logo;
    store.getState().setSectionText("bottom", { logo: bannerLogoFromUpload({ url: crest }, current) });
  }
  return schoolDesignOf(store.getState());
}

describe("the banner faces are actually available to the renderer", () => {
  it("has Graduate and Oswald registered, not a fallback", () => {
    const families = registeredFamilies();
    for (const face of ["Graduate", "Oswald"]) expect(families).toContain(face);
  });
});

describe("every kit renders on the frame it ships on", () => {
  for (const kit of allSchoolKits()) {
    it(`${kit.slug} draws with all of its seeded artwork present`, async () => {
      const design = designFor(kit, SCHOOL_SHIPPING_VARIANT);
      // The assertion that matters: every seeded badge resolved to a real piece
      // with a real file. bundleFor throws on a missing PNG, which is the point.
      const images = await bundleFor(design);
      expect(images.pieces.size).toBeGreaterThan(0);

      const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
      const canvas = createCanvas(width, height);
      drawSchoolFrame(
        canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        design,
        images,
        width,
      );
      // A blank 4650 x 2025 canvas encodes to 36,756 bytes, so ">1000 bytes" was
      // an assertion `drawSchoolFrame` could satisfy by drawing nothing. Measure
      // the render instead: the frame body must cover most of the sheet, and the
      // kit's badge cells must carry INK that differs from the body colour.
      const ctx = canvas.getContext("2d");
      const px = ctx.getImageData(0, 0, width, height).data;
      let opaque = 0;
      for (let i = 3; i < px.length; i += 4 * 97) if (px[i] > 250) opaque++;
      const sampled = Math.ceil(px.length / (4 * 97));
      expect(opaque / sampled, `${kit.slug}: opaque share`).toBeGreaterThan(0.9);
      // The first left side badge: a 2.25" square anchored at the frame's top-left.
      // Artwork is many colours; a bare pocket is one. Count distinct colours
      // across the cell (quantised to 16 levels so anti-aliasing does not inflate
      // it) rather than comparing one centre pixel against one body pixel — that
      // version failed Parkway Central, whose near-black rim met a dark centre.
      const side = Math.round(2.25 * SCHOOL_PRINT_DPI);
      const cell = ctx.getImageData(0, 0, side, side).data;
      const colours = new Set<number>();
      for (let i = 0; i < cell.length; i += 4 * 8) {
        if (cell[i + 3] < 250) continue;
        colours.add(((cell[i] >> 4) << 8) | ((cell[i + 1] >> 4) << 4) | (cell[i + 2] >> 4));
      }
      expect(colours.size, `${kit.slug}: distinct colours in first side badge`).toBeGreaterThan(12);
      expect(canvas.toBuffer("image/png").length).toBeGreaterThan(1000);
      // A full 4650 x 2025 canvas per kit runs ~0.7s idle and HAS exceeded the
      // default 5s under CPU contention (three of these failed once while lint
      // ran beside them, then passed four runs straight). A render test that
      // flakes on load teaches people to re-run rather than to look.
    }, 30_000);
  }
});

describe("a Frame color tap reaches PRINT: badge fields and both banners", () => {
  // The owner tapped "Frame color" swatches and saw nothing: the control wrote only
  // the body, which the flush frame covers. It now writes one surface colour; this
  // pins that the PRINT file wears it where a parent looks — a side badge's field,
  // the top runner and the bottom bar — not just the body under the plate.
  it("paints #9E1B32 on a badge field, the top runner and the bottom bar", async () => {
    const kit = allSchoolKits().find((k) => k.slug === "marquette-mustangs")!;
    const design = designFor(kit, SCHOOL_SHIPPING_VARIANT, "#9E1B32");
    const images = await bundleFor(design);
    const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
    const canvas = createCanvas(width, height);
    drawSchoolFrame(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, design, images, width);
    const ctx = canvas.getContext("2d");
    const at = (fx: number, fy: number) => {
      const d = ctx.getImageData(Math.round(fx * width), Math.round(fy * height), 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const want = [0x9e, 0x1b, 0x32];
    for (const [name, fx, fy] of [
      ["left side badge field", 0.02, 0.35],
      ["top runner", 0.2, 0.05],
      ["bottom bar", 0.2, 0.93],
    ] as const) {
      const got = at(fx, fy);
      for (let c = 0; c < 3; c++) expect(Math.abs(got[c] - want[c]), `${name}: ${got}`).toBeLessThanOrEqual(3);
    }
  }, 30_000);
});

describe("a crest uploaded from the banner editor PRINTS", () => {
  // The owner: "Mascot or crest" had nowhere to upload one. It does now, and the
  // crest lands as the bottom banner's logo — this pins that the PRINT file draws
  // it, at both ends of the bar, and that it is drawn SQUARE.
  it("draws a red test crest at both ends of Marquette's bottom bar", async () => {
    const side = 600;
    const c = createCanvas(side, side);
    const g = c.getContext("2d");
    g.fillStyle = "#E0102E";
    g.fillRect(0, 0, side, side);
    const crest = join(tmpdir(), `kit-sample-crest-${process.pid}.png`);
    writeFileSync(crest, c.toBuffer("image/png"));

    const kit = allSchoolKits().find((k) => k.slug === "marquette-mustangs")!;
    const design = designFor(kit, SCHOOL_SHIPPING_VARIANT, undefined, crest);
    expect(design.sections.bottom?.text?.logo?.url).toBe(crest);
    const images = await bundleFor(design);
    const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
    const canvas = createCanvas(width, height);
    drawSchoolFrame(canvas.getContext("2d") as unknown as CanvasRenderingContext2D, design, images, width);
    const ctx = canvas.getContext("2d");
    // The bottom 1.2" of the sheet, split at the centre: red must appear in both
    // halves (placement "both"), and its bounding box on the left must be square.
    const y0 = Math.round(height - 1.2 * SCHOOL_PRINT_DPI);
    const band = ctx.getImageData(0, y0, width, height - y0).data;
    const bw = width;
    let left = 0, right = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < band.length; i += 4) {
      if (!(band[i] > 200 && band[i + 1] < 60 && band[i + 2] < 80)) continue;
      const x = (i / 4) % bw;
      const y = Math.floor(i / 4 / bw);
      if (x < bw / 2) {
        left++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      } else right++;
    }
    expect(left, "red crest pixels, left end").toBeGreaterThan(5000);
    expect(right, "red crest pixels, right end").toBeGreaterThan(5000);
    const w = maxX - minX + 1, h = maxY - minY + 1;
    expect(Math.abs(w - h), `crest box ${w} x ${h}`).toBeLessThanOrEqual(2);
    if (process.env.KIT_CREST_OUT) writeFileSync(process.env.KIT_CREST_OUT, canvas.toBuffer("image/png"));
  }, 30_000);
});

describe("contact sheet", () => {
  it("writes EVERY kit to KIT_SAMPLE_ALL_DIR", async () => {
    const dir = process.env.KIT_SAMPLE_ALL_DIR;
    if (!dir) return;
    // A rollout is 27 schools, and the defects worth catching are the ones that
    // only show up on ONE of them — a nickname too long for the banner, a rim
    // that vanishes into its own field. Rendering them one at a time is how you
    // end up checking three and shipping twenty-four.
    const variant = (process.env.KIT_SAMPLE_VARIANT ?? "flush") as SchoolVariantId;
    for (const kit of allSchoolKits()) {
      const design = designFor(kit, variant);
      const images = await bundleFor(design);
      const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
      const canvas = createCanvas(width, height);
      drawSchoolFrame(
        canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        design,
        images,
        width,
      );
      writeFileSync(join(dir, `${kit.slug}.png`), canvas.toBuffer("image/png"));
    }
  }, 120_000);
});

describe("sample artifact", () => {
  it("writes the requested kit to KIT_SAMPLE_OUT", async () => {
    const out = process.env.KIT_SAMPLE_OUT;
    if (!out) return;
    const kit = resolveSchoolKit(process.env.KIT_SAMPLE_SLUG ?? "sluh-jr-bills");
    expect(kit, "KIT_SAMPLE_SLUG names no school, authored or on the roster").toBeDefined();
    const variant = (process.env.KIT_SAMPLE_VARIANT ?? "flush") as SchoolVariantId;
    // KIT_SAMPLE_FRAME_COLOR=#9E1B32 renders the frame after a "Frame color" tap.
    // KIT_SAMPLE_CREST=<png> renders it with that crest uploaded on the bottom banner.
    const design = designFor(kit!, variant, process.env.KIT_SAMPLE_FRAME_COLOR, process.env.KIT_SAMPLE_CREST);
    const images = await bundleFor(design);
    const { width, height } = schoolCanvasSize(design.frameConfig, SCHOOL_PRINT_DPI);
    const canvas = createCanvas(width, height);
    drawSchoolFrame(
      canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
      design,
      images,
      width,
    );
    writeFileSync(out, canvas.toBuffer("image/png"));
  });
});
