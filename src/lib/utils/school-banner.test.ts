import { describe, it, expect } from "vitest";
import { schoolTopLine, normalizeLine, SEEDED_TOP_FRAGMENTS, writePersonOnBanner } from "./school-banner";
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

  it("leaves the REAL kits' top runner alone: it already names the school", () => {
    // Kits seed the school on the top runner and HOME OF THE over the mascot, so
    // a name landing on the bottom never needs anything promoted.
    for (const slug of ["sluh-jr-bills", "kirkwood-pioneers", "micds-rams"]) {
      const kit = getSchoolKit(slug)!;
      expect(
        schoolTopLine({
          kit,
          currentTop: kit.banners.top,
          currentBottom: kit.banners.bottom,
          personName: "OKAFOR",
        }),
        slug,
      ).toBeNull();
      expect(SEEDED_TOP_FRAGMENTS).not.toContain(normalizeLine(kit.banners.top));
    }
  });
});

describe("normalizeLine", () => {
  it("ignores case, padding and runs of space", () => {
    expect(normalizeLine("  jr.   bills ")).toBe("JR. BILLS");
    expect(normalizeLine(undefined)).toBe("");
  });
});

describe("writePersonOnBanner — the builder's one banner write", () => {
  /** A minimal store: the two banners and the one action the write uses. */
  function target(top: string, bottom: string, tagline: string) {
    const sections: Record<string, { text: { text: string; tagline?: string } }> = {
      top: { text: { text: top } },
      bottom: { text: { text: bottom, tagline } },
    };
    return {
      sections,
      setSectionText: (id: "top" | "bottom", u: { text?: string; tagline?: string }) => {
        sections[id] = { text: { ...sections[id].text, ...u } };
      },
    };
  }
  const kit = { banners: { bottom: "WILDCATS" } };

  it("writes a banner line over HOME OF THE and leaves the school and mascot alone", () => {
    const api = target("EUREKA HIGH SCHOOL", "WILDCATS", "HOME OF THE");
    writePersonOnBanner(api, kit, { tagline: "PROUD PARENT · 2027" });
    expect(api.sections.top.text.text).toBe("EUREKA HIGH SCHOOL");
    expect(api.sections.bottom.text).toEqual({ text: "WILDCATS", tagline: "PROUD PARENT · 2027" });
  });

  it("drops the seeded HOME OF THE when a name arrives with no line of its own", () => {
    const api = target("EUREKA HIGH SCHOOL", "WILDCATS", "HOME OF THE");
    writePersonOnBanner(api, kit, { name: "miller" });
    expect(api.sections.bottom.text).toEqual({ text: "MILLER", tagline: "" });
  });

  it("promotes the school over an old seeded top fragment", () => {
    const api = target("HOME OF THE", "WILDCATS", "CLASS OF 2027");
    const named = { banners: { bottom: "WILDCATS", tagline: "EUREKA HIGH SCHOOL" } };
    writePersonOnBanner(api, named, { name: "MILLER", tagline: "CLASS OF 2027" });
    expect(api.sections.top.text.text).toBe("EUREKA HIGH SCHOOL");
  });

  it("promotes the mascot when the kit names no school", () => {
    const api = target("HOME OF THE", "WILDCATS", "CLASS OF 2027");
    writePersonOnBanner(api, kit, { name: "MILLER", tagline: "CLASS OF 2027" });
    expect(api.sections.top.text.text).toBe("WILDCATS");
  });

  it("does nothing with nothing to write", () => {
    const api = target("EUREKA HIGH SCHOOL", "WILDCATS", "HOME OF THE");
    writePersonOnBanner(api, kit, {});
    expect(api.sections.bottom.text.tagline).toBe("HOME OF THE");
  });
});

describe("banner field text", () => {
  it("drops emoji the banner faces cannot draw, and line breaks", async () => {
    const { bannerTypeable } = await import("./school-banner");
    expect(bannerTypeable("GO STANG🐎 GO 🏒🔥")).toBe("GO STANG GO ");
    expect(bannerTypeable("👍🏽 #12")).toBe(" #12");
    expect(bannerTypeable("Mary\nAnne")).toBe("Mary Anne");
  });

  it("fits pasted text at a word boundary, never mid-word", async () => {
    const { fitAtWord } = await import("./school-banner");
    expect(fitAtWord("Mary Anne Smith-Jones Longname", 24)).toBe("Mary Anne Smith-Jones");
    expect(fitAtWord("Sam", 24)).toBe("Sam");
    expect(fitAtWord("Supercalifragilistic", 5)).toBe("Super");
    expect(fitAtWord("anything", 0)).toBe("");
  });
});
