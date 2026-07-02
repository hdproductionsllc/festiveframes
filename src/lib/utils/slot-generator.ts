import type { FrameConfig, FrameSlot, SlotZone } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";

function makeSlotId(zone: SlotZone, index: number): string {
  return `frame:${zone}-${index}`;
}

/**
 * Generate all frame slots.
 *
 * The inner frame (top rail, left/right rails, corners) is always positioned
 * using config.widthInches. When wings are active, the container is wider and
 * the inner frame is offset rightward by the wing width. Wing tiles fill the
 * side panels outside the inner frame.
 */
export function generateSlots(
  config: FrameConfig,
  containerWidth: number
): FrameSlot[] {
  const totalWidthInches = getTotalWidthInches(config);
  const scale = containerWidth / totalWidthInches;
  const tileSize = config.tileSizeInches * scale;
  // Flag-gated school geometry — both are no-ops when unset (as on /build): a
  // full-width top rail (fills the wing top corners) and extra bottom rows (the
  // frame grows DOWNWARD by one tile per extra row, base rows stay put).
  const extraBottomRows = Math.max(0, (config.bottomRows ?? 1) - 1);
  const fullWidthTop = config.fullWidthTopBar === true;
  const baseHeightPx = config.heightInches * scale; // original inner-frame height
  const containerHeight = baseHeightPx + extraBottomRows * tileSize; // render height
  const hasWings = config.wings && config.wingColumns > 0;
  const wingOffset = hasWings ? config.wingWidthInches * scale : 0;
  const innerWidth = config.widthInches * scale;

  const slots: FrameSlot[] = [];

  // ─── Top Rail ──────────────────────────────────────────
  // Tiles span inner frame edge-to-edge, offset by wing width
  const topStep = config.topSlots > 1
    ? (config.widthInches - config.tileSizeInches) / (config.topSlots - 1)
    : 0;

  for (let i = 0; i < config.topSlots; i++) {
    slots.push({
      id: makeSlotId("top", i),
      zone: "top",
      index: i,
      x: wingOffset + i * topStep * scale,
      y: 0,
      width: tileSize,
      height: tileSize,
    });
  }

  // ─── Side Rail Vertical Spacing ──────────────────────────
  const columnSpan = config.heightInches - config.tileSizeInches;
  // Base bottom row pinned to the ORIGINAL height, so side rails, the base bottom
  // row and the wing bottom never move when extra rows are added below.
  const bottomY = baseHeightPx - tileSize;

  // ─── Left Rail ─────────────────────────────────────────
  const leftColumnTotal = config.leftSlots + 2;
  const leftStep = columnSpan / (leftColumnTotal - 1);

  for (let i = 0; i < config.leftSlots; i++) {
    slots.push({
      id: makeSlotId("left", i),
      zone: "left",
      index: i,
      x: wingOffset, // inner frame left edge
      y: (i + 1) * leftStep * scale,
      width: tileSize,
      height: tileSize,
    });
  }

  // ─── Right Rail ────────────────────────────────────────
  const rightColumnTotal = config.rightSlots + 2;
  const rightStep = columnSpan / (rightColumnTotal - 1);

  for (let i = 0; i < config.rightSlots; i++) {
    slots.push({
      id: makeSlotId("right", i),
      zone: "right",
      index: i,
      x: wingOffset + innerWidth - tileSize, // inner frame right edge
      y: (i + 1) * rightStep * scale,
      width: tileSize,
      height: tileSize,
    });
  }

  // ─── Bottom Rail ───────────────────────────────────────
  // A full row of tiles, identical to the top rail (gapless, includes corners).
  const bottomStep = config.bottomSlots > 1
    ? (config.widthInches - config.tileSizeInches) / (config.bottomSlots - 1)
    : 0;

  for (let i = 0; i < config.bottomSlots; i++) {
    slots.push({
      id: makeSlotId("bottom", i),
      zone: "bottom",
      index: i,
      x: wingOffset + i * bottomStep * scale,
      y: bottomY,
      width: tileSize,
      height: tileSize,
    });
  }

  // ─── Extra Bottom Rows (flag-gated) ────────────────────
  // Additional full-inner-width bottom rows BELOW the base row. Appended to the
  // "bottom" zone at indices bottomSlots.. so the base indices 0..bottomSlots-1 are
  // untouched. No-op when extraBottomRows === 0 (the /build frame).
  for (let r = 1; r <= extraBottomRows; r++) {
    const y = bottomY + r * tileSize;
    for (let i = 0; i < config.bottomSlots; i++) {
      const index = r * config.bottomSlots + i;
      slots.push({
        id: makeSlotId("bottom", index),
        zone: "bottom",
        index,
        x: wingOffset + i * bottomStep * scale,
        y,
        width: tileSize,
        height: tileSize,
      });
    }
  }

  // ─── Wing Tiles ────────────────────────────────────────
  // Each wing has wingColumns tile columns × (leftSlots + 1) rows.
  // Rows match the left/right rail Y positions plus one at the bottom row.
  if (hasWings) {
    // Banded wing rows: an optional TOP corner (fullWidthTop), the side rows, then
    // the bottom row(s). With both flags off → topRows=0, bottomRowsCount=1, so
    // wingRows = leftSlots + 1 and every y matches the original literal exactly.
    const topRows = fullWidthTop ? 1 : 0;
    const bottomRowsCount = 1 + extraBottomRows;
    const wingRows = topRows + config.leftSlots + bottomRowsCount;

    const wingY = (row: number, sideSlots: number, sideStep: number): number => {
      if (row < topRows) return 0; // top corner (over the wing)
      const side = row - topRows;
      if (side < sideSlots) return (side + 1) * sideStep * scale; // side rows (unchanged)
      const b = side - sideSlots; // 0 = base bottom row, 1.. = extra bottom rows
      return bottomY + b * tileSize;
    };

    // Wing-left: fills from x=0 rightward, columns closest to inner frame first
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        slots.push({
          id: makeSlotId("wing-left", flatIndex),
          zone: "wing-left",
          index: flatIndex,
          x: wingOffset - (col + 1) * tileSize, // col 0 adjacent to inner frame
          y: wingY(row, config.leftSlots, leftStep),
          width: tileSize,
          height: tileSize,
        });
      }
    }

    // Wing-right: fills from inner frame right edge outward
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        slots.push({
          id: makeSlotId("wing-right", flatIndex),
          zone: "wing-right",
          index: flatIndex,
          x: wingOffset + innerWidth + col * tileSize,
          y: wingY(row, config.rightSlots, rightStep),
          width: tileSize,
          height: tileSize,
        });
      }
    }
  }

  return slots;
}

/**
 * Get the number of slots in a given zone.
 */
function getZoneSlotCount(config: FrameConfig, zone: SlotZone): number {
  // Flag-gated counts (default to the standard frame when unset).
  const extraBottomRows = Math.max(0, (config.bottomRows ?? 1) - 1);
  switch (zone) {
    case "top": return config.topSlots;
    case "bottom": return config.bottomSlots * (config.bottomRows ?? 1);
    case "left": return config.leftSlots;
    case "right": return config.rightSlots;
    case "wing-left":
    case "wing-right": {
      if (config.wingColumns <= 0) return 0;
      const topRows = config.fullWidthTopBar ? 1 : 0;
      const wingRows = topRows + config.leftSlots + 1 + extraBottomRows;
      return config.wingColumns * wingRows;
    }
  }
}

/**
 * Get slot IDs for a specific zone.
 */
export function getSlotIdsByZone(
  config: FrameConfig,
  zone: SlotZone
): string[] {
  const count = getZoneSlotCount(config, zone);
  return Array.from({ length: count }, (_, i) => makeSlotId(zone, i));
}

/**
 * Get all slot IDs from a config.
 */
export function getAllSlotIds(config: FrameConfig): string[] {
  return [
    ...getSlotIdsByZone(config, "top"),
    ...getSlotIdsByZone(config, "bottom"),
    ...getSlotIdsByZone(config, "left"),
    ...getSlotIdsByZone(config, "right"),
    ...getSlotIdsByZone(config, "wing-left"),
    ...getSlotIdsByZone(config, "wing-right"),
  ];
}
