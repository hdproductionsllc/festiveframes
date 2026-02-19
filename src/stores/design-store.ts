import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PlacedTile,
  BottomBarConfig,
  QRCodeConfig,
  FrameConfig,
  DesignPreset,
} from "@/lib/types";
import { DEFAULT_FRAME_CONFIG, getWingFrameConfig, getStandardConfig } from "@/lib/constants/frame";
import { DEFAULT_BOTTOM_BAR, DEFAULT_QR_CODE } from "@/lib/constants/defaults";
import { getAllSlotIds } from "@/lib/utils/slot-generator";
import { MAX_HISTORY_DEPTH } from "@/lib/constants/frame";

interface HistorySnapshot {
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  frameConfig: FrameConfig;
}

interface DesignState {
  // Design data
  designName: string;
  plateState: string; // state abbreviation, e.g. "CA"
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  qrCode: QRCodeConfig;
  frameConfig: FrameConfig;
  updatedAt: number;

  // History
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions — tiles
  placeTile: (slotId: string, pieceId: string, setId: string) => void;
  removeTile: (slotId: string) => void;
  fillAll: (pieceId: string, setId: string) => void;
  randomFill: (pieces: Array<{ pieceId: string; setId: string }>) => void;
  mirrorTopSlots: () => void;
  alternateSlots: (
    pieceA: { pieceId: string; setId: string },
    pieceB: { pieceId: string; setId: string }
  ) => void;
  clearAll: () => void;
  applyPreset: (preset: DesignPreset) => void;

  // Actions — bottom bar
  updateBottomBar: (updates: Partial<BottomBarConfig>) => void;

  // Actions — QR
  updateQRCode: (updates: Partial<QRCodeConfig>) => void;

  // Actions — appearance
  dieCut: boolean;
  toggleDieCut: () => void;
  toggleWings: () => void;
  setWingColumns: (columns: number) => void;

  // Actions — meta
  setDesignName: (name: string) => void;
  setPlateState: (abbr: string) => void;

  // Actions — history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function createSnapshot(state: {
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  frameConfig: FrameConfig;
}): HistorySnapshot {
  return {
    slots: { ...state.slots },
    bottomBar: { ...state.bottomBar },
    frameConfig: { ...state.frameConfig },
  };
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => {
      function pushHistory() {
        const state = get();
        const snapshot = createSnapshot(state);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(snapshot);
        if (newHistory.length > MAX_HISTORY_DEPTH) {
          newHistory.shift();
        }
        return { history: newHistory, historyIndex: newHistory.length - 1 };
      }

      return {
        // Initial state
        designName: "My Frame Design",
        plateState: "MO",
        slots: {},
        bottomBar: { ...DEFAULT_BOTTOM_BAR },
        qrCode: { ...DEFAULT_QR_CODE },
        frameConfig: { ...DEFAULT_FRAME_CONFIG },
        dieCut: true,
        updatedAt: Date.now(),
        history: [],
        historyIndex: -1,

        placeTile: (slotId, pieceId, setId) => {
          set((state) => ({
            ...pushHistory(),
            slots: { ...state.slots, [slotId]: { pieceId, setId } },
            updatedAt: Date.now(),
          }));
        },

        removeTile: (slotId) => {
          set((state) => {
            const newSlots = { ...state.slots };
            delete newSlots[slotId];
            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        fillAll: (pieceId, setId) => {
          set((state) => {
            const allIds = getAllSlotIds(state.frameConfig);
            const newSlots: Record<string, PlacedTile> = {};
            for (const id of allIds) {
              newSlots[id] = { pieceId, setId };
            }
            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        randomFill: (pieces) => {
          set((state) => {
            const allIds = getAllSlotIds(state.frameConfig);
            const newSlots: Record<string, PlacedTile> = {};
            for (const id of allIds) {
              const piece = pieces[Math.floor(Math.random() * pieces.length)];
              newSlots[id] = { pieceId: piece.pieceId, setId: piece.setId };
            }
            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        mirrorTopSlots: () => {
          set((state) => {
            const newSlots = { ...state.slots };
            const { topSlots, leftSlots, rightSlots, wings, wingColumns } = state.frameConfig;

            // Mirror top rail: left half → right half
            const topHalf = Math.floor(topSlots / 2);
            for (let i = 0; i < topHalf; i++) {
              const leftId = `frame:top-${i}`;
              const rightId = `frame:top-${topSlots - 1 - i}`;
              if (state.slots[leftId]) {
                newSlots[rightId] = { ...state.slots[leftId] };
              } else {
                delete newSlots[rightId];
              }
            }

            // Mirror left rail → right rail (same row index)
            const sideCount = Math.min(leftSlots, rightSlots);
            for (let i = 0; i < sideCount; i++) {
              const leftId = `frame:left-${i}`;
              const rightId = `frame:right-${i}`;
              if (state.slots[leftId]) {
                newSlots[rightId] = { ...state.slots[leftId] };
              } else {
                delete newSlots[rightId];
              }
            }

            // Mirror bottom-left → bottom-right
            const bl = state.slots["frame:bottom-left-0"];
            if (bl) {
              newSlots["frame:bottom-right-0"] = { ...bl };
            } else {
              delete newSlots["frame:bottom-right-0"];
            }

            // Mirror wing-left → wing-right (same flat index)
            if (wings && wingColumns > 0) {
              const wingRows = leftSlots + 1;
              const totalWingSlots = wingColumns * wingRows;
              for (let i = 0; i < totalWingSlots; i++) {
                const leftId = `frame:wing-left-${i}`;
                const rightId = `frame:wing-right-${i}`;
                if (state.slots[leftId]) {
                  newSlots[rightId] = { ...state.slots[leftId] };
                } else {
                  delete newSlots[rightId];
                }
              }
            }

            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        alternateSlots: (pieceA, pieceB) => {
          set((state) => {
            const allIds = getAllSlotIds(state.frameConfig);
            const newSlots: Record<string, PlacedTile> = {};
            for (let i = 0; i < allIds.length; i++) {
              const piece = i % 2 === 0 ? pieceA : pieceB;
              newSlots[allIds[i]] = { pieceId: piece.pieceId, setId: piece.setId };
            }
            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        clearAll: () => {
          set(() => ({
            ...pushHistory(),
            slots: {},
            updatedAt: Date.now(),
          }));
        },

        applyPreset: (preset) => {
          set((state) => ({
            ...pushHistory(),
            slots: { ...preset.slots },
            bottomBar: preset.bottomBar
              ? { ...state.bottomBar, ...preset.bottomBar }
              : state.bottomBar,
            updatedAt: Date.now(),
          }));
        },

        updateBottomBar: (updates) => {
          set((state) => ({
            ...pushHistory(),
            bottomBar: { ...state.bottomBar, ...updates },
            updatedAt: Date.now(),
          }));
        },

        updateQRCode: (updates) => {
          set((state) => ({
            qrCode: { ...state.qrCode, ...updates },
            updatedAt: Date.now(),
          }));
        },

        setDesignName: (name) => {
          set({ designName: name, updatedAt: Date.now() });
        },

        setPlateState: (abbr) => {
          set({ plateState: abbr, updatedAt: Date.now() });
        },

        toggleDieCut: () => {
          set((state) => ({ dieCut: !state.dieCut, updatedAt: Date.now() }));
        },

        toggleWings: () => {
          set((state) => {
            const newConfig = state.frameConfig.wings
              ? getStandardConfig(state.frameConfig)
              : getWingFrameConfig(state.frameConfig);

            // When disabling wings, remove tiles in now-invalid wing slots
            let newSlots = { ...state.slots };
            if (!newConfig.wings) {
              for (const key of Object.keys(newSlots)) {
                if (key.startsWith("frame:wing-left-") || key.startsWith("frame:wing-right-")) {
                  delete newSlots[key];
                }
              }
            }

            return {
              ...pushHistory(),
              frameConfig: newConfig,
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        setWingColumns: (columns: number) => {
          set((state) => {
            if (!state.frameConfig.wings) return state;
            const clamped = Math.max(1, Math.min(5, columns));
            const wingWidth = clamped * state.frameConfig.tileSizeInches;
            const newConfig = getWingFrameConfig(state.frameConfig, wingWidth);

            // Remove tiles in slots that no longer exist when shrinking
            let newSlots = { ...state.slots };
            if (clamped < state.frameConfig.wingColumns) {
              const wingRows = state.frameConfig.leftSlots + 1;
              const maxIndex = clamped * wingRows;
              for (const key of Object.keys(newSlots)) {
                if (key.startsWith("frame:wing-left-") || key.startsWith("frame:wing-right-")) {
                  const idx = parseInt(key.split("-").pop() || "0", 10);
                  if (idx >= maxIndex) delete newSlots[key];
                }
              }
            }

            return {
              ...pushHistory(),
              frameConfig: newConfig,
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        undo: () => {
          set((state) => {
            if (state.historyIndex < 0) return state;
            const snapshot = state.history[state.historyIndex];
            return {
              slots: { ...snapshot.slots },
              bottomBar: { ...snapshot.bottomBar },
              frameConfig: { ...snapshot.frameConfig },
              historyIndex: state.historyIndex - 1,
              updatedAt: Date.now(),
            };
          });
        },

        redo: () => {
          set((state) => {
            if (state.historyIndex >= state.history.length - 1) return state;
            const snapshot = state.history[state.historyIndex + 2];
            if (!snapshot) return state;
            return {
              slots: { ...snapshot.slots },
              bottomBar: { ...snapshot.bottomBar },
              frameConfig: { ...snapshot.frameConfig },
              historyIndex: state.historyIndex + 1,
              updatedAt: Date.now(),
            };
          });
        },

        canUndo: () => get().historyIndex >= 0,
        canRedo: () => get().historyIndex < get().history.length - 2,
      };
    },
    {
      name: "festive-frames-design",
      partialize: (state) => ({
        designName: state.designName,
        plateState: state.plateState,
        slots: state.slots,
        bottomBar: state.bottomBar,
        qrCode: state.qrCode,
        frameConfig: state.frameConfig,
        dieCut: state.dieCut,
        updatedAt: state.updatedAt,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) };
        // Migrate legacy configs without wing properties
        const fc = (merged as DesignState).frameConfig;
        if (fc && fc.wingWidthInches === undefined) {
          (merged as DesignState).frameConfig = {
            ...fc,
            wingWidthInches: 0,
            wingColumns: 0,
          };
        }
        return merged as DesignState;
      },
    }
  )
);
