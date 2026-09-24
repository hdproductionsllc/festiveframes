import { describe, it, expect } from "vitest";
import { contrastRatio } from "@/lib/utils/tile-theme";
import { getSchoolKit } from "@/data/school-kits";
import { PILOT_SCHOOL_SLUGS } from "@/data/school-pilot";
import { schoolChrome } from "./school-chrome";

describe("schoolChrome — the primary action is readable and visible for every pilot school", () => {
  it.each([...PILOT_SCHOOL_SLUGS])("%s: white type clears AA on the action fill", (slug) => {
    const kit = getSchoolKit(slug)!;
    const c = schoolChrome(kit.colors);
    expect(contrastRatio(c.action, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it.each([...PILOT_SCHOOL_SLUGS])("%s: the header button either stands off the header or is ringed", (slug) => {
    const kit = getSchoolKit(slug)!;
    const c = schoolChrome(kit.colors);
    if (c.ring) expect(contrastRatio(c.ring, c.header)).toBeGreaterThanOrEqual(3);
    else expect(contrastRatio(c.action, c.header)).toBeGreaterThanOrEqual(1.5);
  });

  it("keeps a school colour that already clears AA exactly as it is", () => {
    expect(schoolChrome({ frame: "#AB1E38", rim: "#FFFFFF" }).action).toBe("#AB1E38");
  });

  it("darkens Parkway West's light blue only as far as white type needs", () => {
    const c = schoolChrome({ frame: "#5199CD", rim: "#A40925" });
    expect(c.action).not.toBe("#5199CD");
    expect(contrastRatio(c.action, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.action, "#ffffff")).toBeLessThan(6);
  });

  it("rings Lafayette's near-black button in its gold", () => {
    expect(schoolChrome({ frame: "#231F20", rim: "#FFCC00" }).ring).toBe("#FFCC00");
  });
});
