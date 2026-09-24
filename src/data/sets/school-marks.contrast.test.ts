import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { allSchoolKits } from "@/data/school-kits";
import { artFieldCollision, ART_FIELD_COLLISION_MAX } from "@/lib/utils/tile-theme";

// Every authored school mark must stay VISIBLE on its own school's badge field.
// A mark filled with the school colour vanishes into a badge that is the school
// colour, and reads as a hollow outline (Eureka, Lafayette and the Colts all did in
// the pilot samples). The cure is a card in the artwork — scripts/card-mark.mjs —
// and this is the gate that makes a new kit ask for one instead of shipping hollow.

const kits = allSchoolKits().filter((k) => k.marks?.badges?.length);

describe("school marks read on their own field", () => {
  it("has at least one authored kit with marks to check", () => {
    expect(kits.length).toBeGreaterThan(0);
  });

  for (const kit of kits) {
    for (const badge of kit.marks!.badges!) {
      it(`${kit.slug}: ${badge.key}`, async () => {
        const art = await loadImage(await readFile(join(process.cwd(), "public", badge.artworkUrl)));
        const cv = createCanvas(128, 128);
        const ctx = cv.getContext("2d");
        ctx.drawImage(art, 0, 0, 128, 128);
        const lost = artFieldCollision(ctx.getImageData(0, 0, 128, 128).data, kit.colors.tileField ?? kit.colors.frame);
        expect(lost).toBeLessThanOrEqual(ART_FIELD_COLLISION_MAX);
      });
    }
  }
});
