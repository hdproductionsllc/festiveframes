import { describe, expect, it } from "vitest";
import { getSchoolKit, kitPlateState } from "@/data/school-kits";
import { isBuilderOpen } from "@/data/school-pilot";
import { CHICAGOLAND_KITS } from "./chicagoland";

// ─── The Chicagoland thirty: Illinois, and closed ────────────────────────────
//
// What is true of these kits and no others. The bar every kit is held to
// (colours, banners, badges, chips, welcome) is school-kits.copy.test.ts.

describe("the Chicagoland kits", () => {
  it("are thirty distinct Illinois schools, registered under their own slugs", () => {
    expect(CHICAGOLAND_KITS).toHaveLength(30);
    expect(new Set(CHICAGOLAND_KITS.map((k) => k.slug)).size).toBe(30);
    for (const kit of CHICAGOLAND_KITS) {
      expect(getSchoolKit(kit.slug), kit.slug).toBe(kit);
      expect(kit.city, kit.slug).toMatch(/, IL$/);
      // The preview opens on an Illinois plate, not Missouri's.
      expect(kitPlateState(kit), kit.slug).toBe("IL");
    }
  });

  it("stay demo kits behind the not-ready page until the owner opens them", () => {
    for (const kit of CHICAGOLAND_KITS) {
      expect(kit.status, kit.slug).toBe("demo");
      expect(isBuilderOpen(kit.slug), `${kit.slug} is open to parents`).toBe(false);
    }
  });

  // Colours, banners, signature badges, chips and the welcome are held to the bar
  // in school-kits.copy.test.ts, over EVERY authored kit, St. Louis included.
});
