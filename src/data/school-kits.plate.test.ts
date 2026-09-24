import { describe, it, expect } from "vitest";
import { allSchoolKits, kitPlateState, schoolPlatePhoto, SCHOOL_STOCK_PLATES, type SchoolKit } from "./school-kits";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getPlateImageUrl } from "./plate-images";
import { getPlateDesign } from "./plates";
import { pilotSchoolKits } from "./school-pilot";

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

describe("schoolPlatePhoto", () => {
  // The stock Missouri photo reads FESTIVE — the other brand. Five of six pilot
  // builders showed it because they have no vanity plate of their own.
  const festive = getPlateImageUrl("MO");

  it("never hands a school preview the FESTIVE stock plate", () => {
    expect(festive).toMatch(/festive/);
    for (const kit of allSchoolKits()) {
      const state = kitPlateState(kit) ?? "MO";
      const src = schoolPlatePhoto(kit, state) ?? getPlateImageUrl(state);
      expect(src, `${kit.slug} previews on ${src}`).not.toMatch(/festive/i);
    }
    expect(schoolPlatePhoto(null, "MO")).not.toMatch(/festive/i);
  });

  it("prefers the kit's own plate, only on the state that photo is", () => {
    const kit = { city: "Ladue, MO", plate: { state: "MO", src: "/plates/missouri-rams-centered.jpg" } } as SchoolKit;
    expect(schoolPlatePhoto(kit, "MO")).toBe("/plates/missouri-rams-centered.jpg");
    expect(schoolPlatePhoto(kit, "KS")).toBeUndefined();
    expect(schoolPlatePhoto(kitFor("Eureka, MO"), "MO")).toBe(SCHOOL_STOCK_PLATES.MO);
  });

  it("points at stock plates that exist", () => {
    for (const src of Object.values(SCHOOL_STOCK_PLATES)) {
      expect(existsSync(join(process.cwd(), "public", src)), src).toBe(true);
    }
  });

  it("gives every pilot school a crisp plate of its own, on a file that exists", () => {
    // The stock plate is a real Missouri plate with its number privacy-blurred.
    // Side by side on a sales sheet, five blurred plates beside Ladue's crisp RAMS
    // read as two different products — and the blur as a censored photo.
    for (const kit of pilotSchoolKits()) {
      expect(kit.plate, `${kit.slug} falls back to the blurred stock plate`).toBeDefined();
      expect(schoolPlatePhoto(kit, kitPlateState(kit)!)).toBe(kit.plate!.src);
    }
    for (const kit of allSchoolKits()) {
      if (kit.plate) expect(existsSync(join(process.cwd(), "public", kit.plate.src)), kit.plate.src).toBe(true);
    }
  });
});
