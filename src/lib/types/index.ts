// ─── Tile System ────────────────────────────────────────────

export interface TileSet {
  id: string;
  name: string;
  icon: string; // representative emoji for set selector
  description: string;
  price: number;
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

export type SlotZone = "top" | "left" | "right" | "bottom-left" | "bottom-right" | "wing-left" | "wing-right";

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
  leftSlots: number;
  rightSlots: number;
  wings: boolean;
  wingWidthInches: number; // width of EACH wing extension (0 = standard frame)
  wingColumns: number; // tile columns per wing (auto-calculated from wingWidthInches)
  plateWidthInches: number;
  plateHeightInches: number;
}

// ─── Design State ───────────────────────────────────────────

export interface PlacedTile {
  pieceId: string;
  setId: string;
}

export interface BottomBarConfig {
  text: string;
  fontFamily: string;
  fontSize: number; // percentage of bar height (0.25–0.75), default 0.42
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

// ─── Tools ──────────────────────────────────────────────────

export type DesignTool = "paint" | "eraser";

// ─── Export ─────────────────────────────────────────────────

export type ExportState = "idle" | "exporting" | "done" | "error";
