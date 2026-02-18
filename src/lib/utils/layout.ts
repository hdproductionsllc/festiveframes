import type { FrameConfig } from "@/lib/types";
import { getTotalWidthInches } from "@/lib/constants/frame";

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
  return (config.heightInches / totalWidth) * containerWidth;
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

  const sideGap = (config.widthInches - config.plateWidthInches) / 2;

  return {
    x: wingOffset + (innerWidth - plateWidth) / 2,
    y: sideGap * scale,
    width: plateWidth,
    height: plateHeight,
  };
}

/**
 * Bottom bar area — spans between inner left and right rails (not into wings).
 */
export function getBottomBarArea(
  config: FrameConfig,
  containerWidth: number
): { x: number; y: number; width: number; height: number } {
  const scale = getScale(config, containerWidth);
  const tileSize = config.tileSizeInches * scale;
  const containerHeight = getContainerHeight(config, containerWidth);
  const wingOffset = getWingOffsetPx(config, containerWidth);

  const height = tileSize;
  const y = containerHeight - height;

  return {
    x: wingOffset + tileSize, // after wing + inner left rail tile
    y,
    width: config.widthInches * scale - tileSize * 2, // between inner rails
    height,
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
  const tileSize = config.tileSizeInches * scale;
  const containerHeight = getContainerHeight(config, containerWidth);
  const wingWidth = config.wingWidthInches * scale;
  const innerWidth = config.widthInches * scale;

  return {
    x: side === "left" ? 0 : wingWidth + innerWidth,
    y: tileSize, // starts below top rail
    width: wingWidth,
    height: containerHeight - tileSize,
  };
}
