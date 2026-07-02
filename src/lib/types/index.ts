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
}

// ─── Design State ───────────────────────────────────────────

export interface PlacedTile {
  pieceId: string;
  setId: string;
}

export interface BottomBarConfig {
  text: string;
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
  /** IMAGE mode — a client data URL (uploaded) OR a preset asset path (`/school/...`). */
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  /** Set when the image came from a preset (vs an upload). */
  presetId?: string;
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
