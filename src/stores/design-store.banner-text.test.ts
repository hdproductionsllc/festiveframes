import { describe, it, expect, beforeEach, vi } from "vitest";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getSchoolKit } from "@/data/school-kits";
import { schoolStoreOptions } from "@/data/school-store";
import { SCHOOL_PHRASES } from "@/data/school-phrases";
import { schoolDesignOf } from "@/lib/utils/compose-school-frame";
import {
  bannerLogoCropInches,
  bannerLogoFromUpload,
  bannerLogoInches,
  LOGO_HEIGHT_RATIO,
} from "@/lib/utils/banner-logo";
import { oneLine, oneLineBanner, repairSections } from "@/lib/utils/sections";
import { rowHeightInchesIn } from "@/lib/utils/rows";
import { panelRects } from "@/lib/utils/panels";

// Banner text is ONE line, and a crest uploaded from the banner editor lands as
// the banner's logo. The owner, on /s/marquette-mustangs: the phrase chips put
// "HONOR / ROLL" on two lines, and "Mascot or crest" had no way to upload one.

vi.mock("@/lib/utils/image-store", () => ({
  putFullRes: vi.fn(async () => {}),
  getFullRes: vi.fn(async () => null),
  deleteFullRes: vi.fn(async () => {}),
}));

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return Array.from(this.map.keys())[i] ?? null; }
  get length() { return this.map.size; }
}
const memoryStorage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, writable: true, configurable: true });
// Without a `window` the store opts out of persistence and the hydrate test would
// pass vacuously.
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });

const { createDesignStore } = await import("./design-store");

let seq = 0;
const kit = getSchoolKit("marquette-mustangs")!;
function marquette(key = `banner-text-${seq++}`) {
  return createDesignStore(key, schoolStoreOptions({ kit, variant: SCHOOL_SHIPPING_VARIANT }));
}

beforeEach(() => memoryStorage.clear());

describe("oneLine", () => {
  it("turns every kind of line break into one space", () => {
    expect(oneLine("HONOR\nROLL")).toBe("HONOR ROLL");
    expect(oneLine("HONOR\r\nROLL")).toBe("HONOR ROLL");
    expect(oneLine("HONOR \n\n  ROLL")).toBe("HONOR ROLL");
    expect(oneLine("A\rB")).toBe("A B");
    expect(oneLine(`A${String.fromCharCode(0x2028)}B${String.fromCharCode(0x2029)}C`)).toBe("A B C");
  });

  it("leaves a line alone, trailing space included (the parent is mid-word)", () => {
    expect(oneLine("GO ")).toBe("GO ");
    expect(oneLine("CLASS OF 2027")).toBe("CLASS OF 2027");
  });

  it("hands back the SAME banner object when there is nothing to flatten", () => {
    const cfg = { text: "MUSTANGS", tagline: "HOME OF THE" };
    expect(oneLineBanner(cfg)).toBe(cfg);
    expect(oneLineBanner({ text: "A\nB" })).toEqual({ text: "A B", tagline: undefined });
  });

  it("repairSections flattens banner text and is a no-op on clean sections", () => {
    const clean = { bottom: { mode: "text" as const, text: { text: "MUSTANGS" } } };
    expect(repairSections(clean)).toBe(clean);
    const broken = { bottom: { mode: "text" as const, text: { text: "PROUD\nPARENT", tagline: "CLASS OF\n2027" } } };
    const fixed = repairSections(broken);
    expect(fixed.bottom.text).toMatchObject({ text: "PROUD PARENT", tagline: "CLASS OF 2027" });
  });
});

describe("banner text is ONE line in the store", () => {
  it("a typed or pasted break becomes a space, in the headline and the tagline", () => {
    const store = marquette();
    store.getState().setSectionText("bottom", { text: "HONOR\nROLL", tagline: "CLASS OF\r\n2027" });
    const t = store.getState().sections.bottom?.text;
    expect(t?.text).toBe("HONOR ROLL");
    expect(t?.tagline).toBe("CLASS OF 2027");
    store.getState().setSectionText("top", { text: "MARQUETTE\nHIGH SCHOOL" });
    expect(store.getState().sections.top?.text?.text).toBe("MARQUETTE HIGH SCHOOL");
  });

  it("every phrase chip lands as one line", () => {
    const store = marquette();
    for (const p of SCHOOL_PHRASES) {
      store.getState().setSectionText("bottom", { text: p });
      expect(store.getState().sections.bottom?.text?.text).not.toMatch(/[\r\n]/);
    }
  });

  it("the kit seed is one line on both banners", () => {
    const s = marquette().getState();
    for (const id of ["top", "bottom"] as const) {
      expect(s.sections[id]?.text?.text ?? "").not.toMatch(/[\r\n]/);
      expect(s.sections[id]?.text?.tagline ?? "").not.toMatch(/[\r\n]/);
    }
  });

  it("a design saved with a two-line banner is flattened on hydrate", () => {
    const key = "banner-text-hydrate";
    const seeded = marquette(key);
    const bottom = seeded.getState().sections.bottom!;
    memoryStorage.setItem(
      key,
      JSON.stringify({
        state: {
          sections: {
            ...seeded.getState().sections,
            bottom: { ...bottom, text: { ...bottom.text!, text: "PROUD\nPARENT", tagline: "SENIOR\n2027" } },
          },
        },
        version: 7,
      }),
    );
    const store = marquette(key);
    store.persist.rehydrate();
    const t = store.getState().sections.bottom?.text;
    expect(t?.text).toBe("PROUD PARENT");
    expect(t?.tagline).toBe("SENIOR 2027");
  });

  it("a restored design (save link) is flattened too", () => {
    const store = marquette();
    const bottom = store.getState().sections.bottom!;
    store.getState().loadDesign({
      ...store.getState(),
      sections: { ...store.getState().sections, bottom: { ...bottom, text: { ...bottom.text!, text: "GO\nMUSTANGS" } } },
    });
    expect(store.getState().sections.bottom?.text?.text).toBe("GO MUSTANGS");
  });
});

describe("a crest uploaded from the banner editor lands as the banner's logo", () => {
  const config = schoolVariant(SCHOOL_SHIPPING_VARIANT).config;

  it("is cropped SQUARE at the crest's printed size on the bottom bar", () => {
    const crop = bannerLogoCropInches("bottom", config);
    expect(crop.width).toBe(crop.height);
    const rect = panelRects(config).bottom;
    let bar = 0;
    for (let r = rect.row0; r <= rect.row1; r++) bar += rowHeightInchesIn(config, false, r);
    expect(crop.width).toBeCloseTo(bar * LOGO_HEIGHT_RATIO, 6);
    expect(bannerLogoInches("bottom", config)).toBeGreaterThan(0.4); // a real mark, not a smudge
  });

  it("replaces the kit crest, keeps the words and the placement, and carries the full-res id to print", () => {
    const store = marquette();
    const before = store.getState().sections.bottom!.text!;
    const art = { url: "data:image/png;base64,CREST", fullResId: "full-res-123" };
    store.getState().setSectionText("bottom", { logo: bannerLogoFromUpload(art, before.logo) });
    const after = store.getState().sections.bottom!;
    expect(after.mode).toBe("text");
    expect(after.text?.logo).toEqual({
      url: art.url,
      fullResId: "full-res-123",
      placement: before.logo?.placement ?? "both",
    });
    expect(after.text?.text).toBe(before.text);
    expect(after.text?.tagline).toBe(before.tagline);
    // Print is handed the same logo — compose loads `fullResId` from IndexedDB.
    expect(schoolDesignOf(store.getState()).sections.bottom?.text?.logo?.fullResId).toBe("full-res-123");
  });

  it("a first crest goes at both ends; a chosen placement is kept", () => {
    expect(bannerLogoFromUpload({ url: "u" }).placement).toBe("both");
    expect(bannerLogoFromUpload({ url: "u" }, { url: "old", placement: "left" }).placement).toBe("left");
  });
});
