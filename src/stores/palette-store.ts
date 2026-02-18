import { create } from "zustand";
import type { DesignTool } from "@/lib/types";
import { getSeasonalSetId } from "@/data/sets";

interface PaletteState {
  activeSetId: string;
  selectedPieceId: string | null;
  activeTool: DesignTool;

  setActiveSet: (setId: string) => void;
  selectPiece: (pieceId: string | null) => void;
  setTool: (tool: DesignTool) => void;
  clearSelection: () => void;
}

export const usePaletteStore = create<PaletteState>()((set) => ({
  activeSetId: getSeasonalSetId(),
  selectedPieceId: null,
  activeTool: "paint",

  setActiveSet: (setId) => set({ activeSetId: setId }),

  selectPiece: (pieceId) =>
    set({ selectedPieceId: pieceId, activeTool: "paint" }),

  setTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      selectedPieceId: tool === "paint" ? state.selectedPieceId : null,
    })),

  clearSelection: () => set({ selectedPieceId: null, activeTool: "paint" }),
}));
