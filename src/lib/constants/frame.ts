import type { FrameConfig } from "@/lib/types";

/** eufyMake E1 printable bed, inches. The school frame's output is rotated so its
 *  LONG axis lies along the bed's 16.5" side (it fits only in that orientation).
 *
 *  Lives HERE, in the types-only leaf, because two very different consumers need
 *  it: the print composer that lays panels onto the sheet, and /lab/fit's bench,
 *  which must not import the composer (it drags in qrcode and IndexedDB). A
 *  hardware fact with two homes is a hardware fact that will disagree with
 *  itself the day a second printer arrives. */
export const EUFY_BED_LONG_INCHES = 16.5;
export const EUFY_BED_SHORT_INCHES = 13;

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
 * SCHOOL / fundraising frame — TODAY'S geometry, kept for reference and revert.
 *
 * A 12-unit inner frame with one wing column per side: 14 columns x 8 rows of
 * material, 13.874" x 7.928" overall. Its plate WINDOW is only 10 x 5 cells
 * (9.910" x 4.955"), because the side panels are two structural columns wide and
 * the bottom is two structural rows tall. Against a 12" x 6" plate that is 1.045"
 * of frame lying on the plate face down each side and 0.52" / 1.46" top and
 * bottom — the "panels print too fat" report, and the reason the frame reads as
 * heavier than any frame you can buy.
 *
 * NOT wired to anything. `SCHOOL_FRAME_CONFIG` below is the live one. To revert
 * the window change, make that export equal this one.
 */
export const SCHOOL_CLASSIC_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  {
    ...DEFAULT_FRAME_CONFIG,
    topSlots: 12,
    bottomSlots: 12,
    widthInches: 12 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 11.892"
    minTileSpan: { cols: 2, rows: 2 },
    fullWidthTopBar: true,
    bottomRows: 2,
    overhangTiles: 1,
  },
  1 * DEFAULT_FRAME_CONFIG.tileSizeInches,
);

/**
 * SCHOOL / fundraising frame — THE RAIL MODEL. The live builder.
 *
 * The frame is a RAIL: ONE tile of structure all the way round a window the size
 * of the plate. Bill 3D-prints that rail in black; everything we print is a
 * SNAP-IN that clips onto it. A snap-in bigger than one cell registers to a rail
 * cell and CANTILEVERS OUTBOARD — out over air, away from the plate — which is
 * how a 2x2 badge lives on a one-tile rail.
 *
 * That single fact is what fixes the window. The old geometry widened the
 * structure to hold the badge, so a 2x2 side panel ate two columns of frame and
 * the opening shrank to 10 x 5. Here the badge's second column is air, so the
 * structure stays one tile and the opening opens back up to the full 12 x 6.
 *
 * The grid below IS the printed extent, cantilever included, which is why it needs
 * no special cases anywhere in the placement engine — the outer ring of cells is
 * simply the overhang, and a 2x2 anchored at column 0 covers [cantilever, rail]
 * exactly as it always covered [wing, rail]:
 *
 *   col   0        1        2 .. 13        14       15
 *         air      RAIL     WINDOW         RAIL     air
 *   row   0        RAIL (top, no cantilever — nothing hangs above the plate)
 *         1..6     WINDOW
 *         7        RAIL (bottom)
 *         8        air  (the bottom banner's second row hangs here)
 *
 *   window            12 x 6 cells = 11.892" x 5.946"  (the plate, near enough)
 *   needs FLAT SURFACE  13.874" x 7.928"   — cols 1..14, rows 0..7: the rail
 *   needs AIR           15.856" x 8.919"   — the whole printed extent
 *
 * The surface figure is unchanged from the classic frame above; only the air
 * figure grows, and only where a car has room. That distinction is the whole
 * point of the quarter test in the fit spec.
 */
export const SCHOOL_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  {
    ...DEFAULT_FRAME_CONFIG,
    // 14 inner columns: rail + 12 of window + rail. The wings added below are the
    // side CANTILEVER, not structure.
    topSlots: 14,
    bottomSlots: 14,
    // 14 gapless tiles = 13.874", NOT 14 x a flat inch. The grid invariant in
    // slot-generator requires widthInches === tileSizeInches * topSlots exactly, or
    // the rail steps drift and every (row, col) below is a lie.
    widthInches: 14 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 13.874"
    // 6 window rows between the top and bottom rails — the plate's 6" of height.
    leftSlots: 6,
    rightSlots: 6,
    heightInches: 8 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 7.928"
    // Every badge on this frame is at least 2x2. One 0.991in cell is unreadable for
    // artwork and a thumbnail for a photo.
    minTileSpan: { cols: 2, rows: 2 },
    // Top rail spans the full width (over the wings), and the bottom banner is two
    // rows: the bottom rail plus one row of cantilever hanging below it.
    fullWidthTopBar: true,
    bottomRows: 2,
    // A snappet may still hang past the outer edge while being dragged; one tile of
    // bleed is the room the canvas reserves for that (see FrameConfig.overhangTiles).
    overhangTiles: 1,
  },
  // One column per side — the side CANTILEVER.
  1 * DEFAULT_FRAME_CONFIG.tileSizeInches,
);

/**
 * SCHOOL SLIM — the HALF-cantilever variant, and a FORK at /lab/slim. The live
 * frame above is untouched.
 *
 * Same rail, same 12 x 6 window, same side cantilever. The one change is that
 * NOTHING hangs below the bottom rail: the bottom banner is the rail row and
 * stops there. Cantilever is the thing that has to clear air, and air below a
 * plate is the scarcest kind there is — a bumper valance, a step, a tow eye, a
 * bike rack. The sides keep theirs because the space beside a plate is usually
 * open, and it is where the badges live.
 *
 *   FULL (live)   needs air 15.856" x 8.919"   sides 1.928", top 0.964", bottom 1.955"
 *   HALF (this)   needs air 15.856" x 7.928"   sides 1.928", top and bottom 0.964"
 *
 * Both need the same 13.874" x 7.928" of flat SURFACE, because the rail did not
 * move. HALF simply stops asking for two inches of clear air under the plate.
 *
 * Losing the second bottom row loses the line the class year lived on, so it moves
 * into the KEYSTONE — a centre section of the bar protruding UP into the plate
 * opening, which is what every commercial frame does when it needs a second line.
 * It grows inward over the plate face, so it costs nothing in fitment.
 * See lib/utils/bottom-tab.ts.
 */
export const SCHOOL_SLIM_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  {
    ...DEFAULT_FRAME_CONFIG,
    topSlots: 14,
    bottomSlots: 14,
    widthInches: 14 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 13.874"
    leftSlots: 6,
    rightSlots: 6,
    heightInches: 8 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 7.928"
    minTileSpan: { cols: 2, rows: 2 },
    fullWidthTopBar: true,
    // THE CHANGE. No bottom cantilever, and the tagline moves into the tab.
    bottomRows: 1,
    // The bar itself overlaps the plate by only 0.027" (the rail sits on the
    // plate's edge, not across its face), so the tab is doing all the work: it
    // covers 0.820" up from the plate's bottom edge at the centre. That is the
    // number to check against a real plate, since some states print a motto or a
    // date line down there — on the Missouri bicentennial plate the "1821 ★ 2021"
    // line sits about 1.08" up, so this clears it.
    //
    // Stated in TILES, like everything else on this frame. It was 6.2" / 5" flat,
    // which is a hair off the lattice and would have put the one part Bill prints
    // as a single body on a different grid from the parts that clip into it.
    bottomTab: {
      riseInches: 0.8 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 0.793"
      baseInches: 7 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 6.937" — seven banner cells
      topInches: 6 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 5.946" — six
      // Softened top corners. The hard mitre read as a road sign; a radius makes it
      // a moulded part, which is what everything else on this frame already is.
      // The BASE corners stay sharp — they are where the tab meets the bar.
      cornerRadiusInches: 0.25 * DEFAULT_FRAME_CONFIG.tileSizeInches, // 0.248"
    },
    overhangTiles: 1,
  },
  1 * DEFAULT_FRAME_CONFIG.tileSizeInches,
);

// ─── THE JULY REBASE — staged, NOT wired, now CONFIRMED BY BILL'S PARTS ──────
//
// OWNER-ESTABLISHED GROUND TRUTH (2026-08-02): nothing newer than the July 4
// builder ever completed the loop from design tool to physical part, and Bill
// had to STRETCH school exports in eufyMake. Then Bill texted his actual part
// dimensions (2026-08-02, final printed dims within +/-0.015"):
//
//   Side panel    8 x 2      Top runner    11 x 1      Bottom    11 x 2
//
// Those three numbers close the case. His system is on a 1.000" GRID — flat
// inches, not our 0.991" pitch — and his frame is the JULY SHAPE (13-slot inner
// ring, one wing column per side, two bottom rows). The July-shaped config at
// tileSizeInches 1.000 reproduces his parts EXACTLY through panelSizeInches:
// side 2.000 x 8.000, top 11.000 x 1.000, bottom 11.000 x 2.000. Window when
// assembled: 11 x 5 INCHES, overlapping a 12 x 6 plate 0.5" on every side —
// which also answers the dressed-window question outright.
//
// WHY JULY WORKED AND SCHOOL PANELS DIDN'T, same 0.991 files both times:
// a single tile at 0.991 in a 1.000 window is 0.009 of slack — invisible, so
// the per-tile July build sat flush. A PANEL accumulates the error: 10 cells at
// 0.991 is 9.910 on an 11.000 sled, and our classic top panel was also a cell
// SHORT (10 cells vs his 11" runner) — +11% stretch on the long axis, which is
// exactly what Bill was doing in eufyMake. Pitch error is invisible per-tile
// and fatal per-panel. That is the whole story of the stretch.
//
//   BILL'S SYSTEM  15 x 8 cells at 1.000" = 15" x 8"   rail 13 x 7   window 11 x 5
//   FULL (below)   = that, exactly                     bed: 15.0 <= 16.5 rotated
//   SLIM (below)   = same minus the second bottom row  -> 15 x 7
//
// Flip = point SCHOOL_FRAME_CONFIG / SCHOOL_SLIM_FRAME_CONFIG at these. At flip
// time: preset stacks become [2,2,2,2] (8-row side) and [2,3,2] (7), the
// dropRelocatedSlots migration already handles saved designs, and /build's
// DEFAULT_FRAME_CONFIG stays at 0.991 — its per-tile product is verified as-is.
// Remaining unknowns are Bill's to call, not ours to guess: he is actively
// re-sizing for car fit (his 8"-tall build failed a Honda Pilot; his next guess
// is 1.4 x 7 sides) and may shift the lower runner off-centre on the track.
// Nothing here chases a guess he has not committed to.
//
export const SCHOOL_JULY_SLIM_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  {
    ...DEFAULT_FRAME_CONFIG, // the July SHAPE: 13 slots, 5 side rows...
    tileSizeInches: 1, // ...on BILL'S 1.000" grid, per his measured parts
    widthInches: 13,
    heightInches: 7,
    minTileSpan: { cols: 2, rows: 2 },
    fullWidthTopBar: true,
    bottomRows: 1,
    overhangTiles: 1,
    bottomTab: {
      // The bar sits 0.5" up the plate face here, so 0.55" of rise reaches
      // 1.05" — just under Missouri's date line at ~1.08". Do not raise it
      // without re-checking that number.
      riseInches: 0.55,
      baseInches: 6,
      topInches: 5,
      cornerRadiusInches: 0.25,
    },
  },
  1,
);

export const SCHOOL_JULY_FULL_FRAME_CONFIG: FrameConfig = getWingFrameConfig(
  {
    ...DEFAULT_FRAME_CONFIG,
    tileSizeInches: 1,
    widthInches: 13,
    heightInches: 7,
    minTileSpan: { cols: 2, rows: 2 },
    fullWidthTopBar: true,
    bottomRows: 2, // Bill's current build: the 11 x 2 bottom runner
    overhangTiles: 1,
  },
  1,
);

/**
 * Total rendered width in inches (inner frame + both wings).
 */
export function getTotalWidthInches(config: FrameConfig): number {
  return config.widthInches + (config.wings ? config.wingWidthInches * 2 : 0);
}

/** Extra bottom rows beyond the base row (0 when `bottomRows` is unset/1). */
export function getExtraBottomRows(config: FrameConfig): number {
  return Math.max(0, (config.bottomRows ?? 1) - 1);
}

/** Rendered height in inches, INCLUDING any extra bottom rows (grows downward). */
export function getRenderHeightInches(config: FrameConfig): number {
  return config.heightInches + getExtraBottomRows(config) * config.tileSizeInches;
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

  // ─── Collegiate / Varsity (leads the SCHOOL builder) ───────
  // Graduate is the classic collegiate slab; the rest are athletic/condensed team
  // faces. Loaded in builder-fonts.css; surfaced first in the school picker via
  // SCHOOL_FONT_IDS below.
  { id: "graduate", name: "Graduate (Collegiate)", family: "'Graduate', 'Rockwell', serif", category: "Display" },
  { id: "fjalla-one", name: "Fjalla One", family: "'Fjalla One', 'Oswald', sans-serif", category: "Classic" },
  { id: "big-shoulders", name: "Big Shoulders", family: "'Big Shoulders Display', 'Oswald', sans-serif", category: "Display" },
  { id: "saira-condensed", name: "Saira Condensed", family: "'Saira Condensed', 'Oswald', sans-serif", category: "Classic" },
  { id: "squada-one", name: "Squada One", family: "'Squada One', 'Oswald', sans-serif", category: "Display" },
];

// ─── School builder: collegiate font curation ──────────────
// The school builder (`/lab/school`) leads with a COLLEGIATE stack — the athletic /
// varsity display faces already present in BOTTOM_BAR_FONTS — and de-emphasizes the
// cartoon-sticker faces that define the consumer brand. These ids are surfaced FIRST
// in the school font picker; the full list stays available below. /build is untouched:
// nothing here removes or reorders BOTTOM_BAR_FONTS.
export const SCHOOL_FONT_IDS: readonly string[] = [
  // Collegiate / varsity first — the school builder's signature look.
  "graduate",
  "fjalla-one",
  "big-shoulders",
  "saira-condensed",
  "squada-one",
  // Athletic block / condensed display faces (already present) round out the group.
  "anton",
  "alfa-slab-one",
  "oswald",
  "bebas",
  "teko",
  "staatliches",
  "russo",
  "passion-one",
  "archivo-black",
  "black-ops-one",
  "bungee",
  "bowlby-one",
  "ultra",
];

/** Default font family for a new school TEXT section — the collegiate slab (Graduate). */
export const SCHOOL_DEFAULT_FONT_FAMILY = "'Graduate', 'Rockwell', serif";

/** BOTTOM_BAR_FONTS split into collegiate-first order for the school picker. */
export const SCHOOL_COLLEGIATE_FONTS = BOTTOM_BAR_FONTS.filter((f) => SCHOOL_FONT_IDS.includes(f.id));
export const SCHOOL_OTHER_FONTS = BOTTOM_BAR_FONTS.filter((f) => !SCHOOL_FONT_IDS.includes(f.id));

// Pricing
export const FRAME_BASE_PRICE = 24.99;

// Max undo/redo history depth
export const MAX_HISTORY_DEPTH = 50;

// Bottom bar text constraints. The banner auto-fits (shrinks the font to fit the
// width), so the cap is really a readability floor on a ~1"-tall banner.
export const BOTTOM_BAR_MAX_CHARS = 40;
