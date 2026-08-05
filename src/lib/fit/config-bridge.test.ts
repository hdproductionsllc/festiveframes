import { describe, it, expect } from "vitest";

import {
  DEFAULT_FRAME_CONFIG,
  SCHOOL_JULY_FULL_FRAME_CONFIG,
  SCHOOL_JULY_SLIM_FRAME_CONFIG,
} from "@/lib/constants/frame";
import {
  centredRegistration,
  configFromSpec,
  shippabilityRefusals,
  specFromConfig,
} from "@/lib/fit/config-bridge";
import { computeFit } from "@/lib/fit/geometry";
import { BILL_CURRENT_SPEC, CANDIDATE_SPEC, JULY_SPEC, PRESETS } from "@/lib/fit/spec";

// The bridge exists so the bench's numbers and the shipping configs cannot drift.
// These tests are that claim, stated as arithmetic.

describe("specFromConfig — the presets ARE their configs", () => {
  it("derives the July ring from DEFAULT_FRAME_CONFIG", () => {
    // The strongest check in the file: the hand-written JULY_SPEC and the config
    // the July frame was actually printed from must be the same geometry. This
    // is what caught nothing when July was a thousandth wrong, because it did
    // not exist.
    expect(specFromConfig(DEFAULT_FRAME_CONFIG)).toEqual(JULY_SPEC);
  });

  it("derives the candidate from the staged SLIM config", () => {
    expect(specFromConfig(SCHOOL_JULY_SLIM_FRAME_CONFIG)).toEqual(CANDIDATE_SPEC);
  });

  it("derives Bill's current parts from the staged FULL config", () => {
    // FULL's second bottom row buys its height DOWNWARD, so the registration is
    // not the centred one: the extra inch hangs below the plate.
    expect(specFromConfig(SCHOOL_JULY_FULL_FRAME_CONFIG)).toEqual(BILL_CURRENT_SPEC);
  });

  it("reads the July ring's overlaps off the grid, not off a rounded quote", () => {
    const r = centredRegistration(DEFAULT_FRAME_CONFIG);
    expect(r.sideInwardInches).toBeCloseTo(0.5495, 9);
    expect(r.topInwardInches).toBeCloseTo(0.5225, 9);
    expect(r.bottomDropInches).toBeCloseTo(0.4685, 9);
  });
});

describe("configFromSpec — and the reasons there is no config", () => {
  it("round-trips every staged config through the bench and back", () => {
    for (const config of [DEFAULT_FRAME_CONFIG, SCHOOL_JULY_SLIM_FRAME_CONFIG, SCHOOL_JULY_FULL_FRAME_CONFIG]) {
      const out = configFromSpec(specFromConfig(config), config);
      expect("config" in out).toBe(true);
      if (!("config" in out)) continue;
      // The geometry fields, which are the ones the bench owns.
      expect(out.config.tileSizeInches).toBeCloseTo(config.tileSizeInches, 9);
      expect(out.config.topSlots).toBe(config.topSlots);
      expect(out.config.leftSlots).toBe(config.leftSlots);
      expect(out.config.wingColumns).toBe(config.wingColumns);
      expect(out.config.bottomRows ?? 1).toBe(config.bottomRows ?? 1);
      expect(out.config.widthInches).toBeCloseTo(config.widthInches, 9);
      expect(out.config.heightInches).toBeCloseTo(config.heightInches, 9);
    }
  });

  it("passes every preset the bench ships", () => {
    for (const { key, spec } of PRESETS) {
      expect({ key, refusals: shippabilityRefusals(spec) }).toEqual({ key, refusals: [] });
    }
  });

  it("refuses a runner that is not a whole number of rows", () => {
    // The runner dial steps in 0.05, so this is one drag away at any time.
    const r = shippabilityRefusals({ ...CANDIDATE_SPEC, runnerHeightInches: 1.35 });
    expect(r).toHaveLength(2); // fractional rows, and the stack no longer closes
    expect(r[0]).toContain("whole bottom rows");
  });

  it("refuses a side reach the lattice does not force", () => {
    const r = shippabilityRefusals({ ...CANDIDATE_SPEC, sideInwardInches: 0.4 });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain("Change the window, not the reach.");
  });

  it("refuses a frame that does not close on its own grid", () => {
    // This is the July defect, expressed as a refusal: 0.522 where the grid
    // demands 0.5225.
    const r = shippabilityRefusals({ ...JULY_SPEC, topInwardInches: 0.522 });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain("does not close on its own grid");
  });

  it("does not change what the bench reports about a geometry", () => {
    // The bridge is a projection, not a second opinion: a spec derived from a
    // config must read out exactly as the hand-written preset did.
    expect(computeFit(specFromConfig(DEFAULT_FRAME_CONFIG))).toEqual(computeFit(JULY_SPEC));
  });
});
