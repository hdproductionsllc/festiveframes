// ─── Tile System ────────────────────────────────────────────

export type TileStyle = "emoji" | "photorealistic";

export interface TileSet {
  id: string;
  name: string;
  icon: string; // representative emoji for set selector
  description: string;
  price: number;
  style?: TileStyle; // defaults to "emoji" when omitted
  pieces: TilePiece[];
  presets: DesignPreset[];
}

export interface TilePiece {
  id: string; // e.g. "essentials:red", "july4th:flag"
  setId: string;
  name: string;
  artworkUrl: string; // empty = use emoji fallback
  emoji: string;
  backgroundColor: string; // hex color for fallback rendering
  textColor?: string; // for emoji contrast
  /** Natural footprint in grid cells for a MULTI-CELL snappet (2x2, 2x4, 11x2 …).
   *  Absent = 1x1, the standard tile — so every existing piece is untouched. */
  defaultSpan?: TileSpan;
}

/** A tile footprint measured in grid cells. Absent on a tile/piece means 1x1. */
export interface TileSpan {
  cols: number;
  rows: number;
}

// ─── Frame Layout ───────────────────────────────────────────

export type SlotZone = "top" | "left" | "right" | "bottom" | "wing-left" | "wing-right";

export interface FrameSlot {
  id: string; // e.g. "frame:top-0", "frame:left-2"
  zone: SlotZone;
  index: number;
  x: number; // pixel position (relative to frame)
  y: number;
  width: number;
  height: number;
  /** Grid coordinates. Zones are six disjoint flat index spaces, which cannot
   *  express a footprint that spans a zone boundary (a snappet covering the wing
   *  column AND the inner rail). (row, col) is the single coordinate space every
   *  zone maps into — DERIVED from the config on every layout, never persisted.
   *  The slot `id` remains the persistence key. See `buildGrid` in slot-generator. */
  row: number;
  col: number;
}

/** A cell address in the unified frame grid. */
export interface GridCoord {
  row: number;
  col: number;
}

export interface FrameConfig {
  widthInches: number;
  heightInches: number;
  tileSizeInches: number;
  topSlots: number;
  bottomSlots: number;
  leftSlots: number;
  rightSlots: number;
  wings: boolean;
  wingWidthInches: number; // width of EACH wing extension (0 = standard frame)
  wingColumns: number; // tile columns per wing (auto-calculated from wingWidthInches)
  plateWidthInches: number;
  plateHeightInches: number;
  /** Extend the top row ACROSS the wings (fill the top corners). Absent/false =
   *  inner-only top rail (the standard /build frame). School frame only. */
  fullWidthTopBar?: boolean;
  /** Total bottom rows (default 1). >1 adds full-width bottom rows BELOW the base
   *  one, growing the frame taller. Absent = 1 (the standard /build frame). */
  bottomRows?: number;
  /**
   * How far a multi-cell tile may hang PAST the frame's outer edge, in tile units.
   *
   * `canPlace` allows off-grid overhang by design, so that art has to be painted
   * somewhere. The canvas reserves this much gutter around the frame and clips to
   * it, which bounds the overhang inside the builder's own canvas area instead of
   * letting it escape over the surrounding app (and add page scroll). Absent/0 =
   * no gutter and no clip — the standard /build frame, byte-for-byte.
   */
  overhangTiles?: number;
}

// ─── Design State ───────────────────────────────────────────

export interface PlacedTile {
  pieceId: string;
  setId: string;
  /** Multi-cell footprint, anchored at THIS slot and growing right/down. Absent =
   *  1x1, so a design of ordinary tiles serializes exactly as it always has. The
   *  covered cells are DERIVED (see coveredBySnappets in utils/snappet), never
   *  stored — storing both would let them disagree after a geometry change. */
  span?: TileSpan;
  /**
   * UPLOADED customer art (school builder). Present = this snappet renders the
   * uploaded IMAGE (objectFit cover) instead of a set piece; the `pieceId`/`setId`
   * carry the reserved `"upload"` marker so every piece-keyed path still resolves.
   * `url` is the small (<=1200px) preview data URL that goes into the persisted
   * design; the print-resolution original lives in IndexedDB under `fullResId`.
   *
   * ABSENT = an ordinary set-piece tile — so /build, which never uploads art, is
   * untouched by construction (its tiles never carry this field). One system: art
   * enters as a snappet exactly like a set piece, and the size/drag/resize engine
   * (Stage 0-8) operates on it with no special-casing beyond this render branch.
   */
  image?: { url: string; fullResId?: string };
}

export interface BottomBarConfig {
  text: string;
  /** Optional SMALLER second-tier line under the headline (`text`). Bottom banner
   *  only — when set, the banner renders two tiers: a big headline + a smaller
   *  tagline. Absent = one big headline (backward-compatible; every other bar and
   *  /build never set it). */
  tagline?: string;
  fontFamily: string;
  fontSize: number; // auto-fit fill (0–1): 1 = fill the bar, lower scales down. Default 1.
  textColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  letterSpacing: number; // px
}

export interface QRCodeConfig {
  enabled: boolean;
  url: string;
  size: number; // px
}

// ─── Text Bar ───────────────────────────────────────────────
// The text bar is a draggable object placed on the top or bottom tile row.
// Its width auto-fits the text, snapped up to a whole number of tile units.

export type TextBarRow = "top" | "bottom";

export interface TextBarPlacement {
  row: TextBarRow;
  startIndex: number; // first covered slot index in that row
  widthUnits: number; // number of tile units the bar spans
}

/**
 * A text bar placed on the frame. Each one carries its own frozen content and
 * styling so multiple independent slogans can live on the same design.
 */
export interface PlacedTextBar extends TextBarPlacement {
  id: string;
  config: BottomBarConfig;
  qr: boolean; // whether the QR rides inside this bar
  /** True once the user sets the bar width by hand (the "Bar width" control). While
   *  set, text/font/QR edits keep this width instead of auto-remeasuring, and the
   *  font auto-fits to it. Absent = auto width (default, backward compatible). */
  manualWidth?: boolean;
}

/**
 * A live, drag-time preview of exactly where a banner will land on drop. It uses
 * the SAME placement math the store applies on commit, so the on-frame ghost
 * lines up precisely with the bar's real landing spot. `valid` is false when the
 * hovered row can't fit the banner (show a "can't drop" state, not a lie).
 */
export interface BannerPreview extends TextBarPlacement {
  valid: boolean;
  /** Background color of the dragged banner, for the translucent ghost fill. */
  backgroundColor: string;
}

// ─── Sections (school builder) ──────────────────────────────
// A "section" is a frame zone (a side panel, the top bar, the bottom banner) that
// can be TILED (achievement tiles) or turned into ONE direct-to-print piece — TEXT
// (school name / slogan) or an IMAGE (mascot / logo). School builder only; /build
// never sets `sections`, so every section branch no-ops there.

/** The four toggleable sections (map 1:1 to slot zones; `bottom` = all bottom rows). */
export type SectionId = "wing-left" | "wing-right" | "top" | "bottom";

export type SectionMode = "tiles" | "text" | "image";

export interface SectionState {
  mode: SectionMode;
  /** TEXT mode — reuses the banner config so it gets fonts/colors/align for free. */
  text?: BottomBarConfig;
  /** IMAGE mode — a SMALL (<=1200px) preview data URL for on-screen render. For an
   *  upload this is a downscaled proxy; the print-resolution original lives in
   *  IndexedDB under `fullResId` (never in the persisted blob — that's the quota
   *  fix). For a preset it's the asset path (`/school/...`). */
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  /** Set when the image came from a preset (vs an upload). */
  presetId?: string;
  /** IndexedDB key for the full-resolution cropped original (uploads only). Absent
   *  = today's behavior (preview-only / preset). Never carries the heavy bytes. */
  fullResId?: string;
}

export interface FrameDesign {
  id: string;
  name: string;
  slots: Record<string, PlacedTile>; // slotId -> PlacedTile
  bottomBar: BottomBarConfig;
  qrCode: QRCodeConfig;
  frameConfig: FrameConfig;
  createdAt: number;
  updatedAt: number;
}

// ─── Presets ────────────────────────────────────────────────

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  slots: Record<string, PlacedTile>;
  bottomBar?: Partial<BottomBarConfig>;
  thumbnail?: string;
}

// ─── Export ─────────────────────────────────────────────────

export type ExportState = "idle" | "exporting" | "done" | "error";
