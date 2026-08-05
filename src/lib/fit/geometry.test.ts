import { describe, it, expect } from "vitest";

import { SCHOOL_JULY_FULL_FRAME_CONFIG } from "@/lib/constants/frame";
import { computeFit, outlineParts } from "@/lib/fit/geometry";
import {
  BILL_CURRENT_SPEC,
  CANDIDATE_SPEC,
  JULY_SPEC,
  MO_DATE_LINE_INCHES,
  PLATE,
  PRESETS,
  STICKER_ZONE_INCHES,
  specFromQuery,
  specToQuery,
  type FitSpec,
} from "@/lib/fit/spec";
import type { SectionId } from "@/lib/types";
import { panelSizeInches } from "@/lib/utils/panels";

// These tests pin NUMBERS, not shapes. The bench's whole value is that a
// configuration texted to Bill means one thing, so every preset's readout is
// asserted to the thousandth and the flag list is asserted exactly (length
// included) rather than by "contains" alone where the count is knowable.

describe("computeFit — the July ring (the only verified build)", () => {
  const r = computeFit(JULY_SPEC);

  it("is exactly 7 cells tall, the ring as it was actually printed", () => {
    // 7 x 0.991. Asserted against the GRID rather than a typed 6.937, because a
    // typed number is what let this drift to 6.938 in the first place.
    expect(r.totalHeightInches).toBeCloseTo(7 * JULY_SPEC.pitchInches, 6);
  });

  it("hangs 0.4685 in below the plate and the same above it", () => {
    // Symmetric by construction: one tile all round, so what the ring does not
    // spend covering the plate face it spends hanging past the edge.
    expect(r.belowPlateInches).toBeCloseTo(0.4685, 6);
    expect(r.abovePlateInches).toBeCloseTo(0.4685, 6);
    // EXACTLY equal, not merely close. These are one physical distance, and the
    // raw subtraction made them differ in the sixteenth decimal — enough for the
    // readout to print 0.468 against 0.469 for the same measurement.
    expect(r.belowPlateInches).toBe(r.abovePlateInches);
  });

  it("overlaps the plate face about half an inch all round", () => {
    // CLAUDE.md records the July ring overlapping ~0.55" on the sides and ~0.52"
    // top and bottom. The model reproduces both without being told them — and
    // to more places than the tildes carry.
    expect(r.faceCoverage.left).toBeCloseTo(0.5495, 6);
    expect(r.faceCoverage.right).toBeCloseTo(0.5495, 6);
    expect(r.faceCoverage.top).toBeCloseTo(0.5225, 6);
    expect(r.faceCoverage.bottomFullWidth).toBeCloseTo(0.5225, 6);
    // No keystone, so the centre reach is the banner's reach.
    expect(r.faceCoverage.bottomCenter).toBeCloseTo(r.faceCoverage.bottomFullWidth, 6);
  });

  it("is exactly 13 cells wide and clears the bed and the Pilot", () => {
    // Width comes from the side columns alone: the runners stop at the window's
    // edges. One 0.991 cell reaching 0.5495 over each plate edge puts 0.4415
    // outboard per side, so 12 + 2 x 0.4415 = 13 x 0.991. Asserted against the
    // grid, not a typed 12.883.
    expect(r.totalWidthInches).toBeCloseTo(13 * JULY_SPEC.pitchInches, 6);
    expect(r.fitsBedRotated).toBe(true);
    expect(r.underPilotCeiling).toBe(true);
  });

  it("leaves 1.2005 in clear at the worst plate corner", () => {
    // The sticker zone (1.75) less the deepest reach over the face (0.5495).
    expect(r.cornerClearInches).toBeCloseTo(STICKER_ZONE_INCHES - 0.5495, 6);
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
});

describe("computeFit — the candidate (7 in tall, 1.0 in runner)", () => {
  const r = computeFit(CANDIDATE_SPEC);

  it("lands exactly on the Pilot ceiling and exactly on the July bottom line", () => {
    // 0.5 above the plate + 6 plate + 0.5 below = 7.00 exactly. Both numbers sit
    // ON their thresholds, which is why the flag comparisons carry an epsilon.
    expect(r.totalHeightInches).toBeCloseTo(7, 6);
    expect(r.underPilotCeiling).toBe(true);
    expect(r.belowPlateInches).toBeCloseTo(0.5, 6);
    expect(r.abovePlateInches).toBeCloseTo(0.5, 6);
    expect(r.totalWidthInches).toBeCloseTo(15, 6);
    expect(r.fitsBedRotated).toBe(true);
  });

  it("closes the stack: the top rail's bottom edge meets the window's top edge", () => {
    // This is the tell that the four dials are consistent, and it is what the
    // 1.5 in runner broke. 0.5 drop + 1.0 runner + 5 window rows = the frame
    // bottom back up to y = 0.5, which is exactly topInward. No overlap, no gap.
    const parts = outlineParts(CANDIDATE_SPEC);
    const topRail = parts.find((p) => p.id === "rail-top")?.rect;
    const banner = parts.find((p) => p.id === "runner-bottom")?.rect;
    expect(topRail).toBeDefined();
    expect(banner).toBeDefined();
    if (!topRail || !banner) return;

    const windowTop = banner.y - CANDIDATE_SPEC.windowRows * CANDIDATE_SPEC.pitchInches;
    expect(topRail.y + topRail.h).toBeCloseTo(windowTop, 9);
    expect(topRail.y + topRail.h).toBeCloseTo(CANDIDATE_SPEC.topInwardInches, 9);
  });

  it("keeps face intrusion at 0.5 in and the keystone at 1.05 in, under the MO date line", () => {
    // Banner top edge = 6 + 0.5 drop - 1.0 runner = 5.50, so 0.50 in of face is
    // under the full-width banner. The keystone's 0.55 rise stands on that edge,
    // reaching 1.05 in up the plate against Missouri's 1.08 in date line: three
    // hundredths of margin, which is the whole reason the runner is 1.0.
    expect(r.faceCoverage.bottomFullWidth).toBeCloseTo(0.5, 6);
    expect(r.faceCoverage.bottomCenter).toBeCloseTo(1.05, 6);
    expect(r.faceCoverage.bottomCenter).toBeLessThan(MO_DATE_LINE_INCHES);
    expect(r.faceCoverage.left).toBeCloseTo(0.5, 6);
    expect(r.faceCoverage.top).toBeCloseTo(0.5, 6);
    expect(r.cornerClearInches).toBeCloseTo(1.25, 6);
  });

  it("raises no flags", () => {
    // Drop 0.50, side 0.50, top 0.50 and the banner's 0.50 all sit at or under
    // their thresholds, and the keystone clears the date line. Clean.
    expect(r.flags).toEqual([]);
  });
});

describe("every preset closes on its own grid", () => {
  // THE INVARIANT THAT WAS MISSING. A spec states its window in CELLS and its
  // plate overlap in INCHES, and the two have to describe the same frame: the
  // face the window does not expose is exactly the face the parts cover. Nothing
  // checked that, so July's overlaps could be — and were — hand-rounded to 3dp
  // until the ring no longer closed, and the bench quoted the one verified build
  // as 12.882 x 6.938 instead of 12.883 x 6.937.
  //
  // Per preset, not once: the next preset is the one most likely to be typed in
  // from a text message.
  for (const { key, label, spec } of PRESETS) {
    it(`${key} (${label}): window and overlaps agree`, () => {
      const windowW = spec.windowCols * spec.pitchInches;
      const windowH = spec.windowRows * spec.pitchInches;

      // Sides: the window is centred, so each side covers half the difference.
      expect(spec.sideInwardInches).toBeCloseTo((PLATE.widthInches - windowW) / 2, 9);

      // Vertical: the top rail's reach plus the banner's reach must account for
      // all the plate face the window does not show.
      const bannerInward = spec.runnerHeightInches - spec.bottomDropInches;
      expect(spec.topInwardInches + bannerInward).toBeCloseTo(PLATE.heightInches - windowH, 9);
    });
  }
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

      it("emits the fabricator's four parts and no invented seams", () => {
        // One piece per printed part: two runners, two full-height side columns.
        // A rail-bottom would split the banner and rail-left / rail-right would
        // split the side columns, double-counting material at the corners; the
        // FitPart id union no longer even names them, so this only has to check
        // that all four real parts are here.
        const ids = parts.map((p) => p.id);
        expect(ids).toContain("rail-top");
        expect(ids).toContain("runner-bottom");
        expect(ids).toContain("badges-left");
        expect(ids).toContain("badges-right");
      });

      it("cuts both runners to the window's width, centred on the plate", () => {
        const windowWidth = spec.windowCols * spec.pitchInches;
        const windowLeft = (12 - windowWidth) / 2;
        for (const id of ["rail-top", "runner-bottom"] as const) {
          const rect = parts.find((p) => p.id === id)?.rect;
          expect(rect).toBeDefined();
          expect(rect?.w).toBeCloseTo(windowWidth, 9);
          expect(rect?.x).toBeCloseTo(windowLeft, 9);
        }
      });

      it("runs both side columns the full height of the frame", () => {
        const r = computeFit(spec);
        for (const id of ["badges-left", "badges-right"] as const) {
          const rect = parts.find((p) => p.id === id)?.rect;
          expect(rect).toBeDefined();
          expect(rect?.h).toBeCloseTo(r.totalHeightInches, 9);
          expect(rect?.w).toBeCloseTo(spec.sideBadgeCells * spec.pitchInches, 9);
        }
        // And they are what sets the frame's width.
        const left = parts.find((p) => p.id === "badges-left")?.rect;
        const right = parts.find((p) => p.id === "badges-right")?.rect;
        expect(left?.x).toBeCloseTo(spec.sideInwardInches - spec.sideBadgeCells * spec.pitchInches, 9);
        expect(right?.x).toBeCloseTo(12 - spec.sideInwardInches, 9);
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
    const ks = CANDIDATE_SPEC.keystone;
    expect(banner).toBeDefined();
    expect(keystone).toBeDefined();
    expect(ks).not.toBeNull();
    if (!banner || !keystone || !ks) return;

    // The outline comes from `tabPath`, the module that draws the shipping part,
    // so the rounded top corners are SAMPLED and the point count is a detail of
    // that sampling. Pin the envelope instead: nothing outside the banner's span,
    // nothing above the rise, nothing below the banner's top edge.
    expect(keystone.length).toBeGreaterThan(4);
    for (const pt of keystone) {
      expect(pt.x).toBeGreaterThanOrEqual(banner.x - 1e-9);
      expect(pt.x).toBeLessThanOrEqual(banner.x + banner.w + 1e-9);
      expect(pt.y).toBeGreaterThanOrEqual(banner.y - ks.riseInches - 1e-9);
      expect(pt.y).toBeLessThanOrEqual(banner.y + 1e-9);
    }
    // Base sits on the banner's top edge; the top edge is `rise` above it.
    const ys = keystone.map((p) => p.y);
    expect(Math.max(...ys)).toBeCloseTo(banner.y, 6);
    expect(Math.min(...ys)).toBeCloseTo(banner.y - ks.riseInches, 6);
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

describe("the bench and the staged shipping config are one physical frame", () => {
  // Two independent models of the SAME parts: `panelSizeInches` sizes what the
  // exporter prints, `outlineParts` sizes what the bench draws and what the paper
  // template is cut from. Nothing else connects them, so if one is re-derived
  // this is the assertion that notices. Bill's texted parts (2026-08-02) are the
  // shared referent: side 8 x 2, top runner 11 x 1, bottom 11 x 2.
  const parts = outlineParts(BILL_CURRENT_SPEC);
  const rectOf = (id: string) => parts.find((p) => p.id === id)?.rect;

  const cases: Array<[SectionId, string]> = [
    ["wing-left", "badges-left"],
    ["top", "rail-top"],
    ["bottom", "runner-bottom"],
  ];

  for (const [panelId, partId] of cases) {
    it(`sizes ${panelId} the same as the bench's ${partId}`, () => {
      const panel = panelSizeInches(panelId, SCHOOL_JULY_FULL_FRAME_CONFIG);
      const rect = rectOf(partId);
      expect(rect).toBeDefined();
      expect(rect?.w).toBeCloseTo(panel.width, 3);
      expect(rect?.h).toBeCloseTo(panel.height, 3);
    });
  }
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

  it("does not hand a July link a keystone it never had", () => {
    // The lossy direction, and the one that mattered: July HAS no keystone, so
    // the old codec wrote no kr at all, and parsing that against a keystone-
    // bearing base handed the ring a phantom keystone. Bill would have been sent
    // a template for a part that is not in the design. `kr=0` is always written
    // now, so absence is stated rather than implied.
    const q = new URLSearchParams(specToQuery(JULY_SPEC));
    expect(q.get("kr")).toBe("0");
    const round = specFromQuery(q, CANDIDATE_SPEC);
    expect(round.keystone).toBeNull();
    expect(round).toEqual(JULY_SPEC);
    expect(outlineParts(round).some((p) => p.id === "keystone")).toBe(false);
  });
});
