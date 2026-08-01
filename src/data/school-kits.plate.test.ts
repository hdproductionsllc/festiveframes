import { describe, it, expect } from "vitest";
import { allSchoolKits, kitPlateState, type SchoolKit } from "./school-kits";
import { getPlateDesign } from "./plates";

/**
 * The plate under the frame is part of the mockup, and the store hard-coded "MO".
 * A school in Texas therefore opened on a Missouri plate — a picture of a car that
 * could not be in its own parking lot, on the one page meant to feel like theirs.
 *
 * Derived from the kit's own `city` so it costs a new school nothing: no field to
 * fill in and no per-school step, which is the rule for anything national.
 */

const kitFor = (city: string) => ({ city }) as SchoolKit;

describe("kitPlateState", () => {
  it("reads the state off the city", () => {
    expect(kitPlateState(kitFor("St. Louis, MO"))).toBe("MO");
    expect(kitPlateState(kitFor("Austin, TX"))).toBe("TX");
    expect(kitPlateState(kitFor("Shaker Heights, OH"))).toBe("OH");
  });

  it("is not fussy about case or spacing", () => {
    expect(kitPlateState(kitFor("Chicago,il"))).toBe("IL");
    expect(kitPlateState(kitFor("Nashville,   tn  "))).toBe("TN");
  });

  it("returns null rather than guessing", () => {
    // The caller keeps its own default; a wrong plate is worse than a neutral one.
    expect(kitPlateState(kitFor("St. Louis"))).toBeNull();
    expect(kitPlateState(kitFor(""))).toBeNull();
    expect(kitPlateState(kitFor("Somewhere, ZZ"))).toBeNull();
    expect(kitPlateState(undefined)).toBeNull();
    expect(kitPlateState(null)).toBeNull();
  });

  it("never returns a state the plate renderer cannot draw", () => {
    for (const city of ["Austin, TX", "Miami, FL", "Fargo, ND", "Juneau, AK"]) {
      const abbr = kitPlateState(kitFor(city))!;
      expect(getPlateDesign(abbr), `${abbr} has no plate design`).toBeTruthy();
    }
  });

  it("resolves for every kit we actually ship", () => {
    for (const kit of allSchoolKits()) {
      expect(kitPlateState(kit), `${kit.slug} (${kit.city}) has no plate state`).toBeTruthy();
    }
  });

  it("agrees with any hand-set plate photo on the kit", () => {
    // `kit.plate` is scoped to a state, and it only applies while the picker is on
    // that state. If the two disagreed, the school's own vanity plate would never
    // show on its own page.
    for (const kit of allSchoolKits()) {
      if (!kit.plate) continue;
      expect(kitPlateState(kit), `${kit.slug} opens on the wrong state for its plate photo`).toBe(
        kit.plate.state,
      );
    }
  });
});
