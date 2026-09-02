import type { FrameConfig } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";
import { plateTopInches, rowTopInches } from "@/lib/utils/rows";

/**
 * Convert inches to pixels at a given container width.
 */
export function inchesToPixels(
  inches: number,
  config: FrameConfig,
  containerWidth: number
): number {
  return (inches / getTotalWidthInches(config)) * containerWidth;
}

/**
 * Scale factor: pixels per inch for the current container.
 */
export function getScale(config: FrameConfig, containerWidth: number): number {
  return containerWidth / getTotalWidthInches(config);
}

/**
 * Wing offset in pixels (0 when wings are off).
 */
export function getWingOffsetPx(config: FrameConfig, containerWidth: number): number {
  if (!config.wings || config.wingColumns <= 0) return 0;
  return config.wingWidthInches * getScale(config, containerWidth);
}

/**
 * Container height from width, preserving aspect ratio.
 */
export function getContainerHeight(
  config: FrameConfig,
  containerWidth: number
): number {
  const totalWidth = getTotalWidthInches(config);
  // Extra bottom rows grow the frame DOWNWARD (flag-gated; 0 on /build). The plate
  // stays put — getPlateArea centers off the BASE heightInches, not this render height.
  const extra = Math.max(0, (config.bottomRows ?? 1) - 1) * config.tileSizeInches;
  return ((config.heightInches + extra) / totalWidth) * containerWidth;
}

/**
 * License plate area — centered within the inner frame (not the wings).
 */
export function getPlateArea(
  config: FrameConfig,
  containerWidth: number
): { x: number; y: number; width: number; height: number } {
  const scale = getScale(config, containerWidth);
  const wingOffset = getWingOffsetPx(config, containerWidth);
  const innerWidth = config.widthInches * scale;
  const plateWidth = config.plateWidthInches * scale;
  const plateHeight = config.plateHeightInches * scale;

  // Horizontally centred in the inner frame. Vertically the plate sits where the
  // config REGISTERS it (utils/rows): centred in the base ring unless the config
  // states its top cover — the flush frame's plate top IS the frame's top.
  return {
    x: wingOffset + (innerWidth - plateWidth) / 2,
    y: plateTopInches(config) * scale,
    width: plateWidth,
    height: plateHeight,
  };
}

/**
 * Wing area bounds (for groove rendering). Returns null when wings are off.
 */
export function getWingArea(
  config: FrameConfig,
  side: "left" | "right",
  containerWidth: number
): { x: number; y: number; width: number; height: number } | null {
  if (!config.wings || config.wingColumns <= 0) return null;

  const scale = getScale(config, containerWidth);
  const containerHeight = getContainerHeight(config, containerWidth);
  const wingWidth = config.wingWidthInches * scale;
  const innerWidth = config.widthInches * scale;
  // From under the top bar (one tile on every frame but the flush one) to the
  // bottom of the frame, extra rows included.
  const top = rowTopInches(config, 1) * scale;

  return {
    x: side === "left" ? 0 : wingWidth + innerWidth,
    y: top,
    width: wingWidth,
    height: containerHeight - top,
  };
}
