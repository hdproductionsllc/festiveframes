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
  const containerHeight = config.heightInches * scale;
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
  const bottomY = containerHeight - tileSize;

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

  // ─── Bottom Corners ──────────────────────────────────
  slots.push({
    id: makeSlotId("bottom-left", 0),
    zone: "bottom-left",
    index: 0,
    x: wingOffset,
    y: bottomY,
    width: tileSize,
    height: tileSize,
  });

  slots.push({
    id: makeSlotId("bottom-right", 0),
    zone: "bottom-right",
    index: 0,
    x: wingOffset + innerWidth - tileSize,
    y: bottomY,
    width: tileSize,
    height: tileSize,
  });

  // ─── Wing Tiles ────────────────────────────────────────
  // Each wing has wingColumns tile columns × (leftSlots + 1) rows.
  // Rows match the left/right rail Y positions plus one at the bottom row.
  if (hasWings) {
    const wingRows = config.leftSlots + 1; // side rows + bottom row

    // Wing-left: fills from x=0 rightward, columns closest to inner frame first
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        // Column 0 is adjacent to inner frame, col 1 further out
        const x = wingOffset - (col + 1) * tileSize;
        const y = row < config.leftSlots
          ? (row + 1) * leftStep * scale
          : bottomY;

        slots.push({
          id: makeSlotId("wing-left", flatIndex),
          zone: "wing-left",
          index: flatIndex,
          x,
          y,
          width: tileSize,
          height: tileSize,
        });
      }
    }

    // Wing-right: fills from inner frame right edge outward
    for (let col = 0; col < config.wingColumns; col++) {
      for (let row = 0; row < wingRows; row++) {
        const flatIndex = col * wingRows + row;
        // Column 0 is adjacent to inner frame, col 1 further out
        const x = wingOffset + innerWidth + col * tileSize;
        const y = row < config.rightSlots
          ? (row + 1) * rightStep * scale
          : bottomY;

        slots.push({
          id: makeSlotId("wing-right", flatIndex),
          zone: "wing-right",
          index: flatIndex,
          x,
          y,
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
  switch (zone) {
    case "top": return config.topSlots;
    case "left": return config.leftSlots;
    case "right": return config.rightSlots;
    case "bottom-left": return 1;
    case "bottom-right": return 1;
    case "wing-left":
    case "wing-right":
      return config.wingColumns > 0 ? config.wingColumns * (config.leftSlots + 1) : 0;
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
    ...getSlotIdsByZone(config, "left"),
    ...getSlotIdsByZone(config, "right"),
    ...getSlotIdsByZone(config, "bottom-left"),
    ...getSlotIdsByZone(config, "bottom-right"),
    ...getSlotIdsByZone(config, "wing-left"),
    ...getSlotIdsByZone(config, "wing-right"),
  ];
}
