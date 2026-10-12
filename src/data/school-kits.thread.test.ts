import { describe, expect, it } from "vitest";
import { allSchoolKits } from "@/data/school-kits";
import { BRASS, merrowThread } from "@/lib/utils/tile-theme";

// ─── No school's lettering is outlined in a gold it does not have ────────────
//
// The rule's own tests use sample colours, and those samples went stale: they
// still pinned the rims Webster, Lafayette and Burroughs had BEFORE their colours
// were measured, so four schools shipped gold outlines (SLUH, Kirkwood, Parkway
// Central, Cor Jesu) while every test passed. This asks the real kits, with the
// real field, the way both renderers ask.

describe("every authored kit's lettering outline", () => {
  it("is never the brass fallback", () => {
    const brass = new Set<string>([BRASS.light, BRASS.mid, BRASS.dark]);
    const golden = allSchoolKits().filter((k) =>
      brass.has(merrowThread(k.banners.text, k.colors.rim, k.banners.bg ?? k.colors.frame)),
    );
    expect(golden.map((k) => k.slug)).toEqual([]);
  });
});
