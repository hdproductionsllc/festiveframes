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
  findFreeStart,
  maxWidthAt,
} from "@/lib/utils/text-bar";
import { MAX_HISTORY_DEPTH } from "@/lib/constants/frame";

function makeTextBarId(existing: PlacedTextBar[]): string {
  return `tb-${Date.now().toString(36)}-${existing.length}`;
}

/**
 * The FIRST banner in a design must always carry the QR code; subsequent bars
 * are optional. Re-assert that invariant after any add/remove/reorder so it can
 * never drift. Returns the same array reference when nothing changes.
 */
function enforceFirstBarQr(bars: PlacedTextBar[]): PlacedTextBar[] {
  if (bars.length === 0 || bars[0].qr) return bars;
  return bars.map((b, i) => (i === 0 ? { ...b, qr: true } : b));
}

/**
 * A text bar REPLACES the tiles it covers — there are no hidden layers. Whenever
 * a bar is placed/moved/resized, delete any tile under it so the design is
 * exactly what you see (and what prints), and removing the bar leaves the area
 * blank. Returns the same `slots` reference when nothing changes.
 */
function clearCoveredTiles(
  slots: Record<string, PlacedTile>,
  bars: PlacedTextBar[]
): Record<string, PlacedTile> {
  const covered = coveredSlotIds(bars);
  let changed = false;
  const next = { ...slots };
  for (const id of covered) {
    if (next[id]) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? next : slots;
}

/**
 * Resolve a bar's new auto-fit width so it can NEVER grow into a neighbor.
 * Growth is allowed into free space on either side of the bar's current
 * position; if that's not enough the width is capped (the render shrink-fits the
 * text). Returns the safe `{ widthUnits, startIndex }` to apply.
 */
function fitWidth(
  bars: PlacedTextBar[],
  bar: PlacedTextBar,
  desiredWidth: number,
  rowLen: number
): { widthUnits: number; startIndex: number } {
  // Free room to the right of the current start (up to the next bar / row edge),
  // and free room to the left (down to the previous bar / row start).
  const roomRight = maxWidthAt(bars, bar.row, bar.startIndex, rowLen, bar.id);
  let leftEdge = 0;
  for (const b of bars) {
    if (b.row !== bar.row || b.id === bar.id) continue;
    const end = b.startIndex + b.widthUnits;
    if (end <= bar.startIndex && end > leftEdge) leftEdge = end;
  }
  const roomLeft = bar.startIndex - leftEdge; // free columns immediately left
  const maxAvailable = roomLeft + roomRight; // total contiguous free span
  const widthUnits = Math.max(1, Math.min(desiredWidth, maxAvailable));
  // Prefer to grow rightward; only shift left when the right room runs out.
  const overflowLeft = Math.max(0, widthUnits - roomRight);
  const startIndex = clampStartIndex(bar.startIndex - overflowLeft, widthUnits, rowLen);
  return { widthUnits, startIndex };
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
  /**
   * Move a placed tile from one slot to another (drag a tile to a new cell).
   * Dropping on an occupied cell REPLACES it; the source cell is cleared. A
   * drop onto a slot hidden under a text bar is ignored so the move never
   * vanishes a tile into a covered cell.
   */
  moveTile: (fromSlotId: string, toSlotId: string) => void;
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
  /**
   * Click-to-add: place a new bar in a sensible default spot without a drag.
   * Prefers the BOTTOM row (centered); falls back to TOP if bottom is full;
   * does nothing if both rows are full. Returns true when a bar was added.
   */
  addTextBar: () => boolean;
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
            if (!state.slots[slotId]) return state;
            const newSlots = { ...state.slots };
            delete newSlots[slotId];
            return {
              ...pushHistory(),
              slots: newSlots,
              updatedAt: Date.now(),
            };
          });
        },

        moveTile: (fromSlotId, toSlotId) => {
          set((state) => {
            if (fromSlotId === toSlotId) return state;
            const tile = state.slots[fromSlotId];
            if (!tile) return state;
            // Never move a tile onto a cell hidden under a text bar.
            if (coveredSlotIds(state.textBars).includes(toSlotId)) return state;
            const newSlots = { ...state.slots };
            delete newSlots[fromSlotId];
            newSlots[toSlotId] = { ...tile }; // replaces whatever was there
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
            // The first bar ALWAYS carries the QR (required); additional bars
            // start without it and can toggle it freely.
            const isFirst = state.textBars.length === 0;
            const qr = isFirst ? true : false;
            const widthUnits = measureTextBarUnits(config, qr, maxUnits);
            // New bars prefer the row center, but must land on a FREE run — never
            // on top of an existing bar. `startIndex` (the drop point) only chose
            // top vs bottom; the exact column is resolved against current bars.
            void startIndex;
            const preferred = Math.round((maxUnits - widthUnits) / 2);
            const start = findFreeStart(state.textBars, row, widthUnits, maxUnits, preferred);
            // Row is full — reject the placement rather than overlap a neighbor.
            if (start === null) return state;
            const bar: PlacedTextBar = {
              id: makeTextBarId(state.textBars),
              row,
              startIndex: start,
              widthUnits,
              config,
              qr,
            };
            // A bar REPLACES the tiles it covers (no hidden layers): the covered
            // tiles are deleted, so what you see is what prints and removing the
            // bar leaves the area blank.
            const newBars = enforceFirstBarQr([...state.textBars, bar]);
            return {
              ...pushHistory(),
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars),
              selectedBarId: bar.id,
              updatedAt: Date.now(),
            };
          });
        },

        addTextBar: () => {
          // Try the bottom row first, then the top — placeTextBar centers the
          // bar and only adds it when a free, non-overlapping run exists (it
          // no-ops otherwise). Compare the bar count to learn which row took.
          const before = get().textBars.length;
          get().placeTextBar("bottom", 0);
          if (get().textBars.length > before) return true;
          get().placeTextBar("top", 0);
          return get().textBars.length > before;
        },

        moveTextBar: (id, row, startIndex) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            const maxUnits = rowLength(state.frameConfig, row);
            // Snap the drop to the nearest FREE column on the target row (the bar
            // itself is excluded so it never blocks its own move). If the bar can
            // fit nowhere on that row, snap it back to its current spot.
            const start = findFreeStart(
              state.textBars,
              row,
              bar.widthUnits,
              maxUnits,
              startIndex,
              bar.id
            );
            if (start === null) return state; // no room → leave the bar untouched
            // No-op move (same row + column) — skip the history push.
            if (row === bar.row && start === bar.startIndex) return state;
            const moved: PlacedTextBar = { ...bar, row, startIndex: start };
            const newBars = state.textBars.map((b) => (b.id === id ? moved : b));
            return {
              ...pushHistory(),
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars),
              updatedAt: Date.now(),
            };
          });
        },

        removeTextBar: (id) => {
          set((state) => ({
            ...pushHistory(),
            // Removing the first bar promotes the next one — re-assert the QR rule.
            textBars: enforceFirstBarQr(state.textBars.filter((b) => b.id !== id)),
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
            const { widthUnits, startIndex } = fitWidth(
              state.textBars,
              bar,
              measureTextBarUnits(config, bar.qr, maxUnits),
              maxUnits
            );
            const updated: PlacedTextBar = { ...bar, config, widthUnits, startIndex };
            const newBars = state.textBars.map((b) => (b.id === id ? updated : b));
            return {
              ...pushHistory(),
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars),
              updatedAt: Date.now(),
            };
          });
        },

        updateTextBarQr: (id, enabled) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            // The first bar's QR is required — refuse to turn it off.
            if (!enabled && state.textBars[0]?.id === id) return state;
            const maxUnits = rowLength(state.frameConfig, bar.row);
            const { widthUnits, startIndex } = fitWidth(
              state.textBars,
              bar,
              measureTextBarUnits(bar.config, enabled, maxUnits),
              maxUnits
            );
            const updated: PlacedTextBar = { ...bar, qr: enabled, widthUnits, startIndex };
            const newBars = state.textBars.map((b) => (b.id === id ? updated : b));
            return {
              ...pushHistory(),
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars),
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
            const newSlots = { ...state.slots };
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
            const newSlots = { ...state.slots };
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
      // Persist the FULL design so a reload restores exactly what the "Saved"
      // indicator promises. History is intentionally NOT persisted (undo/redo is
      // a within-session affordance, not a saved part of the design).
      version: 6,
      partialize: (state) => ({
        designName: state.designName,
        plateState: state.plateState,
        slots: state.slots,
        textBars: state.textBars,
        selectedBarId: state.selectedBarId,
        qrCode: state.qrCode,
        bottomBar: state.bottomBar,
        frameConfig: state.frameConfig,
        dieCut: state.dieCut,
        updatedAt: state.updatedAt,
      }),
      // v6 is the first version to persist slots/textBars/qrCode/bottomBar. Any
      // persisted blob from before v6 only ever carried meta (name/state/frame/
      // dieCut) — it never held a real design — so dropping the design-shaped
      // fields from an old blob is safe: they were absent anyway, and the seed
      // logic will populate a fresh design for that (effectively design-less)
      // user. Keep the meta fields so their name/state/frame survive the bump.
      migrate: (persisted, version) => {
        if (version < 6 && persisted && typeof persisted === "object") {
          const old = persisted as Record<string, unknown>;
          // Strip any pre-v6 design-shaped fields (there were none persisted
          // before v6) and keep only the meta the old blob actually carried.
          return {
            designName: old.designName,
            plateState: old.plateState,
            frameConfig: old.frameConfig,
            dieCut: old.dieCut,
            updatedAt: old.updatedAt,
          } as unknown as DesignState;
        }
        return persisted as DesignState;
      },
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
          merged.textBars = enforceFirstBarQr(
            legacy
              ? [{ id: "tb-legacy", ...legacy, config: { ...merged.bottomBar }, qr: merged.qrCode?.enabled ?? false }]
              : []
          );
        }
        delete (merged as unknown as { textBar?: unknown }).textBar;
        return merged;
      },
    }
  )
);
