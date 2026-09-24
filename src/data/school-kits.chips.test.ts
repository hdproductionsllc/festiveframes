import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "@/data/activities";
import { getPiece } from "@/data/sets";
import { allSchoolKits, chipPiece, CHIP_PRESET_PIECE, KIT_BOTTOM_TAGLINE, kitSections } from "@/data/school-kits";
import { WITHHELD_ART } from "@/data/sets/high-school";
import { pilotSchoolKits } from "@/data/school-pilot";
import { SEEDED_TOP_FRAGMENTS, normalizeLine } from "@/lib/utils/school-banner";

// ─── What a pilot parent sees above the builder ──────────────────────────────
//
// The welcome chips say "Tap an activity and we'll build the frame around it", so each
// one has to build THAT activity. A tradition ("Battle of 109") or a publication
// name had no badge and quietly built the generic crest instead. The kit page now
// hides such labels; the pilot kits must not carry any, so nothing a school's
// research found is silently lost from the page.

const GROUP = new Map(ACTIVITIES.map((a) => [a.id, a.group]));

describe("pilot kit chips", () => {
  it("every chip builds a real badge", () => {
    for (const kit of pilotSchoolKits()) {
      // Mapped AND real: a map entry pointing at a piece that does not exist
      // would lay an empty pocket, which is the same broken promise.
      // A chip whose art is WITHHELD is hidden on purpose, not dead: the mapping
      // is right and comes back the moment the art is redrawn.
      const mapped = (c: string) => CHIP_PRESET_PIECE[c.trim().toLowerCase()] ?? "";
      const dead = kit.welcome!.chips.filter((c) => !getPiece(mapped(c)));
      expect(dead, `${kit.slug} has chips that build nothing of their own`).toEqual([]);
    }
  });

  it("every pilot school offers at least one arts or academic chip", () => {
    // Owner, 2026-09-23: strong non-sports examples. A kit whose chips are all
    // sports tells an orchestra family the frame is not for them.
    for (const kit of pilotSchoolKits()) {
      const nonSport = kit.welcome!.chips.filter((c) => {
        const group = GROUP.get(chipPiece(c) ?? "");
        return group === "Arts" || group === "Academics & clubs";
      });
      expect(nonSport.length, `${kit.slug} has only sports chips`).toBeGreaterThan(0);
    }
  });

  it("never prints an outside organisation's registered name", () => {
    // DECA, Key Club (Kiwanis) and Special Olympics are other organisations' marks;
    // on a paid product they read as an endorsement. Generic labels only — and on
    // EVERY kit, not just the pilot: the national switch reopens the other 21.
    const MARKS = /\b(DECA|FBLA|HOSA|Key Club|Special Olympics|National Honor Society|NHS)\b/i;
    for (const kit of allSchoolKits()) {
      if (!kit.welcome) continue;
      const hits = kit.welcome!.chips.filter((c) => MARKS.test(c));
      expect(hits, kit.slug).toEqual([]);
    }
  });

  it("the chip helper reads the shared map, case- and padding-blind", () => {
    expect(chipPiece(" speech & DEBATE ")).toBe("hs:debate");
    expect(chipPiece("Battle of 109")).toBeNull();
  });

  it("offers no badge whose art is withheld — chip, signature or tray", () => {
    // Scholar Bowl's art is a brass desk bell (a hotel bell to a parent). The
    // vocabulary still maps it, so it returns when the art is redrawn; until then
    // no chip builds it and no kit seeds it onto a frame.
    expect(CHIP_PRESET_PIECE["scholar bowl"]).toBe("hs:quiz-bowl");
    expect(WITHHELD_ART.has("hs:quiz-bowl")).toBe(true);
    expect(chipPiece(" Scholar Bowl ")).toBeNull();
    for (const kit of allSchoolKits()) {
      const held = (kit.signature ?? []).filter((id) => WITHHELD_ART.has(id));
      expect(held, `${kit.slug} seeds withheld art onto its frame`).toEqual([]);
    }
    for (const id of WITHHELD_ART.keys()) {
      expect(ACTIVITIES.map((a) => a.id)).not.toContain(id);
      expect(getPiece(id), `${id} must stay registered for saved designs`).toBeDefined();
    }
  });
});

describe("the banner layout every kit ships (owner, 2026-09-23)", () => {
  it("puts the SCHOOL on the top runner and HOME OF THE over the mascot", () => {
    for (const kit of allSchoolKits()) {
      const s = kitSections(kit);
      expect(s.top?.text?.text, kit.slug).toBe(kit.banners.top);
      expect(s.bottom?.text?.text, kit.slug).toBe(kit.banners.bottom);
      expect(s.bottom?.text?.tagline, kit.slug).toBe(KIT_BOTTOM_TAGLINE);
      // The top runner is a complete line, never a fragment waiting for a noun —
      // which is also what keeps `schoolTopLine` from ever needing to promote it.
      expect(SEEDED_TOP_FRAGMENTS, kit.slug).not.toContain(normalizeLine(kit.banners.top));
      expect(normalizeLine(kit.banners.top), kit.slug).not.toBe(normalizeLine(kit.banners.bottom));
    }
  });
});
