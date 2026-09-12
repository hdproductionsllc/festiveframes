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
    });
  }
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
