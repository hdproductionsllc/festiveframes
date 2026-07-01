import type { FrameConfig } from "@/lib/types";

// Gapless unit grid: 1 unit = the tile edge (0.982"). Per Bill's spec the
// perimeter is a 13 x 7 ring = 36 tiles: top & bottom rows of 13 (incl. the
// corners) plus 5 tiles down each side between them. Each side is an exact
// integer number of units so tiles butt edge-to-edge with clean corners.
//   width  = 13 units x 0.991 = 12.883"  (topStep resolves to exactly 1 tile)
//   height =  7 units x 0.991 =  6.937"  (1 top + 5 side + 1 bottom row)
// The 12x6 plate sits behind the ring; the frame overlaps the plate's margin.
export const DEFAULT_FRAME_CONFIG: FrameConfig = {
  widthInches: 12.883,
  heightInches: 6.937,
  tileSizeInches: 0.991,
  topSlots: 13,
  bottomSlots: 13,
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
 * SCHOOL / fundraising frame — the live builder's geometry with WIDE 3-tile side
 * panels (wings) flanking the plate. The school builder (`/lab/school`) seeds this
 * so the real drag-drop + text-bar editor + plate all work, just with big side
 * rails for the school's direct-print art. Everything else (the plate, the top/
 * bottom rails, text bars) is the standard frame.
 */
export const SCHOOL_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  DEFAULT_FRAME_CONFIG,
  3 * DEFAULT_FRAME_CONFIG.tileSizeInches,
);

/**
 * Total rendered width in inches (inner frame + both wings).
 */
export function getTotalWidthInches(config: FrameConfig): number {
  return config.widthInches + (config.wings ? config.wingWidthInches * 2 : 0);
}

// Bottom bar fonts — system fonts first (instant), then web fonts. Each font is
// tagged with a `category` so the picker can group them ("Classic", "Script",
// "Display"). Script faces are loaded from Google Fonts in builder-fonts.css.
export type BottomBarFontCategory = "Cartoon" | "Classic" | "Script" | "Display";

export const BOTTOM_BAR_FONTS: ReadonlyArray<{
  id: string;
  name: string;
  family: string;
  category: BottomBarFontCategory;
}> = [
  // ─── Classic ───────────────────────────────────────────────
  { id: "stars-stripes", name: "Stars & Stripes", family: "'Stars and Stripes', 'Bebas Neue', sans-serif", category: "Classic" },
  { id: "impact", name: "Impact", family: "Impact, 'Arial Black', sans-serif", category: "Classic" },
  { id: "arial-black", name: "Arial Black", family: "'Arial Black', 'Arial Bold', sans-serif", category: "Classic" },
  { id: "georgia", name: "Georgia", family: "Georgia, 'Times New Roman', serif", category: "Classic" },
  { id: "oswald", name: "Oswald", family: "'Oswald', sans-serif", category: "Classic" },
  { id: "bebas", name: "Bebas Neue", family: "'Bebas Neue', sans-serif", category: "Classic" },
  { id: "raleway", name: "Raleway", family: "'Raleway', sans-serif", category: "Classic" },
  { id: "teko", name: "Teko", family: "'Teko', sans-serif", category: "Classic" },

  // ─── Script / Cursive ──────────────────────────────────────
  { id: "great-vibes", name: "Great Vibes", family: "'Great Vibes', cursive", category: "Script" },
  { id: "allura", name: "Allura", family: "'Allura', cursive", category: "Script" },
  { id: "dancing-script", name: "Dancing Script", family: "'Dancing Script', cursive", category: "Script" },
  { id: "pacifico", name: "Pacifico", family: "'Pacifico', cursive", category: "Script" },
  { id: "satisfy", name: "Satisfy", family: "'Satisfy', cursive", category: "Script" },
  { id: "sacramento", name: "Sacramento", family: "'Sacramento', cursive", category: "Script" },
  { id: "yellowtail", name: "Yellowtail", family: "'Yellowtail', cursive", category: "Script" },
  { id: "kaushan-script", name: "Kaushan Script", family: "'Kaushan Script', cursive", category: "Script" },
  { id: "tangerine", name: "Tangerine", family: "'Tangerine', cursive", category: "Script" },

  // ─── Display ───────────────────────────────────────────────
  { id: "anton", name: "Anton", family: "'Anton', sans-serif", category: "Display" },
  { id: "russo", name: "Russo One", family: "'Russo One', sans-serif", category: "Display" },
  { id: "righteous", name: "Righteous", family: "'Righteous', sans-serif", category: "Display" },
  { id: "alfa-slab-one", name: "Alfa Slab One", family: "'Alfa Slab One', display, sans-serif", category: "Display" },
  { id: "black-ops-one", name: "Black Ops One", family: "'Black Ops One', display, sans-serif", category: "Display" },
  { id: "special-elite", name: "Special Elite", family: "'Special Elite', monospace", category: "Display" },
  { id: "permanent-marker", name: "Permanent Marker", family: "'Permanent Marker', cursive", category: "Display" },
  { id: "bungee", name: "Bungee", family: "'Bungee', display, sans-serif", category: "Display" },
  { id: "fredoka", name: "Fredoka", family: "'Fredoka', sans-serif", category: "Display" },

  // ─── Cartoon / Sticker (the brand style) ───────────────────
  // Luckiest Guy is the signature cartoon-sticker face — bold, fun, brand-defining.
  { id: "luckiest-guy", name: "Luckiest Guy (Sticker)", family: "'Luckiest Guy', cursive", category: "Cartoon" },
  { id: "cherry-bomb-one", name: "Cherry Bomb", family: "'Cherry Bomb One', cursive", category: "Cartoon" },
  { id: "lilita-one", name: "Lilita One", family: "'Lilita One', cursive", category: "Cartoon" },
  { id: "bangers", name: "Bangers", family: "'Bangers', cursive", category: "Cartoon" },
  { id: "titan-one", name: "Titan One", family: "'Titan One', cursive", category: "Cartoon" },
  { id: "baloo-2", name: "Baloo 2", family: "'Baloo 2', cursive", category: "Cartoon" },
  { id: "chewy", name: "Chewy", family: "'Chewy', cursive", category: "Cartoon" },
  { id: "bubblegum-sans", name: "Bubblegum Sans", family: "'Bubblegum Sans', cursive", category: "Cartoon" },
  { id: "sniglet", name: "Sniglet", family: "'Sniglet', cursive", category: "Cartoon" },
  { id: "paytone-one", name: "Paytone One", family: "'Paytone One', sans-serif", category: "Cartoon" },
  { id: "shrikhand", name: "Shrikhand", family: "'Shrikhand', cursive", category: "Cartoon" },

  // ─── More Classic (clean design workhorses) ────────────────
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif", category: "Classic" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif", category: "Classic" },
  { id: "archivo-black", name: "Archivo Black", family: "'Archivo Black', sans-serif", category: "Classic" },
  { id: "playfair-display", name: "Playfair Display", family: "'Playfair Display', serif", category: "Classic" },

  // ─── More Display ──────────────────────────────────────────
  { id: "abril-fatface", name: "Abril Fatface", family: "'Abril Fatface', display, serif", category: "Display" },
  { id: "lobster", name: "Lobster", family: "'Lobster', display, cursive", category: "Display" },
  { id: "staatliches", name: "Staatliches", family: "'Staatliches', display, sans-serif", category: "Display" },
  { id: "passion-one", name: "Passion One", family: "'Passion One', display, sans-serif", category: "Display" },
  { id: "ultra", name: "Ultra", family: "'Ultra', display, serif", category: "Display" },
  { id: "bowlby-one", name: "Bowlby One", family: "'Bowlby One', display, sans-serif", category: "Display" },
  { id: "concert-one", name: "Concert One", family: "'Concert One', display, sans-serif", category: "Display" },

  // ─── More Script / Festive ─────────────────────────────────
  { id: "lobster-two", name: "Lobster Two", family: "'Lobster Two', cursive", category: "Script" },
  { id: "cookie", name: "Cookie", family: "'Cookie', cursive", category: "Script" },
  { id: "courgette", name: "Courgette", family: "'Courgette', cursive", category: "Script" },
  { id: "marck-script", name: "Marck Script", family: "'Marck Script', cursive", category: "Script" },
  { id: "damion", name: "Damion", family: "'Damion', cursive", category: "Script" },
];

// Pricing
export const FRAME_BASE_PRICE = 24.99;

// Max undo/redo history depth
export const MAX_HISTORY_DEPTH = 50;

// Bottom bar text constraints. The banner auto-fits (shrinks the font to fit the
// width), so the cap is really a readability floor on a ~1"-tall banner.
export const BOTTOM_BAR_MAX_CHARS = 40;
