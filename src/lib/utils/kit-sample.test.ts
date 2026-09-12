import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage, type Image } from "@napi-rs/canvas";
import { allSchoolKits, getSchoolKit, kitSections, type SchoolKit } from "@/data/school-kits";
import { kitSeedTiles } from "@/data/kit-seed";
import { schoolVariant, type SchoolVariantId } from "@/data/school-variants";
import { getPiece } from "@/data/sets";
import {
  SCHOOL_PRINT_DPI,
  drawSchoolFrame,
  schoolCanvasSize,
  type SchoolDesign,
  type SchoolImageBundle,
} from "@/lib/utils/compose-school-frame";
import type { PlacedTile } from "@/lib/types";
import { registerNodeFonts, registeredFamilies } from "@/lib/utils/node-fonts";

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
    if (!piece?.artworkUrl || pieces.has(piece.artworkUrl)) continue;
    const bytes = await readFile(join(PUBLIC, piece.artworkUrl));
    pieces.set(piece.artworkUrl, await loadImage(bytes));
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

function designFor(kit: SchoolKit, variantId: SchoolVariantId): SchoolDesign {
  const { config, badgeStack } = schoolVariant(variantId);
  return {
    frameConfig: config,
    slots: kitSeedTiles(kit, config, badgeStack) as Record<string, PlacedTile>,
    textBars: [],
    qrCode: { enabled: false, url: "", size: 0 },
    plateState: "MO",
    sections: kitSections(kit) as SchoolDesign["sections"],
    // ALL THREE brand colours, exactly as `SchoolBuilder` seeds them from the kit.
    // Passing only `frameColor` rendered every school's badges on the stock navy
    // field, which looked like a product defect and was really this harness
    // lying: a sample that does not carry what the builder carries is not a
    // sample of the product.
    frameColor: kit.colors.frame,
    tileFieldColor: kit.colors.tileField,
    rimColor: kit.colors.rim,
  } as SchoolDesign;
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
      const design = designFor(kit, "flush");
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
    const kit = getSchoolKit(process.env.KIT_SAMPLE_SLUG ?? "sluh-jr-bills");
    expect(kit, "KIT_SAMPLE_SLUG names no kit").toBeDefined();
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
