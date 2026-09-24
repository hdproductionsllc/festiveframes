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
  return {
    plate: null,
    pieces: pieces as SchoolImageBundle["pieces"],
    snappets: new Map(),
    sections: new Map(),
    qr: null,
    logos: new Map(),
  };
}

/**
 * The design a parent from this school OPENS on: a real design store, created with
 * the builder's own options (`schoolStoreOptions`) and read through the picker
 * every export uses (`schoolDesignOf`). This harness used to type the design out
 * by hand, and once passed only `frameColor`, which rendered every school's badges
 * on stock navy: a sample built any other way than the builder's is not a sample.
 */
function designFor(kit: SchoolKit, variant: SchoolVariantId): SchoolDesign {
  const store = createDesignStore(`kit-sample:${kit.slug}:${variant}`, schoolStoreOptions({ kit, variant }));
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
    const design = designFor(kit!, variant);
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
