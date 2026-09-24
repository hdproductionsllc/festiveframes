import { describe, it, expect, beforeEach, vi } from "vitest";
import { SCHOOL_SHIPPING_VARIANT, schoolVariant } from "@/data/school-variants";
import { getSchoolKit, chipPiece } from "@/data/school-kits";
import { PILOT_SCHOOL_SLUGS } from "@/data/school-pilot";
import { schoolStoreOptions } from "@/data/school-store";
import { kitMarkIds } from "@/data/sets/school-marks";
import { getPreset, layPreset, sideColumn, type SchoolPreset } from "@/data/school-presets";
import { writePersonOnBanner } from "@/lib/utils/school-banner";
import { snappetInches, tileSpan } from "@/lib/utils/snappet";
import type { PlacedTile } from "@/lib/types";

// ─── Themed presets REBUILD a design that already exists ─────────────────────
//
// The owner's report (2026-09-23): "many of the themed presets don't seem real or
// don't even repopulate existing designs". A preset tested on a fresh store proves
// nothing about that, because a fresh store is exactly the case that works. So every
// case here starts from a design a parent has ALREADY made — other badges, an
// uploaded photo, their own banner line — reloaded so it hydrates from storage the
// way a phone reopening a tab does, and then runs each one-tap path the builder
// offers, in the order the builder runs it:
//
//   a kit hero chip        -> layPreset("athlete", chip) + writePerson  (the `#preset=` handler)
//   Graduate / What they do / Just the school -> layPreset(p, activity) + writePerson
//   "See it on the frame"  -> layPreset("athlete", activity) + writePerson  (applyKidIntake)
//
// Every one must leave the six side squares rebuilt — symmetric, the chosen activity
// on the frame where there is one, no trace of the old badges or the photo — and the
// result must survive another reload.

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
// persist opts out when there is no window (SSR); without this the reloads below
// would hydrate nothing and pass vacuously.
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true });

const { createDesignStore } = await import("./design-store");

const VARIANT = SCHOOL_SHIPPING_VARIANT;
const { config, presets } = schoolVariant(VARIANT);
const LEFT = sideColumn(config, "wing-left");
const RIGHT = sideColumn(config, "wing-right");

beforeEach(() => memoryStorage.clear());

/** The store a parent's /s/<slug> page builds, on the key it persists under. */
function openBuilder(slug: string) {
  const kit = getSchoolKit(slug)!;
  const key = `festive-frames-school-test:${VARIANT}:${slug}`;
  return { kit, key, store: createDesignStore(key, schoolStoreOptions({ kit, variant: VARIANT })) };
}

type Store = ReturnType<typeof openBuilder>["store"];

/** A design somebody has already worked on: other badges, a photo, their own line. */
function customize(store: Store) {
  const s = store.getState();
  s.placeTile(LEFT[0].slot, "hs:golf", "hs");
  s.placeTile(RIGHT[2].slot, "hs:chess", "hs");
  s.placeTile(RIGHT[1].slot, "hs:yearbook", "hs");
  s.placeImageSnappet("wing-left", { imageUrl: "data:image/png;base64,AAAA", sourceAspect: 4 / 3 }, undefined, {
    anchorSlotId: LEFT[1].slot,
    span: LEFT[1].span,
  });
  s.setSectionText("bottom", { tagline: "SENIOR" });
  s.setSectionText("top", { text: "GO TEAM" });
}

/** The builder's `writePerson` after a preset: the intake's line, no name. */
function writeLine(store: Store, kit: NonNullable<ReturnType<typeof getSchoolKit>>, tagline: string) {
  writePersonOnBanner(store.getState(), kit, { name: "", tagline });
}

/** Six squares, mirrored, nothing left over from before. Returns the left run. */
function expectRebuilt(slots: Record<string, PlacedTile>, label: string): string[] {
  const ids = Object.keys(slots).sort();
  expect(ids, `${label}: exactly the six side anchors`).toEqual([...LEFT, ...RIGHT].map((b) => b.slot).sort());
  for (const [id, tile] of Object.entries(slots)) {
    const { width, height } = snappetInches(config, id, tileSpan(tile));
    expect(width, `${label}: ${id} width`).toBeCloseTo(2.25, 6);
    expect(height, `${label}: ${id} height`).toBeCloseTo(2.25, 6);
    expect(tile.image, `${label}: ${id} still carries the old photo`).toBeUndefined();
  }
  const left = LEFT.map((b) => slots[b.slot].pieceId);
  const right = RIGHT.map((b) => slots[b.slot].pieceId);
  expect(right, `${label}: symmetric`).toEqual(left);
  for (const stale of ["hs:golf", "hs:chess", "hs:yearbook"]) {
    // Only stale if the path did not itself choose it.
    if (!label.includes(stale)) expect(left, `${label}: ${stale} survived`).not.toContain(stale);
  }
  return left;
}

/** Every one-tap path the kit page offers for this school. */
function pathsFor(kit: NonNullable<ReturnType<typeof getSchoolKit>>) {
  const chips = (kit.welcome?.chips ?? []).map(chipPiece).filter((p): p is string => !!p);
  const activity = chips[0] ?? "hs:honor-star";
  const byId = (id: string) => getPreset(id, presets) as SchoolPreset;
  const out: Array<{ label: string; preset: SchoolPreset; activity: string | null }> = [];
  for (const chip of chips) out.push({ label: `chip ${chip}`, preset: byId("athlete"), activity: chip });
  // The preset strip, with an activity chosen in the intake and without.
  out.push({ label: "Graduate (no activity)", preset: byId("graduate"), activity: null });
  out.push({ label: `Graduate with ${activity}`, preset: byId("graduate"), activity });
  out.push({ label: `What they do with ${activity}`, preset: byId("athlete"), activity });
  out.push({ label: "Just the school", preset: byId("school"), activity: null });
  // "See it on the frame" — applyKidIntake — lays the athlete design.
  out.push({ label: `See it on the frame with ${activity}`, preset: byId("athlete"), activity });
  return out;
}

describe.each(PILOT_SCHOOL_SLUGS)("%s: every one-tap path rebuilds an existing design", (slug) => {
  it("has chips and presets to test", () => {
    const kit = getSchoolKit(slug)!;
    expect(kit, slug).toBeDefined();
    expect(pathsFor(kit).length).toBeGreaterThan(5);
    expect(LEFT).toHaveLength(3);
  });

  const kit = getSchoolKit(slug)!;
  const marks = kitMarkIds(kit);

  it.each(pathsFor(kit).map((p) => [p.label, p] as const))("%s", (label, { preset, activity }) => {
    // 1. A design the parent made, then a reload.
    const first = openBuilder(slug);
    customize(first.store);
    const before = first.store.getState().slots;
    expect(Object.values(before).some((t) => t.image), "the customized design has a photo").toBe(true);
    expect(Object.values(before).some((t) => t.pieceId === "hs:golf")).toBe(true);
    const { store } = openBuilder(slug); // hydrates from storage
    expect(store.getState().slots).toEqual(before);
    expect(store.getState().sections.bottom?.text?.tagline).toBe("SENIOR");

    // 2. The tap.
    layPreset(store.getState(), preset, activity, marks);
    writeLine(store, kit, "CLASS OF 2027");

    // 3. Six squares, mirrored, the activity on the frame when there is one.
    const run = expectRebuilt(store.getState().slots, `${label} ${activity ?? ""}`);
    if (activity && preset.layout.some(([, p]) => p === "__ACTIVITY__")) {
      expect(run, `${label}: the chosen activity is on the frame`).toContain(activity);
    }
    // Never the same badge twice in a row down a side.
    for (let i = 1; i < run.length; i++) expect(run[i], `${label}: repeat at ${i}`).not.toBe(run[i - 1]);
    expect(store.getState().sections.bottom?.text?.tagline).toBe("CLASS OF 2027");

    // 4. ...and it survives another reload, badge for badge.
    const after = store.getState().slots;
    const reopened = openBuilder(slug).store.getState();
    expect(reopened.slots).toEqual(after);
    expect(reopened.sections.bottom?.text?.tagline).toBe("CLASS OF 2027");
  });

  it("keeps the parent's own banner lines when the intake has nothing to write (a reload empties it)", () => {
    // After a reload the intake's fields are empty again, so the builder writes no
    // line. Laying a preset used to reset both banners to the kit's seed anyway,
    // so every chip tap on a restored design silently wiped the parent's line.
    const { store } = openBuilder(slug);
    customize(store);
    const reloaded = openBuilder(slug).store;
    layPreset(reloaded.getState(), getPreset("school", presets)!, null, marks);
    writePersonOnBanner(reloaded.getState(), kit, { name: "", tagline: "" });
    expectRebuilt(reloaded.getState().slots, "school, no intake");
    expect(reloaded.getState().sections.bottom?.text?.tagline).toBe("SENIOR");
    expect(reloaded.getState().sections.top?.text?.text).toBe("GO TEAM");
  });

  it("one Undo takes back the whole preset, photo and all", () => {
    const { store } = openBuilder(slug);
    customize(store);
    const before = store.getState().slots;
    layPreset(store.getState(), getPreset("athlete", presets)!, "hs:orchestra", marks);
    expectRebuilt(store.getState().slots, "athlete hs:orchestra");
    store.getState().undo();
    expect(store.getState().slots).toEqual(before);
  });

  it("two presets in a row each rebuild from the one before, and the last survives a reload", () => {
    const { store } = openBuilder(slug);
    customize(store);
    const seq = ["school", "graduate", "athlete", "school"];
    for (const id of seq) {
      layPreset(openBuilder(slug).store.getState(), getPreset(id, presets)!, "hs:orchestra", marks);
    }
    expectRebuilt(openBuilder(slug).store.getState().slots, "sequence hs:orchestra");
  });
});
