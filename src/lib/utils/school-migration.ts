import type { FrameConfig, PlacedTile } from "@/lib/types";
import { SCHOOL_FRAME_CONFIG } from "@/lib/constants/frame";
import { wingRowCount, wingSlotIndex } from "@/lib/utils/slot-generator";

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
  if (sections && typeof sections === "object") {
    const nextSections: Record<string, unknown> = {};
    for (const [id, sec] of Object.entries(sections as Record<string, unknown>)) {
      if (sec && typeof sec === "object" && (sec as { mode?: unknown }).mode === "image") {
        nextSections[id] = { mode: "tiles" };
      } else {
        nextSections[id] = sec;
      }
    }
    next.sections = nextSections;
  }

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
