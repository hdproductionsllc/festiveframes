import type { FrameConfig } from "@/lib/types";

export const DEFAULT_FRAME_CONFIG: FrameConfig = {
  widthInches: 13.5,
  heightInches: 7.5,
  tileSizeInches: 1.25,
  topSlots: 11,
  leftSlots: 5,
  rightSlots: 5,
  wings: false,
  wingWidthInches: 0,
  wingColumns: 0,
  plateWidthInches: 12,
  plateHeightInches: 6,
};

// Frame structural dimensions (inches)
export const FRAME_RAIL_WIDTH_INCHES = 0.75;
export const FRAME_BOTTOM_BAR_HEIGHT_INCHES = 1.0;

// Default (non-wings) aspect ratio. For dynamic ratio, compute from config directly.
export const FRAME_ASPECT_RATIO =
  DEFAULT_FRAME_CONFIG.widthInches / DEFAULT_FRAME_CONFIG.heightInches;

// ─── Wings ─────────────────────────────────────────────────
export const DEFAULT_WING_WIDTH_INCHES = 2.5; // fits 2 tile columns per side

/**
 * Build a wing-enabled config. The inner frame (widthInches, topSlots, etc.)
 * stays EXACTLY the same. Wings are side panels that attach to the left/right.
 */
export function getWingFrameConfig(
  base: FrameConfig,
  wingWidthInches: number = DEFAULT_WING_WIDTH_INCHES
): FrameConfig {
  const wingCols = Math.floor(wingWidthInches / base.tileSizeInches);
  const actualWingWidth = wingCols * base.tileSizeInches; // snap to tile grid
  return {
    ...base,
    wings: true,
    wingWidthInches: actualWingWidth,
    wingColumns: wingCols,
    // widthInches, topSlots, leftSlots, rightSlots — ALL UNCHANGED
  };
}

/**
 * Strip wings back to a standard config.
 */
export function getStandardConfig(config: FrameConfig): FrameConfig {
  return {
    ...config,
    wings: false,
    wingWidthInches: 0,
    wingColumns: 0,
  };
}

/**
 * Total rendered width in inches (inner frame + both wings).
 */
export function getTotalWidthInches(config: FrameConfig): number {
  return config.widthInches + (config.wings ? config.wingWidthInches * 2 : 0);
}

// Bottom bar fonts — system fonts first (instant), then lightweight Google Fonts
export const BOTTOM_BAR_FONTS = [
  { id: "impact", name: "Impact", family: "Impact, 'Arial Black', sans-serif" },
  { id: "arial-black", name: "Arial Black", family: "'Arial Black', 'Arial Bold', sans-serif" },
  { id: "georgia", name: "Georgia", family: "Georgia, 'Times New Roman', serif" },
  { id: "oswald", name: "Oswald", family: "'Oswald', sans-serif" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif" },
  { id: "anton", name: "Anton", family: "'Anton', sans-serif" },
  { id: "russo", name: "Russo One", family: "'Russo One', sans-serif" },
  { id: "raleway", name: "Raleway", family: "'Raleway', sans-serif" },
  { id: "righteous", name: "Righteous", family: "'Righteous', sans-serif" },
  { id: "teko", name: "Teko", family: "'Teko', sans-serif" },
] as const;

// Pricing
export const FRAME_BASE_PRICE = 24.99;

// Max undo/redo history depth
export const MAX_HISTORY_DEPTH = 50;

// Bottom bar text constraints
export const BOTTOM_BAR_MAX_CHARS = 26;
