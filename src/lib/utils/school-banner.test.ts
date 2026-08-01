import { describe, it, expect } from "vitest";
import { schoolTopLine, normalizeLine } from "./school-banner";
import { getSchoolKit } from "@/data/school-kits";

/**
 * The frame read "HOME OF THE / OKAFOR / CLASS OF 2027" the moment anyone typed
 * a name into it, and named no school at all. Both halves of that came from the
 * same edit: the student replaced the noun that finished the top line, and
 * replaced the school's own name on the tagline.
 */

const SLUH = { banners: { bottom: "JR. BILLS", tagline: "ST. LOUIS UNIVERSITY HIGH" } };

describe("the top line when a person takes the bottom banner", () => {
  it("promotes the school's name so the frame stops saying HOME OF THE OKAFOR", () => {
    expect(
      schoolTopLine({
        kit: SLUH,
        currentTop: "HOME OF THE",
        currentBottom: "JR. BILLS",
        personName: "OKAFOR",
      }),
    ).toBe("ST. LOUIS UNIVERSITY HIGH");
  });

  it("falls back to the mascot line for a kit with no full name", () => {
    expect(
      schoolTopLine({
        kit: { banners: { bottom: "PIONEERS", tagline: "" } },
        currentTop: "HOME OF THE",
        currentBottom: "PIONEERS",
        personName: "OKAFOR",
      }),
    ).toBe("PIONEERS");
  });

  it("keeps the mascot on the KITLESS builder, where it only exists on the bottom", () => {
    // /lab/school and the generic builder seed HOME OF THE / WILDCATS with no kit
    // behind them. WILDCATS is the only school word on the frame, so it has to
    // survive the surname landing on top of it.
    expect(
      schoolTopLine({ currentTop: "HOME OF THE", currentBottom: "WILDCATS", personName: "OKAFOR" }),
    ).toBe("WILDCATS");
  });

  it("NEVER writes the person onto the top as well", () => {
    // A returning visitor's saved design already has their name on the bottom.
    // Reading it back would produce OKAFOR over OKAFOR — the same bug mirrored.
    expect(
      schoolTopLine({ currentTop: "HOME OF THE", currentBottom: "OKAFOR", personName: "OKAFOR" }),
    ).toBeNull();
    expect(
      schoolTopLine({ currentTop: "HOME OF THE", currentBottom: "okafor  ", personName: " Okafor" }),
    ).toBeNull();
  });

  it("leaves a top line the user wrote themselves completely alone", () => {
    expect(
      schoolTopLine({
        kit: SLUH,
        currentTop: "STATE CHAMPS 2026",
        currentBottom: "JR. BILLS",
        personName: "OKAFOR",
      }),
    ).toBeNull();
  });

  it("does not churn when the top already says the school", () => {
    expect(
      schoolTopLine({
        kit: SLUH,
        currentTop: "ST. LOUIS UNIVERSITY HIGH",
        currentBottom: "OKAFOR",
        personName: "OKAFOR",
      }),
    ).toBeNull();
  });

  it("never promotes another fragment", () => {
    // Two fragments stacked is the same defect one line further down.
    expect(
      schoolTopLine({ currentTop: "HOME OF THE", currentBottom: "HOME OF THE", personName: "OKAFOR" }),
    ).toBeNull();
  });

  it("fills an empty top strip rather than leaving the school unnamed", () => {
    expect(
      schoolTopLine({ kit: SLUH, currentTop: "", currentBottom: "JR. BILLS", personName: "OKAFOR" }),
    ).toBe("ST. LOUIS UNIVERSITY HIGH");
  });

  it("returns null when there is nothing better to say", () => {
    expect(schoolTopLine({ currentTop: "HOME OF THE", currentBottom: "", personName: "OKAFOR" })).toBeNull();
  });

  it("works against the REAL kits, not just a stand-in", () => {
    for (const slug of ["sluh-jr-bills", "kirkwood-pioneers", "micds-rams"]) {
      const kit = getSchoolKit(slug)!;
      const line = schoolTopLine({
        kit,
        currentTop: kit.banners.top,
        currentBottom: kit.banners.bottom,
        personName: "OKAFOR",
      });
      expect(line, `${slug} left its top line dangling`).toBeTruthy();
      expect(line).not.toBe("HOME OF THE");
      expect(line).not.toBe("OKAFOR");
    }
  });
});

describe("normalizeLine", () => {
  it("ignores case, padding and runs of space", () => {
    expect(normalizeLine("  jr.   bills ")).toBe("JR. BILLS");
    expect(normalizeLine(undefined)).toBe("");
  });
});
