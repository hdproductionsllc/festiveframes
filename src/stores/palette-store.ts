import { create } from "zustand";
import { getSeasonalSetId } from "@/data/sets";

interface PaletteState {
  activeSetId: string;
  /**
   * The tile currently armed for tap-to-place. Tapping a palette tile selects
   * it; tapping a frame cell then drops it there. There is no separate paint /
   * eraser tool — placing is drag-or-tap, and removing is drag-a-placed-tile
   * off the frame (or tap-✕ on touch). One model, no modes.
   */
  selectedPieceId: string | null;

  /**
   * Whether the first-time "👆 now tap the frame" finger hint has already been
   * shown. We point a one-shot animated finger at the frame the very first time
   * a visitor arms a tile, then never again this session — so it teaches without
   * nagging. Session-scoped (not persisted) on purpose.
   */
  armHintSeen: boolean;

  setActiveSet: (setId: string) => void;
  selectPiece: (pieceId: string | null) => void;
  clearSelection: () => void;
  markArmHintSeen: () => void;
}

export const usePaletteStore = create<PaletteState>()((set) => ({
  activeSetId: getSeasonalSetId(),
  selectedPieceId: null,
  armHintSeen: false,

  setActiveSet: (setId) => set({ activeSetId: setId }),

  selectPiece: (pieceId) => set({ selectedPieceId: pieceId }),

  clearSelection: () => set({ selectedPieceId: null }),

  markArmHintSeen: () => set({ armHintSeen: true }),
}));
