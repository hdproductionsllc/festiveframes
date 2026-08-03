import { describe, it, expect } from "vitest";

import { computeFit, outlineParts } from "@/lib/fit/geometry";
import {
  BILL_CURRENT_SPEC,
  CANDIDATE_SPEC,
  JULY_SPEC,
  MO_DATE_LINE_INCHES,
  PILOT_HEIGHT_CEILING_INCHES,
  specFromQuery,
  specToQuery,
  type FitSpec,
} from "@/lib/fit/spec";

// These tests pin NUMBERS, not shapes. The bench's whole value is that a
// configuration texted to Bill means one thing, so every preset's readout is
// asserted to the thousandth and the flag list is asserted exactly (length
// included) rather than by "contains" alone where the count is knowable.

describe("computeFit — the July ring (the only verified build)", () => {
  const r = computeFit(JULY_SPEC);

  it("is 6.937 in tall, give or take the rounding in Bill's quoted numbers", () => {
    // Nominal stack is 7 cells x 0.991 = 6.937. The spec's quoted drop (0.469)
    // and top inward (0.522) are 3dp roundings of that ring and sum to exactly
    // one pitch, which lands the true extent at 6.938 — one thou over nominal,
    // and about a tenth of the tolerance on Bill's printed parts (+/- 0.015).
    expect(Math.abs(r.totalHeightInches - 6.937)).toBeLessThanOrEqual(0.001 + 1e-9);
    expect(r.totalHeightInches).toBeCloseTo(6.938, 6);
  });

  it("hangs 0.469 in below the plate and the same above it", () => {
    expect(r.belowPlateInches).toBeCloseTo(0.469, 6);
    expect(r.abovePlateInches).toBeCloseTo(0.469, 6);
  });

  it("overlaps the plate face about half an inch all round", () => {
    // CLAUDE.md records the July ring overlapping ~0.55" on the sides and ~0.52"
    // top and bottom. The model reproduces both without being told them.
    expect(r.faceCoverage.left).toBeCloseTo(0.55, 6);
    expect(r.faceCoverage.right).toBeCloseTo(0.55, 6);
    expect(r.faceCoverage.top).toBeCloseTo(0.522, 6);
    expect(r.faceCoverage.bottomFullWidth).toBeCloseTo(0.522, 6);
    // No keystone, so the centre reach is the banner's reach.
    expect(r.faceCoverage.bottomCenter).toBeCloseTo(r.faceCoverage.bottomFullWidth, 6);
  });

  it("is 12.883 in wide and clears the bed and the Pilot", () => {
    expect(r.totalWidthInches).toBeCloseTo(12.883, 6);
    expect(r.fitsBedRotated).toBe(true);
    expect(r.underPilotCeiling).toBe(true);
  });

  it("leaves 1.2 in clear at the worst plate corner", () => {
    expect(r.cornerClearInches).toBeCloseTo(1.2, 6);
  });

  it("raises no flags at all", () => {
    // The verified build must be clean, or the rules are wrong rather than the
    // build. This assertion is the calibration of every threshold in the file.
    expect(r.flags).toEqual([]);
  });
});

describe("computeFit — Bill's current parts (2026-08-02 text)", () => {
  const r = computeFit(BILL_CURRENT_SPEC);

  it("puts 1.5 in below the plate and stands 8 in tall", () => {
    expect(r.belowPlateInches).toBeCloseTo(1.5, 6);
    expect(r.totalHeightInches).toBeCloseTo(8, 6);
    expect(r.underPilotCeiling).toBe(false);
  });

  it("still fits the printer bed rotated", () => {
    expect(r.totalWidthInches).toBeCloseTo(15, 6);
    expect(r.fitsBedRotated).toBe(true);
  });

  it("flags the below-plate hang and the Pilot ceiling, and nothing else", () => {
    expect(r.flags).toHaveLength(2);
    expect(r.flags[0]).toBe(
      "Bottom edge hangs 1.50 in below the plate. The July build's 0.47 in is the most ever shown to fit a car.",
    );
    expect(r.flags[1]).toBe("Total height 8.00 in exceeds the 7 in Pilot ceiling.");
    // The 2" runner buys its extra height DOWNWARD, so the face stays clear: the
    // failure here is car fit, not plate coverage.
    expect(r.faceCoverage.bottomFullWidth).toBeCloseTo(0.5, 6);
  });

  it("uses no em dashes in user-facing copy", () => {
    for (const flag of r.flags) expect(flag).not.toContain("—");
  });
});

describe("computeFit — the candidate (7 in tall, height bought inward)", () => {
  const r = computeFit(CANDIDATE_SPEC);

  it("lands exactly on the Pilot ceiling and exactly on the July bottom line", () => {
    // 0.5 above the plate + 6 plate + 0.5 below = 7.00 exactly. Both numbers sit
    // ON their thresholds, which is why the flag comparisons carry an epsilon.
    expect(r.totalHeightInches).toBeCloseTo(7, 6);
    expect(r.totalHeightInches).toBeLessThanOrEqual(PILOT_HEIGHT_CEILING_INCHES);
    expect(r.underPilotCeiling).toBe(true);
    expect(r.belowPlateInches).toBeCloseTo(0.5, 6);
    expect(r.abovePlateInches).toBeCloseTo(0.5, 6);
  });

  it("buys the banner's height over the plate face: 1.00 in full width, 1.55 in at centre", () => {
    // Banner top edge = 6 + 0.5 drop - 1.5 runner = 5.00, so 1.00 in of face is
    // under the full-width banner. The keystone's 0.55 rise stands on that edge,
    // reaching 1.55 in up the plate.
    expect(r.faceCoverage.bottomFullWidth).toBeCloseTo(1, 6);
    expect(r.faceCoverage.bottomCenter).toBeCloseTo(1.55, 6);
    expect(r.faceCoverage.bottomCenter).toBeGreaterThan(r.faceCoverage.bottomFullWidth);
    expect(r.cornerClearInches).toBeCloseTo(0.75, 6);
  });

  it("flags the banner coverage AND the keystone against Missouri's date line", () => {
    // Worth stating plainly, because the candidate was pitched as clean: at a 1"
    // pitch this geometry only reaches 7" total by eating 1.00 in of plate face
    // with the full-width banner, and the keystone then stands on TOP of that at
    // 1.55 in — past MO's 1.08 in date line. The drop (0.50) and the top rail
    // (0.50) are both on the right side of their rules; the bottom is not.
    expect(r.faceCoverage.bottomCenter).toBeGreaterThan(MO_DATE_LINE_INCHES);
    expect(r.flags).toHaveLength(2);
    expect(r.flags[0]).toBe(
      "The full width banner covers 1.00 in of plate face. Corner registration stickers are at risk.",
    );
    expect(r.flags[1]).toBe(
      "The keystone reaches 1.55 in up the plate. Missouri prints its date line at about 1.08 in.",
    );
    // Specifically NOT flagged: sitting on a threshold is passing it.
    expect(r.flags.some((f) => f.startsWith("Bottom edge hangs"))).toBe(false);
    expect(r.flags.some((f) => f.startsWith("Total height"))).toBe(false);
    expect(r.flags.some((f) => f.startsWith("Side pieces"))).toBe(false);
    expect(r.flags.some((f) => f.startsWith("Top rail"))).toBe(false);
  });
});

describe("computeFit — rule boundaries", () => {
  it("flags a frame too big for the bed in any rotation", () => {
    const huge: FitSpec = { ...CANDIDATE_SPEC, windowCols: 15, sideBadgeCells: 3 };
    const r = computeFit(huge);
    expect(r.fitsBedRotated).toBe(false);
    expect(r.flags).toContain("Does not fit the 16.5 x 13 in printer bed in any rotation.");
  });

  it("flags side pieces that reach past the embossed characters", () => {
    const deep: FitSpec = { ...CANDIDATE_SPEC, sideInwardInches: 0.8 };
    const r = computeFit(deep);
    expect(r.flags).toContain(
      "Side pieces reach 0.80 in over the plate face. Embossed characters start about 0.75 in from the edge.",
    );
  });

  it("flags a top rail that covers the state name", () => {
    const deep: FitSpec = { ...CANDIDATE_SPEC, topInwardInches: 0.9 };
    const r = computeFit(deep);
    expect(r.flags).toContain(
      "Top rail covers 0.90 in of the plate. Some states prohibit covering the state name.",
    );
  });

  it("never uses an em dash in any flag", () => {
    for (const spec of [JULY_SPEC, BILL_CURRENT_SPEC, CANDIDATE_SPEC]) {
      for (const flag of computeFit(spec).flags) expect(flag).not.toContain("—");
    }
  });
});

describe("outlineParts", () => {
  const specs: Array<[string, FitSpec]> = [
    ["july", JULY_SPEC],
    ["bill", BILL_CURRENT_SPEC],
    ["candidate", CANDIDATE_SPEC],
  ];

  for (const [name, spec] of specs) {
    describe(name, () => {
      const parts = outlineParts(spec);

      it("gives every part exactly one of rect or polygon", () => {
        expect(parts.length).toBeGreaterThan(0);
        for (const part of parts) {
          const drawn = [part.rect, part.polygon].filter((d) => d !== undefined);
          expect(drawn).toHaveLength(1);
          expect(part.label.length).toBeGreaterThan(0);
        }
      });

      it("emits the banner instead of a separate bottom rail", () => {
        const ids = parts.map((p) => p.id);
        expect(ids).toContain("runner-bottom");
        expect(ids).not.toContain("rail-bottom");
      });

      it("puts nothing below the frame's bottom edge", () => {
        // The bottom edge is the binding car-fit constraint; if any part sneaks
        // past it, every height number in the readout is a lie.
        const bottom = 6 + spec.bottomDropInches;
        for (const part of parts) {
          if (part.rect) expect(part.rect.y + part.rect.h).toBeLessThanOrEqual(bottom + 1e-9);
          if (part.polygon) {
            for (const pt of part.polygon) expect(pt.y).toBeLessThanOrEqual(bottom + 1e-9);
          }
        }
      });
    });
  }

  it("stands the keystone on the banner, inside its horizontal span", () => {
    const parts = outlineParts(CANDIDATE_SPEC);
    const banner = parts.find((p) => p.id === "runner-bottom")?.rect;
    const keystone = parts.find((p) => p.id === "keystone")?.polygon;
    expect(banner).toBeDefined();
    expect(keystone).toBeDefined();
    if (!banner || !keystone) return;

    expect(keystone).toHaveLength(4);
    for (const pt of keystone) {
      expect(pt.x).toBeGreaterThanOrEqual(banner.x - 1e-9);
      expect(pt.x).toBeLessThanOrEqual(banner.x + banner.w + 1e-9);
    }
    // Base sits on the banner's top edge; apex is `rise` above it.
    const ys = keystone.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(banner.y, 6);
    expect(Math.min(...ys)).toBeCloseTo(banner.y - 0.55, 6);
    // And it stays well clear of the corner sticker zones: 6" base centred on a
    // 12" plate leaves 3" at each end against a 1.75" zone.
    expect(Math.min(...keystone.map((p) => p.x))).toBeCloseTo(3, 6);
  });

  it("omits the keystone when the spec has none", () => {
    expect(outlineParts(JULY_SPEC).some((p) => p.id === "keystone")).toBe(false);
  });

  it("agrees with computeFit about the frame's overall extent", () => {
    // The readout and the drawing are two consumers of one derivation; this is
    // the assertion that keeps them one.
    const r = computeFit(CANDIDATE_SPEC);
    const parts = outlineParts(CANDIDATE_SPEC);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const part of parts) {
      if (part.rect) {
        xs.push(part.rect.x, part.rect.x + part.rect.w);
        ys.push(part.rect.y, part.rect.y + part.rect.h);
      }
      if (part.polygon) {
        for (const pt of part.polygon) {
          xs.push(pt.x);
          ys.push(pt.y);
        }
      }
    }
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(r.totalWidthInches, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(r.totalHeightInches, 6);
  });
});

describe("URL round trip", () => {
  it("carries CANDIDATE_SPEC through the query string unchanged", () => {
    // Starting from a DIFFERENT base proves every field actually crosses the
    // wire rather than being supplied by the default.
    const q = new URLSearchParams(specToQuery(CANDIDATE_SPEC));
    expect(specFromQuery(q, JULY_SPEC)).toEqual(CANDIDATE_SPEC);
  });

  it("produces an identical readout on the far side", () => {
    const round = specFromQuery(new URLSearchParams(specToQuery(CANDIDATE_SPEC)), JULY_SPEC);
    expect(computeFit(round)).toEqual(computeFit(CANDIDATE_SPEC));
  });
});
