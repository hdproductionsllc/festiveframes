import { describe, it, expect } from "vitest";
import { SCHOOL_CHECKOUT_OPEN, schoolOffer } from "./offers";

// ─── The parked-checkout tripwire ────────────────────────────────────────────
//
// Not a behaviour test. A DELIBERATENESS test.
//
// The school builder's Buy button is off because $49 and the $10 donation are
// engineering placeholders, not decisions the owner has made — and the cost of
// getting that wrong is charging a real parent a made-up price, or promising a
// booster club a number we did not agree to. That is not the kind of thing that
// should be able to switch on as a side effect of somebody tidying up a flag.
//
// So flipping SCHOOL_CHECKOUT_OPEN deliberately breaks this file. Deleting the
// assertion is a two-line edit; the point is that it cannot happen by accident,
// and that whoever does it has to read why it was closed first.
//
// WHEN THE DECISION IS MADE: confirm both numbers with the owner, flip the
// constant, and replace the first assertion below with the confirmed figures.

describe("school checkout stays parked until pricing is owner-confirmed", () => {
  it("is CLOSED — see the note on SCHOOL_CHECKOUT_OPEN before changing this", () => {
    expect(
      SCHOOL_CHECKOUT_OPEN,
      "Opening school checkout charges parents the placeholder price. Confirm " +
        "schoolPrice and schoolDonationCents with the owner first, then update this test.",
    ).toBe(false);
  });

  it("still carries the placeholder figures the lock exists for", () => {
    // If these have changed, the prices may now be real — which is the moment to
    // revisit the constant above rather than leaving it closed out of habit.
    expect(schoolOffer.schoolPrice).toBe(4900);
    expect(schoolOffer.schoolDonationCents).toBe(1000);
  });

  it("promises the school a donation that the frame's price can actually cover", () => {
    expect(schoolOffer.schoolDonationCents).toBeGreaterThan(0);
    expect(schoolOffer.schoolDonationCents).toBeLessThan(schoolOffer.schoolPrice);
  });
});
