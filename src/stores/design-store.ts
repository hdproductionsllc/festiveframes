import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PlacedTile,
  BottomBarConfig,
  QRCodeConfig,
  FrameConfig,
  DesignPreset,
  TextBarPlacement,
  TextBarRow,
  PlacedTextBar,
} from "@/lib/types";
import { DEFAULT_FRAME_CONFIG, getWingFrameConfig, getStandardConfig } from "@/lib/constants/frame";
import { DEFAULT_BOTTOM_BAR, DEFAULT_QR_CODE } from "@/lib/constants/defaults";
import { getAllSlotIds } from "@/lib/utils/slot-generator";
import {
  measureTextBarUnits,
  coveredSlotIds,
  clampStartIndex,
  rowLength,
} from "@/lib/utils/text-bar";
import { MAX_HISTORY_DEPTH } from "@/lib/constants/frame";

function makeTextBarId(existing: PlacedTextBar[]): string {
  return `tb-${Date.now().toString(36)}-${existing.length}`;
}

interface HistorySnapshot {
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig;
  frameConfig: FrameConfig;
  textBars: PlacedTextBar[];
}

interface DesignState {
  // Design data
  designName: string;
  plateState: string; // state abbreviation, e.g. "CA"
  slots: Record<string, PlacedTile>;
  bottomBar: BottomBarConfig; // draft for the NEXT text bar to be placed
  qrCode: QRCodeConfig;
  frameConfig: FrameConfig;
  textBars: PlacedTextBar[]; // bars placed on the frame
  selectedBarId: string | null; // bar currently being edited in the panel
  updatedAt: number;

  // History
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions — tiles
  placeTile: (slotId: string, pieceId: string, setId: string) => void;
  removeTile: (slotId: string) => void;
  fillAll: (pieceId: string, setId: string) => void;
  randomFill: (pieces: Array<{ pieceId: string; setId: string }>) => void;
  fillEmpty: (pieces: Array<{ pieceId: string; setId: string }>) => void;
  mirrorTopSlots: () => void;
  alternateSlots: (
    pieceA: { pieceId: string; setId: string },
    pieceB: { pieceId: string; setId: string }
  ) => void;
  clearAll: () => void;
  applyPreset: (preset: DesignPreset) => void;

  // Actions — bottom bar (the draft)
  updateBottomBar: (updates: Partial<BottomBarConfig>) => void;

  // Actions — text bars (draggable slogan bars)
  placeTextBar: (row: TextBarRow, startIndex: number) => void;
  moveTextBar: (id: string, row: TextBarRow, startIndex: number) => void;
  removeTextBar: (id: string) => void;
  selectBar: (id: string | null) => void;
  updateTextBar: (id: string, updates: Partial<BottomBarConfig>) => void;
  updateTextBarQr: (id: string, enabled: boolean) => void;

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
  textBars: PlacedTextBar[];
}): HistorySnapshot {
  return {
    slots: { ...state.slots },
    bottomBar: { ...state.bottomBar },
    frameConfig: { ...state.frameConfig },
    textBars: state.textBars.map((b) => ({ ...b, config: { ...b.config } })),
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
        textBars: [],
        selectedBarId: null,
        dieCut: false,
        updatedAt: Date.now(),
        history: [],
        historyIndex: -1,

        placeTile: (slotId, pieceId, setId) => {
          set((state) => {
            // Slots under a text bar are blocked.
            if (coveredSlotIds(state.textBars).includes(slotId)) return state;
            return {
              ...pushHistory(),
              slots: { ...state.slots, [slotId]: { pieceId, setId } },
              updatedAt: Date.now(),
            };
          });
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

        fillEmpty: (pieces) => {
          set((state) => {
            if (pieces.length === 0) return state;
            const newSlots = { ...state.slots };
            let changed = false;
            for (const id of getAllSlotIds(state.frameConfig)) {
              if (newSlots[id]) continue;
              const piece = pieces[Math.floor(Math.random() * pieces.length)];
              newSlots[id] = { pieceId: piece.pieceId, setId: piece.setId };
              changed = true;
            }
            if (!changed) return state;
            return { ...pushHistory(), slots: newSlots, updatedAt: Date.now() };
          });
        },

        mirrorTopSlots: () => {
          set((state) => {
            const newSlots = { ...state.slots };
            const { topSlots, bottomSlots, leftSlots, rightSlots, wings, wingColumns } = state.frameConfig;

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

            // Mirror bottom rail: left half → right half (same as top)
            const bottomHalf = Math.floor(bottomSlots / 2);
            for (let i = 0; i < bottomHalf; i++) {
              const leftId = `frame:bottom-${i}`;
              const rightId = `frame:bottom-${bottomSlots - 1 - i}`;
              if (state.slots[leftId]) {
                newSlots[rightId] = { ...state.slots[leftId] };
              } else {
                delete newSlots[rightId];
              }
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
            textBars: [],
            selectedBarId: null,
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

        placeTextBar: (row, startIndex) => {
          set((state) => {
            const maxUnits = rowLength(state.frameConfig, row);
            const config = { ...state.bottomBar };
            // QR on for the first bar only; additional bars start without it.
            const qr = state.textBars.length === 0 ? state.qrCode.enabled : false;
            const widthUnits = measureTextBarUnits(config, qr, maxUnits);
            // New bars land centered on the row (odd width + odd row = exact center).
            // `startIndex` (the drop point) only decides top vs bottom; drag to move.
            void startIndex;
            const start = clampStartIndex(Math.round((maxUnits - widthUnits) / 2), widthUnits, maxUnits);
            const bar: PlacedTextBar = {
              id: makeTextBarId(state.textBars),
              row,
              startIndex: start,
              widthUnits,
              config,
              qr,
            };
            // Tiles under the bar are kept (just hidden) so moving/removing the
            // bar never leaves a hole. The parts list excludes covered tiles.
            return {
              ...pushHistory(),
              textBars: [...state.textBars, bar],
              selectedBarId: bar.id,
              updatedAt: Date.now(),
            };
          });
        },

        moveTextBar: (id, row, startIndex) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            const maxUnits = rowLength(state.frameConfig, row);
            const start = clampStartIndex(startIndex, bar.widthUnits, maxUnits);
            const moved: PlacedTextBar = { ...bar, row, startIndex: start };
            return {
              ...pushHistory(),
              textBars: state.textBars.map((b) => (b.id === id ? moved : b)),
              updatedAt: Date.now(),
            };
          });
        },

        removeTextBar: (id) => {
          set((state) => ({
            ...pushHistory(),
            textBars: state.textBars.filter((b) => b.id !== id),
            selectedBarId: state.selectedBarId === id ? null : state.selectedBarId,
            updatedAt: Date.now(),
          }));
        },

        selectBar: (id) => {
          set({ selectedBarId: id });
        },

        updateTextBar: (id, updates) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            const config = { ...bar.config, ...updates };
            const maxUnits = rowLength(state.frameConfig, bar.row);
            const widthUnits = measureTextBarUnits(config, bar.qr, maxUnits);
            const startIndex = clampStartIndex(bar.startIndex, widthUnits, maxUnits);
            const updated: PlacedTextBar = { ...bar, config, widthUnits, startIndex };
            return {
              ...pushHistory(),
              textBars: state.textBars.map((b) => (b.id === id ? updated : b)),
              updatedAt: Date.now(),
            };
          });
        },

        updateTextBarQr: (id, enabled) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            const maxUnits = rowLength(state.frameConfig, bar.row);
            const widthUnits = measureTextBarUnits(bar.config, enabled, maxUnits);
            const startIndex = clampStartIndex(bar.startIndex, widthUnits, maxUnits);
            const updated: PlacedTextBar = { ...bar, qr: enabled, widthUnits, startIndex };
            return {
              ...pushHistory(),
              textBars: state.textBars.map((b) => (b.id === id ? updated : b)),
              updatedAt: Date.now(),
            };
          });
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
              textBars: snapshot.textBars.map((b) => ({ ...b, config: { ...b.config } })),
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
              textBars: snapshot.textBars.map((b) => ({ ...b, config: { ...b.config } })),
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
      name: "festive-frames-design-v5",
      // NOTE: the design (slots, textBars) and the draft bar styling are NOT
      // persisted — refreshing clears the design, reseeds a fresh random July
      // 4th layout, and resets the bar to the loud default.
      partialize: (state) => ({
        designName: state.designName,
        plateState: state.plateState,
        frameConfig: state.frameConfig,
        dieCut: state.dieCut,
        updatedAt: state.updatedAt,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) } as DesignState;
        const fc = merged.frameConfig;
        if (fc) {
          // Migrate legacy configs without wing properties
          if (fc.wingWidthInches === undefined) {
            fc.wingWidthInches = 0;
            fc.wingColumns = 0;
          }
          // Migrate configs predating the full bottom row
          if (fc.bottomSlots === undefined) {
            fc.bottomSlots = fc.topSlots ?? 14;
          }
        }
        // Migrate legacy corner slot ids → ends of the new bottom row
        if (merged.slots) {
          const bs = merged.frameConfig?.bottomSlots ?? 14;
          const s = { ...merged.slots } as Record<string, PlacedTile>;
          if (s["frame:bottom-left-0"]) {
            s["frame:bottom-0"] = s["frame:bottom-left-0"];
            delete s["frame:bottom-left-0"];
          }
          if (s["frame:bottom-right-0"]) {
            s[`frame:bottom-${bs - 1}`] = s["frame:bottom-right-0"];
            delete s["frame:bottom-right-0"];
          }
          merged.slots = s;
        }
        // Migrate single text bar → array of placed bars
        if (merged.textBars === undefined) {
          const legacy = (merged as unknown as { textBar?: TextBarPlacement | null }).textBar;
          merged.textBars = legacy
            ? [{ id: "tb-legacy", ...legacy, config: { ...merged.bottomBar }, qr: merged.qrCode?.enabled ?? false }]
            : [];
        }
        delete (merged as unknown as { textBar?: unknown }).textBar;
        return merged;
      },
    }
  )
);
