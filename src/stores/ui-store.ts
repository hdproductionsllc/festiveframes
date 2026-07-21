import { create } from "zustand";
import type { ExportState } from "@/lib/types";

interface UIState {
  mobilePaletteOpen: boolean;
  soundEnabled: boolean;
  exportState: ExportState;
  /**
   * The placed snappet (multi-cell tile) currently SELECTED for resize, by anchor
   * slot id — or null. A selected snappet grows resize handles (school builder
   * only). Purely UI: a 1x1 tile is never selectable, so this stays null on /build
   * and nothing there reads it. */
  selectedSnappetSlotId: string | null;
  /**
   * A pending RE-CROP of an uploaded image-snappet, or null. Set when a resize drag
   * would change an image-snappet to a shape the photo does not match: rather than
   * silently cover-cropping the art with no resolution check, the resize is held here
   * so `SnappetRecropModal` can re-open the crop tool (with the print-DPI gate) at the
   * new footprint. Confirming there commits the resize + the re-cropped art in one
   * step; cancelling leaves the snappet at its current size. School builder only —
   * a 1x1 tile carries no image and never sets this, so /build never reads it. */
  recropRequest: { slotId: string; cols: number; rows: number } | null;

  toggleMobilePalette: () => void;
  setMobilePaletteOpen: (open: boolean) => void;
  toggleSound: () => void;
  setExportState: (state: ExportState) => void;
  /** Select a placed snappet for resize (null clears the selection). */
  selectSnappet: (slotId: string | null) => void;
  /** Ask for a re-crop of an image-snappet resized to a non-matching aspect. */
  requestRecrop: (slotId: string, cols: number, rows: number) => void;
  /** Dismiss the pending re-crop (confirmed or cancelled). */
  clearRecrop: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobilePaletteOpen: false,
  soundEnabled: true,
  exportState: "idle",
  selectedSnappetSlotId: null,
  recropRequest: null,

  toggleMobilePalette: () =>
    set((state) => ({ mobilePaletteOpen: !state.mobilePaletteOpen })),

  setMobilePaletteOpen: (open) => set({ mobilePaletteOpen: open }),

  toggleSound: () =>
    set((state) => ({ soundEnabled: !state.soundEnabled })),

  setExportState: (exportState) => set({ exportState }),

  selectSnappet: (selectedSnappetSlotId) => set({ selectedSnappetSlotId }),

  requestRecrop: (slotId, cols, rows) => set({ recropRequest: { slotId, cols, rows } }),

  clearRecrop: () => set({ recropRequest: null }),
}));
