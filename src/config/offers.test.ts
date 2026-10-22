import { describe, it, expect } from "vitest";
import { SCHOOL_CHECKOUT_OPEN, coerceSchoolGiftCents, schoolGift, schoolOffer } from "./offers";

// ─── The parked-checkout tripwire ────────────────────────────────────────────
//
// Not a behaviour test. A DELIBERATENESS test.
//
// The school builder's Buy button is off. The figures are owner-confirmed
// (2026-09-23: $24.95, $5 to the school) — what is still owed is ONE end-to-end
// test payment on the live site before a real parent's card goes through it.
// That is not the kind of thing that should be able to switch on as a side
// effect of somebody tidying up a flag.
//
// So flipping SCHOOL_CHECKOUT_OPEN deliberately breaks this file. Deleting the
// assertion is a two-line edit; the point is that it cannot happen by accident,
// and that whoever does it has to read why it was closed first.
//
// WHEN THE TEST PAYMENT HAS RUN: flip the constant and change the first
// assertion below to record that it was done.

describe("school checkout stays parked until one test payment has run", () => {
  it("is CLOSED — see the note on SCHOOL_CHECKOUT_OPEN before changing this", () => {
    expect(
      SCHOOL_CHECKOUT_OPEN,
      "Opening school checkout charges real parents. Run one end-to-end test " +
        "payment on the live site first, then update this test.",
    ).toBe(false);
  });

  it("carries the owner-confirmed pilot figures ($24.95, $5 to the school)", () => {
    // Confirmed 2026-09-23 and quoted verbatim in Bill's outreach email. The lock
    // above now waits on one end-to-end test payment, not on the numbers.
    expect(schoolOffer.schoolPrice).toBe(2495);
    expect(schoolOffer.schoolDonationCents).toBe(500);
  });

  it("promises the school a donation that the frame's price can actually cover", () => {
    expect(schoolOffer.schoolDonationCents).toBeGreaterThan(0);
    expect(schoolOffer.schoolDonationCents).toBeLessThan(schoolOffer.schoolPrice);
  });
});

describe("a parent's gift to the school (owner-confirmed 2026-10-22)", () => {
  it("offers $5 / $10 / $25 and caps at $250", () => {
    expect(schoolGift.presetsCents).toEqual([500, 1000, 2500]);
    expect(schoolGift.maxCents).toBe(25000);
    for (const c of schoolGift.presetsCents) expect(coerceSchoolGiftCents(c)).toBe(c);
  });

  it("reads absent, null and 0 as no gift", () => {
    expect(coerceSchoolGiftCents(undefined)).toBe(0);
    expect(coerceSchoolGiftCents(null)).toBe(0);
    expect(coerceSchoolGiftCents(0)).toBe(0);
  });

  it("accepts whole dollars up to the cap and nothing else", () => {
    expect(coerceSchoolGiftCents(100)).toBe(100);
    expect(coerceSchoolGiftCents(25000)).toBe(25000);
    for (const bad of [25100, 99, 150, -500, 10.5, NaN, "500", true, {}]) {
      expect(coerceSchoolGiftCents(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
