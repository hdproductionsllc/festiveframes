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

  setActiveSet: (setId: string) => void;
  selectPiece: (pieceId: string | null) => void;
  clearSelection: () => void;
}

export const usePaletteStore = create<PaletteState>()((set) => ({
  activeSetId: getSeasonalSetId(),
  selectedPieceId: null,

  setActiveSet: (setId) => set({ activeSetId: setId }),

  selectPiece: (pieceId) => set({ selectedPieceId: pieceId }),

  clearSelection: () => set({ selectedPieceId: null }),
}));
