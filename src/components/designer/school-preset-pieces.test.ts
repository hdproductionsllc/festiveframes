import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPiece } from "@/data/sets";

/**
 * Every badge the school builder places by id must still exist.
 *
 * The preset layout — the "pick a preset and go" path, which is the flow most
 * parents will actually use — placed `hs:laurel` in four slots. That piece was
 * withdrawn when the library became one make, so the preset had been seeding a
 * dead id ever since: no test failed, the build passed, and the tiles simply
 * came up empty for anyone who used it.
 *
 * Reads the source rather than importing it: SchoolDesigner is a large client
 * component with CSS and store imports that a node test cannot evaluate.
 *
 * The activity list lives in its own module now (it grew facts about each entry,
 * such as whether the sport wears a number), so both files are scanned — a guard
 * that only watched the component would have gone quiet the moment the ids moved.
 */

const SOURCES = [
  "src/components/designer/SchoolDesigner.tsx",
  "src/data/activities.ts",
].map((p) => path.join(process.cwd(), p));

function pieceIds(): string[] {
  const src = SOURCES.map((p) => readFileSync(p, "utf8")).join("\n");
  return [...new Set([...src.matchAll(/"(hs:[a-z0-9-]+)"/g)].map((m) => m[1]))];
}

describe("the school builder's hard-coded badge ids", () => {
  const ids = pieceIds();

  it("references a meaningful number of pieces", () => {
    expect(ids.length).toBeGreaterThan(10);
  });

  it.each(ids)("%s resolves to a real piece", (id) => {
    expect(getPiece(id), `${id} is placed by the builder but not in any set`).toBeTruthy();
  });
});
