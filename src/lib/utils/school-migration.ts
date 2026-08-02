import type { FrameConfig, PlacedTile, SectionId } from "@/lib/types";
import { sectionSupportsText } from "@/lib/utils/sections";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { SCHOOL_DEFAULT_SECTIONS } from "@/lib/constants/defaults";
import { wingRowCount, wingSlotIndex } from "@/lib/utils/slot-generator";

/**
 * Where a slot id sits WITHIN ITS OWN ZONE, as a band and a pair of offsets, or
 * null if the id is not one this config generates.
 *
 * Zones are flat index spaces, and most of them WRAP: a bottom index is
 * `row * bottomSlots + col`, a wing index is `col * wingRows + row`. So the same
 * integer names a different cell the moment the wrap width changes, and THAT —
 * not the absolute grid position — is what "the id moved" has to mean. Comparing
 * absolute (row, col) instead would call a wing-WIDTH change a relocation of the
 * whole top rail, which it plainly is not: every cell shifted right by two
 * columns, and `frame:top-0` is still the first cell of the top rail.
 *
 * The wing needs one more step. Its rows are BANDED — an optional top corner, the
 * side rows, then the bottom row(s) — so a change in `leftSlots` re-bands indices
 * without changing the row count's effect on the modulo. Under the window change
 * a wing index of 7 went from "second bottom row" to "the bottom rail" while
 * staying `7 % 9 === 7 % 8`… only by coincidence. Resolving the band explicitly is
 * what catches it.
 */
type ZoneCell = { zone: string; band: "top" | "side" | "bottom"; a: number; b: number };

function zoneCell(slotId: string, config: FrameConfig): ZoneCell | null {
  const m = /^frame:(top|bottom|left|right|wing-left|wing-right)-(\d+)$/.exec(slotId);
  if (!m) return null;
  const zone = m[1];
  const i = Number(m[2]);
  switch (zone) {
    case "top":
      // Never wraps: index i is the i-th cell of the top rail, always.
      return i < config.topSlots ? { zone, band: "top", a: 0, b: i } : null;
    case "left":
    case "right": {
      const n = zone === "left" ? config.leftSlots : config.rightSlots;
      return i < n ? { zone, band: "side", a: i, b: 0 } : null;
    }
    case "bottom": {
      const rows = Math.max(1, config.bottomRows ?? 1);
      if (i >= config.bottomSlots * rows) return null;
      // (which bottom row, which cell along it)
      return {
        zone,
        band: "bottom",
        a: Math.floor(i / config.bottomSlots),
        b: i % config.bottomSlots,
      };
    }
    default: {
      const rows = wingRowCount(config);
      const cols = config.wings ? config.wingColumns : 0;
      if (rows <= 0 || i >= rows * cols) return null;
      const col = Math.floor(i / rows); // 0 = adjacent to the inner frame
      const row = i % rows;
      const topRows = config.fullWidthTopBar ? 1 : 0;
      if (row < topRows) return { zone, band: "top", a: 0, b: col };
      const side = row - topRows;
      if (side < config.leftSlots) return { zone, band: "side", a: side, b: col };
      return { zone, band: "bottom", a: side - config.leftSlots, b: col };
    }
  }
}

/**
 * Drop tiles whose slot id no longer denotes the CELL it was placed on.
 *
 * A slot id is `frame:<zone>-<index>`, and an index only names a cell relative to
 * the config that generated it. When the frame's lattice changes, the same id can
 * quietly point somewhere else: opening the plate window to 12 x 6 took the bottom
 * rail from 12 cells to 14, so `frame:bottom-12` went from "first cell of the
 * second bottom row" to "thirteenth cell of the first" — the tile would reappear
 * halfway along the banner, on the opposite axis, with no cause the user could see.
 * The same change took the wing from 8 rows to 9, which re-bands every wing index.
 *
 * The rule is the one the wing trim already used: a tile that cannot be proven to
 * be in the same place is DROPPED, never relocated. Sliding art onto a cell the
 * user never chose is worse than an empty pocket, because an empty pocket prints
 * nothing and reads as part of the frame. Banner text, colours and the school's
 * branding live in `sections` and are untouched by any of this — what a returning
 * user loses is badge PLACEMENT, which one tap of a preset restores.
 *
 * Belongs in `merge`, not `migrate`: zustand runs migrate only when the stored
 * version is BELOW the current one, so a blob saved after the last version bump —
 * which is every blob this is written for — would never see it.
 *
 * Returns the SAME object when nothing moved, so an ordinary hydrate does no work.
 */
export function dropRelocatedSlots(
  slots: Record<string, PlacedTile>,
  /** The geometry the blob was SAVED against (its own persisted `frameConfig`). */
  oldConfig: FrameConfig | null | undefined,
  /** The geometry it is being hydrated into. */
  newConfig: FrameConfig,
): Record<string, PlacedTile> {
  // No usable record of the old shape means no proof anything moved. Leave it be:
  // a stale id that names no cell at all is already inert everywhere downstream.
  if (
    !oldConfig ||
    typeof oldConfig.topSlots !== "number" ||
    typeof oldConfig.leftSlots !== "number" ||
    typeof oldConfig.bottomSlots !== "number"
  ) {
    return slots;
  }
  let changed = false;
  const kept: Record<string, PlacedTile> = {};
  for (const [id, tile] of Object.entries(slots)) {
    const was = zoneCell(id, oldConfig);
    const now = zoneCell(id, newConfig);
    // Not a frame slot id at all (nothing to reason about), or it named the same
    // cell of the same zone before and after.
    if (!was || (now && was.band === now.band && was.a === now.a && was.b === now.b)) {
      kept[id] = tile;
      continue;
    }
    changed = true; // re-banded, or the cell it named no longer exists
  }
  return changed ? kept : slots;
}

/**
 * SCHOOL BUILDER persist migration (the `migrateExtra` hook on createDesignStore).
 *
 * The school frame trimmed its wings from 3 tile columns per side to 1 so the frame
 * fits the eufyMake E1's 16.5" x 13" bed (see SCHOOL_FRAME_CONFIG). A returning user
 * has a blob describing the OLD frame, and it is wrong in two ways:
 *
 *  1. It carries tiles in wing slots for columns that no longer exist. Wing ids are
 *     flat: `col * wingRows + row`, with col 0 ADJACENT to the inner frame and later
 *     columns marching outward. So the surviving cells are exactly the low indices —
 *     `index < wingColumns * wingRows` — and the outer ones are dropped.
 *
 *     Dropping is the correct answer, not compacting. Those tiles were placed on a
 *     physical column of the frame that no longer gets printed; sliding them inward
 *     would silently overwrite art the user deliberately put on the surviving column.
 *     What you see after the upgrade is what will print.
 *
 *  2. Its `frameConfig` is the stale 3-column geometry. Persisted state wins over the
 *     store's defaults on hydrate, so without refreshing it a returning user would
 *     keep an unprintable frame forever — including in the saved-design/order payload.
 */
export function migrateSchoolDesign(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== "object") return persisted;
  const blob = persisted as Record<string, unknown>;

  const next: Record<string, unknown> = { ...blob };

  // (2) Always refresh the frame. The school builder is not a frame the user
  // configures — it is one product with one printable geometry.
  next.frameConfig = { ...SCHOOL_FRAME_CONFIG };

  // Image mode is RETIRED: uploaded art is now a snappet in a tiles panel, not a
  // whole-panel section overlay. A returning user's blob may still carry a section
  // in the old `mode: "image"`, whose overlay no longer renders — leaving a dead,
  // tile-suppressed blank panel. Convert those back to tiles so the panel's tiles
  // reappear (the old preview image is dropped; it lived only in the overlay).
  const sections = blob.sections;
  const nextSections: Record<string, unknown> =
    sections && typeof sections === "object" ? {} : {};
  if (sections && typeof sections === "object") {
    for (const [id, sec] of Object.entries(sections as Record<string, unknown>)) {
      const mode = sec && typeof sec === "object" ? (sec as { mode?: unknown }).mode : undefined;
      // Retired IMAGE mode -> tiles (uploaded art is a snappet now).
      //
      // Also TEXT on a SIDE panel -> tiles. Text bars were once allowed on every
      // panel; they are now a top/bottom affordance only, so the toggle no longer
      // renders for the wings. A design saved before that change still has a wing in
      // text mode, and the renderer still honours it — which strands the user with a
      // text panel and no control anywhere to switch it back. `sectionSupportsText`
      // is the single source of truth for which panels may hold text.
      if (mode === "image" || (mode === "text" && !sectionSupportsText(id as SectionId))) {
        nextSections[id] = { mode: "tiles" };
      } else {
        nextSections[id] = sec;
      }
    }
  }
  // Top/bottom now DEFAULT to text banners (SCHOOL_DEFAULT_SECTIONS). A user who
  // predates that default has no entry for them at all, and initial state loses to
  // persistence — so without this they would keep the old tiles-everywhere frame
  // forever and never see the feature.
  //
  // Seed ONLY a genuinely ABSENT key. Choosing tiles writes an explicit
  // `mode: "tiles"`, so anyone who made that choice has a key here and keeps it:
  // this restores a default, it never overrides a decision.
  for (const [id, seed] of Object.entries(SCHOOL_DEFAULT_SECTIONS)) {
    if (!(id in nextSections)) nextSections[id] = structuredClone(seed);
  }
  next.sections = nextSections;

  const slots = blob.slots;
  if (!slots || typeof slots !== "object") return next;

  const oldConfig = blob.frameConfig as Partial<FrameConfig> | undefined;
  const newRows = wingRowCount(SCHOOL_FRAME_CONFIG);
  // A flat index only means the same CELL if the wing's row count is unchanged. It is
  // (the trim touched columns only), but if a future migration ever changes the row
  // banding, remapping by index would silently relocate the user's art — so in that
  // case drop every wing tile rather than move it somewhere it was never placed.
  const rowsUnchanged =
    typeof oldConfig?.leftSlots === "number" &&
    wingRowCount(oldConfig as FrameConfig) === newRows;
  const maxWingIndex = rowsUnchanged ? SCHOOL_FRAME_CONFIG.wingColumns * newRows : 0;

  const kept: Record<string, PlacedTile> = {};
  for (const [id, tile] of Object.entries(slots as Record<string, PlacedTile>)) {
    const wingIdx = wingSlotIndex(id);
    if (wingIdx !== null && wingIdx >= maxWingIndex) continue; // column no longer exists
    kept[id] = tile;
  }
  next.slots = kept;

  return next;
}
