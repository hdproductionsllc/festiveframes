import { create } from "zustand";
import type { ExportState } from "@/lib/types";

interface UIState {
  mobilePaletteOpen: boolean;
  soundEnabled: boolean;
  exportState: ExportState;

  toggleMobilePalette: () => void;
  setMobilePaletteOpen: (open: boolean) => void;
  toggleSound: () => void;
  setExportState: (state: ExportState) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobilePaletteOpen: false,
  soundEnabled: true,
  exportState: "idle",

  toggleMobilePalette: () =>
    set((state) => ({ mobilePaletteOpen: !state.mobilePaletteOpen })),

  setMobilePaletteOpen: (open) => set({ mobilePaletteOpen: open }),

  toggleSound: () =>
    set((state) => ({ soundEnabled: !state.soundEnabled })),

  setExportState: (exportState) => set({ exportState }),
}));
