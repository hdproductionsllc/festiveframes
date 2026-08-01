import { describe, it, expect } from "vitest";
import { repairDanglingTopLine } from "./school-banner";
import { kitSections, getSchoolKit } from "@/data/school-kits";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";

/**
 * Fixing the intake only fixes the NEXT frame somebody makes. Every design saved
 * while the bug was live hydrates straight back into "HOME OF THE / OKAFOR", and
 * hydrate is the only place those can be reached — see the persist note in
 * CLAUDE.md about why this cannot live in `migrate`.
 */

const seeded = kitSections(getSchoolKit("sluh-jr-bills")!);

const saved = (top: string, bottom: string, tagline?: string) => ({
  top: { mode: "text" as const, text: { ...seeded.top!.text!, text: top } },
  bottom: { mode: "text" as const, text: { ...seeded.bottom!.text!, text: bottom, tagline } },
});

describe("repairing a design that was already saved broken", () => {
  it("promotes the school over a surname", () => {
    const fixed = repairDanglingTopLine(saved("HOME OF THE", "OKAFOR", "CLASS OF 2027"), seeded);
    expect(fixed.top.text.text).toBe("ST. LOUIS UNIVERSITY HIGH");
    expect(fixed.bottom.text.text).toBe("OKAFOR");
    expect(fixed.bottom.text.tagline).toBe("CLASS OF 2027");
  });

  it("leaves an untouched frame ALONE, and returns the same object", () => {
    // HOME OF THE / JR. BILLS is a complete sentence and the shipping demo. A
    // repair that fired here would rewrite every school page's front door.
    const before = saved("HOME OF THE", "JR. BILLS", "ST. LOUIS UNIVERSITY HIGH");
    expect(repairDanglingTopLine(before, seeded)).toBe(before);
  });

  it("returns the same object for anything already correct", () => {
    // No churn on hydrate — a new object here re-renders the whole frame on every
    // page load.
    for (const before of [
      saved("ST. LOUIS UNIVERSITY HIGH", "OKAFOR", "CLASS OF 2027"),
      saved("GO JR. BILLS", "OKAFOR", "CLASS OF 2027"),
      saved("", "OKAFOR", "CLASS OF 2027"),
    ]) {
      expect(repairDanglingTopLine(before, seeded)).toBe(before);
    }
  });

  it("repairs the KITLESS builder too, where WILDCATS is the only school word", () => {
    const kitless = {
      top: { mode: "text" as const, text: { ...SCHOOL_DEFAULT_SECTIONS.top.text, text: "HOME OF THE" } },
      bottom: { mode: "text" as const, text: { ...SCHOOL_DEFAULT_SECTIONS.bottom.text, text: "OKAFOR" } },
    };
    expect(repairDanglingTopLine(kitless, SCHOOL_DEFAULT_SECTIONS).top.text.text).toBe("WILDCATS");
  });

  it("does nothing without a seed to compare against", () => {
    // /build's store has no school sections; it must pass straight through.
    const before = saved("HOME OF THE", "OKAFOR");
    expect(repairDanglingTopLine(before, undefined)).toBe(before);
    expect(repairDanglingTopLine(before, {})).toBe(before);
  });

  it("survives a half-built design without throwing", () => {
    expect(repairDanglingTopLine({}, seeded)).toEqual({});
    expect(repairDanglingTopLine({ top: { mode: "tiles" } }, seeded)).toEqual({ top: { mode: "tiles" } });
  });
});
