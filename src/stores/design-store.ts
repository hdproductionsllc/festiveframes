import { createStore, useStore, type StoreApi } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { createContext, useContext, createElement, type ReactNode } from "react";
import type {
  PlacedTile,
  BottomBarConfig,
  QRCodeConfig,
  FrameConfig,
  DesignPreset,
  TextBarPlacement,
  TextBarRow,
  PlacedTextBar,
  SectionId,
  SectionMode,
  SectionState,
  TileSpan,
} from "@/lib/types";
import type { LookPreset, LookBanner } from "@/data/look-presets";
import { DEFAULT_FRAME_CONFIG, getWingFrameConfig, getStandardConfig, SCHOOL_DEFAULT_FONT_FAMILY } from "@/lib/constants/frame";
import { DEFAULT_BOTTOM_BAR, DEFAULT_QR_CODE } from "@/lib/constants/defaults";
import { buildGrid, getAllSlotIds, wingRowCount, wingSlotIndex } from "@/lib/utils/slot-generator";
import {
  measureTextBarUnits,
  coveredSlotIds,
  clampStartIndex,
  rowLength,
  findFreeStart,
  maxWidthAt,
} from "@/lib/utils/text-bar";
import {
  canPlace,
  coveredBySnappets,
  hasAnySpan,
  isMultiCell,
  panelSnappetPlacement,
  tileSpan,
  visibleAnchorSlots,
  UPLOAD_PIECE_ID,
  UPLOAD_SET_ID,
} from "@/lib/utils/snappet";
import { deleteFullRes } from "@/lib/utils/image-store";
import { sectionSupportsText } from "@/lib/utils/sections";
import { MAX_HISTORY_DEPTH } from "@/lib/constants/frame";

// ── Multi-cell snappets ──────────────────────────────────────────────────────
// A tile MAY carry a `span` and cover several grid cells (utils/snappet). The
// covered cells are derived, never stored, so every read that asks "is this cell
// free / who owns it" has to expand the spans first.
//
// A design in which no tile carries a span expands to nothing, so these helpers
// short-circuit BEFORE building the grid and every path below reduces to exactly
// the code that was here before. That's what keeps /build byte-identical.

const NO_COVERAGE: ReadonlyMap<string, string> = new Map();

/**
 * Map of covered slot id → the anchor covering it. Empty (and free) for a
 * design of ordinary 1x1 tiles.
 *
 * Coverage is resolved from the VISIBLE anchors — the exact view FrameCanvas
 * paints from (`visibleAnchorSlots`) — not from the raw slots. A snappet whose
 * anchor sits in a section switched to text/image paints nothing, so it must
 * neither block nor be silently destroyed by an edit in a zone it does not paint:
 * FrameCanvas renders those footprint cells as ordinary empty, clickable cells,
 * and the store has to agree, or tapping/dragging a plain tile onto one would
 * delete a hidden snappet the user never saw. There is now exactly ONE owner of a
 * cell, and both sides read it the same way. (`sections` is empty on /build, so
 * `visibleAnchorSlots` returns the raw design and this is byte-identical there.)
 */
function snappetCoverage(state: {
  slots: Record<string, PlacedTile>;
  frameConfig: FrameConfig;
  sections: Partial<Record<SectionId, SectionState>>;
}): ReadonlyMap<string, string> {
  if (!hasAnySpan(state.slots)) return NO_COVERAGE;
  const grid = buildGrid(state.frameConfig);
  return coveredBySnappets(visibleAnchorSlots(state.slots, grid, state.sections), grid);
}

function makeTextBarId(existing: PlacedTextBar[]): string {
  return `tb-${Date.now().toString(36)}-${existing.length}`;
}

/**
 * There is exactly ONE optional QR code per design, and it rides the FIRST
 * banner. This syncs that invariant to the design-level `qrEnabled` flag: the
 * first bar's `qr` matches `qrEnabled`, every other bar is forced `qr = false`.
 * Re-assert after any add/remove/reorder or QR toggle so it can never drift.
 * Returns the same array reference when nothing changes.
 *
 * NOTE: this only flips the `qr` flag — it does NOT re-fit widths. Callers that
 * change whether the first bar carries the QR must re-measure that bar's width
 * (see `setQrEnabled`) so it reserves/frees the QR's space.
 */
function syncFirstBarQr(bars: PlacedTextBar[], qrEnabled: boolean): PlacedTextBar[] {
  let changed = false;
  const next = bars.map((b, i) => {
    const want = i === 0 ? qrEnabled : false;
    if (b.qr === want) return b;
    changed = true;
    return { ...b, qr: want };
  });
  return changed ? next : bars;
}

/**
 * A text bar REPLACES the tiles it covers — there are no hidden layers. Whenever
 * a bar is placed/moved/resized, delete any tile under it so the design is
 * exactly what you see (and what prints), and removing the bar leaves the area
 * blank. Returns the same `slots` reference when nothing changes.
 *
 * Eviction is by OCCUPANCY, not by key. A snappet is stored at ONE anchor plus a
 * span, so a bar dropped over its non-anchor cells matches no key here — the
 * tile would survive every banner edit and ship as a produced part sitting on
 * top of the banner. Expanding the spans is what makes "a bar replaces what it
 * covers" true of multi-cell tiles too. A design of ordinary 1x1 tiles has no
 * spans to expand, so /build never leaves the first loop.
 */
function clearCoveredTiles(
  slots: Record<string, PlacedTile>,
  bars: PlacedTextBar[],
  frameConfig: FrameConfig
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
  if (hasAnySpan(next)) {
    const barCovered = new Set(covered);
    for (const [cellId, anchorId] of coveredBySnappets(next, buildGrid(frameConfig))) {
      if (barCovered.has(cellId) && next[anchorId]) {
        delete next[anchorId];
        changed = true;
      }
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

  // Sections (school builder) — a zone in text/image mode is one direct-print
  // piece; a missing key (or mode "tiles") = the normal tile grid. /build never
  // populates this, so all section logic no-ops there.
  sections: Partial<Record<SectionId, SectionState>>;
  selectedSectionId: SectionId | null; // section being edited (UI only)

  // History
  history: HistorySnapshot[];
  historyIndex: number;

  // Actions — tiles
  /**
   * Place a tile at `slotId`. `span` (optional) makes it a MULTI-CELL snappet
   * anchored there and growing right/down; omitted = an ordinary 1x1 tile.
   * A footprint that would cover the plate hole or a section in text/image mode
   * is rejected; one that overlaps existing tiles REPLACES them.
   */
  placeTile: (slotId: string, pieceId: string, setId: string, span?: TileSpan) => void;
  /** Remove a tile by its ANCHOR id or by any cell its snappet covers. */
  removeTile: (slotId: string) => void;
  /**
   * Move a placed tile from one slot to another (drag a tile to a new cell).
   * Dropping on an occupied cell REPLACES it; the source cell is cleared. A
   * drop onto a slot hidden under a text bar is ignored so the move never
   * vanishes a tile into a covered cell.
   */
  moveTile: (fromSlotId: string, toSlotId: string) => void;
  /**
   * Resize a placed snappet to `newSpan`, keeping its anchor fixed (the customer
   * drag-resizes a placed snappet to explore aspect ratios). The new footprint is
   * validated by canPlace with the snappet excluded from its own collision test:
   * an invalid target (crossing a panel/plate, under a bar, off a suppressed
   * section) is a no-op; overlapped anchors are evicted WHOLE. A 1x1 result is
   * absent-normalized (the span field is dropped), so a shrink back to one cell
   * restores the ordinary two-field record. One undoable step.
   *
   * `image` (optional) REPLACES the tile's uploaded art in the same step. It is how
   * a re-crop commits: resizing an image-snappet to a shape the photo does not match
   * re-frames the art through the crop tool (SnappetRecropModal), and the new
   * preview+full-res id land here atomically with the new footprint. Omitted = keep
   * the current image (a geometry-only resize; a native-aspect grow stays zero-crop).
   */
  resizeTile: (slotId: string, newSpan: TileSpan, image?: PlacedTile["image"]) => void;
  /**
   * Place UPLOADED customer art into a panel as a SNAPPET (the unified art path).
   * The span is `suggestSnappetSize` over the panel's free space (portrait → tall,
   * landscape → compact), anchored at the panel's top-most free cell and validated
   * by canPlace. The tile carries `image` (preview url + IndexedDB full-res id) and
   * the reserved `"upload"` piece identity, so the drag/resize/remove engine treats
   * it exactly like any other snappet. School builder only; /build never calls it.
   */
  placeImageSnappet: (
    panelId: SectionId,
    image: { imageUrl: string; fullResId?: string; sourceAspect: number }
  ) => void;
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
  /** Apply a marketing "look" (LOOK_PRESETS) as a single, undoable replace:
   *  its tiles + themed filler + centered banner(s). One history step. */
  applyLook: (look: LookPreset, setId: string) => void;

  // Actions — bottom bar (the draft)
  updateBottomBar: (updates: Partial<BottomBarConfig>) => void;

  // Actions — text bars (draggable slogan bars)
  placeTextBar: (row: TextBarRow, startIndex: number) => void;
  /**
   * Place a CENTERED bar on the given row (no drag). Used by tap-to-add and the
   * preset seeder. Returns true when a bar was added (false if the row is full).
   */
  placeTextBarCentered: (row: TextBarRow) => boolean;
  /**
   * Click-to-add: place a new bar in a sensible default spot without a drag.
   * Prefers the BOTTOM row (centered); falls back to TOP if bottom is full;
   * does nothing if both rows are full. Returns true when a bar was added.
   */
  addTextBar: () => boolean;
  moveTextBar: (id: string, row: TextBarRow, startIndex: number) => void;
  setTextBarWidth: (id: string, widthUnits: number) => void;
  resetTextBarWidth: (id: string) => void;
  removeTextBar: (id: string) => void;
  selectBar: (id: string | null) => void;
  updateTextBar: (id: string, updates: Partial<BottomBarConfig>) => void;

  // Actions — QR (design-level: one optional QR on the FIRST banner)
  /** Toggle the design's QR on/off; syncs the first bar's `qr` and re-fits it. */
  setQrEnabled: (enabled: boolean) => void;
  updateQRCode: (updates: Partial<QRCodeConfig>) => void;

  // Actions — appearance
  dieCut: boolean;
  toggleDieCut: () => void;
  toggleWings: () => void;
  setWingColumns: (columns: number) => void;

  // Actions — meta
  setDesignName: (name: string) => void;
  setPlateState: (abbr: string) => void;
  /** Replace the ENTIRE design in one shot (restoring a saved design). Resets
   *  history so undo doesn't cross the load boundary. */
  loadDesign: (design: LoadableDesign) => void;

  // Actions — sections (school builder). Suppress-don't-destroy: flipping a section
  // to text/image hides its tiles (via a covered-set), so flipping back is lossless.
  setSectionMode: (id: SectionId, mode: SectionMode) => void;
  setSectionText: (id: SectionId, updates: Partial<BottomBarConfig>) => void;
  clearSection: (id: SectionId) => void;
  selectSection: (id: SectionId | null) => void;

  // Actions — history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** The serializable design payload — the fields that fully define a design (the
 *  same set `partialize` persists). Used to save a design and to restore one. */
export type LoadableDesign = Partial<
  Pick<
    DesignState,
    "designName" | "plateState" | "slots" | "textBars" | "bottomBar" | "qrCode" | "frameConfig" | "dieCut" | "sections"
  >
>;

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

/** Every full-res IndexedDB id an uploaded-art tile in `slots` points at. */
function collectFullResIds(slots: Record<string, PlacedTile>, into: Set<string>): void {
  for (const tile of Object.values(slots)) {
    const id = tile.image?.fullResId;
    if (id) into.add(id);
  }
}

/**
 * Garbage-collect the print-resolution originals a history edit just made
 * UNREACHABLE. An uploaded image keeps its full-res blob in IndexedDB (see
 * image-store); the design carries only the id. A blob must live exactly as long as
 * some reachable state can still bring the tile back — the LIVE design or ANY
 * undo/redo snapshot — and no longer.
 *
 * So cleanup is tied to REACHABILITY, not to the moment a tile leaves the live
 * slots. Deleting eagerly on removeTile/eviction was the bug: undo restored a tile
 * whose blob was already gone (silent loss of the print original), and eviction
 * leaked blobs it deleted without freeing. Instead we GC precisely here, where the
 * undo history DISCARDS snapshots (the truncated redo tail, and snapshots shifted
 * off the front past MAX_HISTORY_DEPTH): a blob referenced only by discarded
 * snapshots — and by no surviving one — can never be restored again, so it is freed.
 *
 * `surviving` includes the new live state (the last snapshot), so a blob still on
 * the frame, or one undo away, is always kept. No image ids anywhere (every /build
 * design, and any edit that discards nothing) ⇒ this is a no-op.
 */
function gcOrphanedFullRes(discarded: HistorySnapshot[], surviving: HistorySnapshot[]): void {
  if (discarded.length === 0) return;
  const discardedIds = new Set<string>();
  for (const snap of discarded) collectFullResIds(snap.slots, discardedIds);
  if (discardedIds.size === 0) return;
  const survivingIds = new Set<string>();
  for (const snap of surviving) collectFullResIds(snap.slots, survivingIds);
  for (const id of discardedIds) {
    if (!survivingIds.has(id)) void deleteFullRes(id);
  }
}

/**
 * Reconcile a persisted `selectedBarId` against a set of bars after undo/redo:
 * keep the selection if that bar still exists, otherwise drop it to null so the
 * editor never points at a bar that's no longer on the frame.
 */
function reconcileSelectedBar(
  selectedBarId: string | null,
  bars: PlacedTextBar[]
): string | null {
  if (selectedBarId && bars.some((b) => b.id === selectedBarId)) return selectedBarId;
  return null;
}

// Persist goes through a GUARDED localStorage wrapper. A full origin-quota blowout
// (e.g. a large uploaded section image in the school builder) must never silently
// drop the design — we catch the write failure and notify any registered listener
// so the UI can warn the user instead of losing their work on the next reload. The
// stored bytes are identical to zustand's default JSON storage, so /build is
// unaffected (it holds only piece IDs + text and never overflows).
let persistQuotaListener: (() => void) | null = null;

/** Register a callback fired when a persist write is rejected (quota exceeded, or a
 *  locked-down browser). Returns an unsubscribe fn. */
export function onPersistQuotaExceeded(listener: () => void): () => void {
  persistQuotaListener = listener;
  return () => {
    if (persistQuotaListener === listener) persistQuotaListener = null;
  };
}

const guardedLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn("[design-store] could not save design (storage full?):", err);
      persistQuotaListener?.();
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

/**
 * A builder-specific persist migration, run AFTER the shared one. It receives the
 * blob the shared `migrate` produced and returns the blob to hydrate from.
 *
 * This exists because the two builders have DIVERGENT frame geometry: the school
 * frame's wing count changed, invalidating slot ids that are perfectly valid on
 * /build. Rather than teach the shared migration about a specific builder's frame,
 * each builder owns its own step. /build passes nothing, so its migration path is
 * exactly what it was before this hook existed.
 */
export type DesignMigrateExtra = (persisted: unknown, version: number) => unknown;

export interface DesignStoreOptions {
  /** Builder-specific persist migration step. Absent on /build → identity. */
  migrateExtra?: DesignMigrateExtra;
  /**
   * Frame geometry OWNED by this store instance.
   *
   * /build lets the user reconfigure the frame, so its geometry is part of the
   * design and is restored from persistence. A single-SKU builder (school) is the
   * opposite: there is exactly ONE printable geometry, and it is a property of the
   * product, not of the user's design. Passing it here makes the store authoritative
   * — it is the initial state, it wins over any stale persisted `frameConfig` on
   * hydrate, and it is the fallback when a loaded design carries none.
   *
   * This is what makes the seed-on-mount effect unnecessary: a component effect that
   * stamped the config could only do so by REPLACING the whole design, which raced
   * hydration and destroyed the returning user's work.
   */
  frameConfig?: FrameConfig;
}

// The store is a FACTORY so more than one builder can each own an isolated design
// (own state + own localStorage key). /build uses `defaultDesignStore`; the school
// builder creates its own instance and provides it via `DesignStoreProvider`.
function createDesignStore(persistName: string, options: DesignStoreOptions = {}) {
  const { migrateExtra, frameConfig: ownedFrameConfig } = options;
  const baseFrameConfig = ownedFrameConfig ?? DEFAULT_FRAME_CONFIG;
  return createStore<DesignState>()(
  persist(
    (set, get) => {
      /**
       * Standard undo/redo model: `history[historyIndex]` ALWAYS equals the
       * current/live design. Call this from a mutation with the partial it's
       * about to apply; it snapshots the RESULTING state (current ⊕ partial),
       * truncates any redo tail, appends the snapshot, and returns the partial
       * merged with the new `{ history, historyIndex }` to hand straight to
       * `set`. Capped at MAX_HISTORY_DEPTH (oldest dropped).
       */
      function withHistory<T extends Partial<DesignState>>(
        state: DesignState,
        partial: T
      ): T & { history: HistorySnapshot[]; historyIndex: number } {
        // The redo tail this edit truncates is discarded — those futures are gone.
        const discarded = state.history.slice(state.historyIndex + 1);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        // Seed the baseline (pre-mutation) state as history[0] the very first
        // time, so undo can return to the design as it was before any edit.
        if (newHistory.length === 0) {
          newHistory.push(createSnapshot(state));
        }
        newHistory.push(createSnapshot({ ...state, ...partial }));
        while (newHistory.length > MAX_HISTORY_DEPTH) {
          const dropped = newHistory.shift();
          if (dropped) discarded.push(dropped); // fell off the front — also gone
        }
        // Free any uploaded-art original the discarded snapshots referenced and no
        // surviving state can still restore (see gcOrphanedFullRes). No-op on /build.
        gcOrphanedFullRes(discarded, newHistory);
        return { ...partial, history: newHistory, historyIndex: newHistory.length - 1 };
      }

      return {
        // Initial state
        designName: "My Frame Design",
        plateState: "MO",
        slots: {},
        bottomBar: { ...DEFAULT_BOTTOM_BAR },
        qrCode: { ...DEFAULT_QR_CODE },
        frameConfig: { ...baseFrameConfig },
        textBars: [],
        selectedBarId: null,
        sections: {},
        selectedSectionId: null,
        dieCut: false,
        updatedAt: Date.now(),
        history: [],
        historyIndex: -1,

        placeTile: (slotId, pieceId, setId, span) => {
          set((state) => {
            // Slots under a text bar are blocked. The SAME set is handed to
            // canPlace below, so the anchor rule and the footprint rule can never
            // drift apart.
            const barCovered = new Set(coveredSlotIds(state.textBars));
            if (barCovered.has(slotId)) return state;
            const placed: PlacedTile = { pieceId, setId };
            // Only a genuine multi-cell footprint carries a span — a 1x1 stays the
            // exact two-field record it has always been, so nothing about /build's
            // stored shape changes.
            const footprint = tileSpan({ span });
            const newSlots = { ...state.slots };
            if (isMultiCell(footprint)) {
              const grid = buildGrid(state.frameConfig);
              const anchor = grid.coordOf(slotId);
              if (!anchor) return state;
              const verdict = canPlace(
                { grid, slots: state.slots, sections: state.sections, barCovered },
                anchor,
                footprint,
              );
              if (!verdict.ok) return state; // plate / suppressed / bar / off-grid
              // Overlap evicts: the displaced anchors go, footprint and all.
              for (const id of verdict.evicts) delete newSlots[id];
              placed.span = footprint;
            } else {
              // Dropping a 1x1 onto a cell hidden under a snappet displaces that
              // snappet — the cell can't hold two tiles, and leaving the snappet
              // would paint over the tile the user just placed.
              const owner = snappetCoverage(state).get(slotId);
              if (owner) delete newSlots[owner];
            }
            newSlots[slotId] = placed;
            return withHistory(state, {
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        removeTile: (slotId) => {
          // Resolve the OWNING anchor once from current state (the remove affordance
          // can be clicked on any covered cell of a snappet, not just its anchor).
          const st = get();
          const anchorId = st.slots[slotId]
            ? slotId
            : snappetCoverage(st).get(slotId) ?? null;
          if (!anchorId) return;
          set((state) => {
            if (!state.slots[anchorId]) return state;
            const newSlots = { ...state.slots };
            delete newSlots[anchorId];
            // The uploaded original is NOT freed here: the removal is one undo away,
            // so its full-res blob must survive to restore a printable tile. It is
            // GC'd later, once the removal snapshot falls out of history and no
            // reachable state references it (see gcOrphanedFullRes in withHistory).
            return withHistory(state, {
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        moveTile: (fromSlotId, toSlotId) => {
          set((state) => {
            if (fromSlotId === toSlotId) return state;
            const tile = state.slots[fromSlotId];
            if (!tile) return state;
            // Never move a tile onto a cell hidden under a text bar.
            const barCovered = new Set(coveredSlotIds(state.textBars));
            if (barCovered.has(toSlotId)) return state;
            const newSlots = { ...state.slots };
            const footprint = tileSpan(tile);
            if (isMultiCell(footprint)) {
              // The whole footprint travels with the tile. Exclude the tile itself
              // from the collision test so it never blocks its own move.
              const grid = buildGrid(state.frameConfig);
              const anchor = grid.coordOf(toSlotId);
              if (!anchor) return state;
              const verdict = canPlace(
                { grid, slots: state.slots, sections: state.sections, barCovered },
                anchor,
                footprint,
                fromSlotId,
              );
              if (!verdict.ok) return state;
              for (const id of verdict.evicts) delete newSlots[id];
            } else {
              const owner = snappetCoverage(state).get(toSlotId);
              if (owner && owner !== fromSlotId) delete newSlots[owner];
            }
            delete newSlots[fromSlotId];
            newSlots[toSlotId] = { ...tile }; // replaces whatever was there
            return withHistory(state, {
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        resizeTile: (slotId, newSpan, image) => {
          set((state) => {
            const tile = state.slots[slotId];
            if (!tile) return state;
            const grid = buildGrid(state.frameConfig);
            const anchor = grid.coordOf(slotId);
            if (!anchor) return state;
            const footprint = tileSpan({ span: newSpan });
            // No-op resize (drag out and back, or a click without movement): the
            // footprint matches the tile's current span. Bail before withHistory so
            // we never record a snapshot identical to the current top — otherwise the
            // first undo would restore a visually identical state and appear to do
            // nothing, silently swallowing the user's undo of the prior real edit.
            const current = tileSpan(tile);
            if (footprint.cols === current.cols && footprint.rows === current.rows) {
              return state;
            }
            // Same gate as placeTile/moveTile — the snappet is excluded so growing
            // over its own currently-covered cells never counts as a self-collision.
            const barCovered = new Set(coveredSlotIds(state.textBars));
            const verdict = canPlace(
              { grid, slots: state.slots, sections: state.sections, barCovered },
              anchor,
              footprint,
              slotId,
            );
            if (!verdict.ok) return state; // plate / panel / suppressed / bar
            const newSlots = { ...state.slots };
            for (const id of verdict.evicts) delete newSlots[id];
            // Rebuild the record so a 1x1 result drops the span field entirely
            // (absent-normalized) — the shape /build has always stored. Uploaded
            // art's `image` rides along untouched: a resized photo keeps rendering
            // its image, and staying at (or returning to) the photo's aspect stays
            // zero-crop (a shape it does NOT match is where the crop tool comes in).
            const next: PlacedTile = { pieceId: tile.pieceId, setId: tile.setId };
            // A re-crop passes fresh art (new preview + full-res id); otherwise the
            // existing image rides along untouched.
            const nextImage = image ?? tile.image;
            if (nextImage) next.image = nextImage;
            if (isMultiCell(footprint)) next.span = footprint;
            newSlots[slotId] = next;
            return withHistory(state, {
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        placeImageSnappet: (panelId, image) => {
          set((state) => {
            const grid = buildGrid(state.frameConfig);
            const barCovered = new Set(coveredSlotIds(state.textBars));
            const ctx = { grid, slots: state.slots, sections: state.sections, barCovered };
            // ONE decision, shared with the crop modal's aspect target: where a
            // native-aspect snappet of this image lands, and how big. allowEvict so a
            // deliberate photo upload still seats on a FULL panel (evicting tiles) —
            // otherwise a fully-tiled frame silently refuses the photo.
            const placement = panelSnappetPlacement(ctx, panelId, image.sourceAspect, { allowEvict: true });
            if (!placement) return state; // no cells in panel at all (shouldn't happen)
            const anchor = grid.coordOf(placement.anchorSlotId);
            if (!anchor) return state;
            // Re-validate at commit (evicts are only populated on a valid placement).
            const verdict = canPlace(ctx, anchor, placement.span, placement.anchorSlotId);
            if (!verdict.ok) return state;
            const newSlots = { ...state.slots };
            for (const id of verdict.evicts) delete newSlots[id];
            const placed: PlacedTile = {
              pieceId: UPLOAD_PIECE_ID,
              setId: UPLOAD_SET_ID,
              image: { url: image.imageUrl, fullResId: image.fullResId },
            };
            if (isMultiCell(placement.span)) placed.span = placement.span;
            newSlots[placement.anchorSlotId] = placed;
            return withHistory(state, {
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        fillAll: (pieceId, setId) => {
          set((state) => {
            const allIds = getAllSlotIds(state.frameConfig);
            const newSlots: Record<string, PlacedTile> = {};
            for (const id of allIds) {
              newSlots[id] = { pieceId, setId };
            }
            // A bar REPLACES the tiles under it — never populate covered cells,
            // or the next banner edit would silently delete these hidden tiles.
            return withHistory(state, {
              slots: clearCoveredTiles(newSlots, state.textBars, state.frameConfig),
              updatedAt: Date.now(),
            });
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
            return withHistory(state, {
              slots: clearCoveredTiles(newSlots, state.textBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        fillEmpty: (pieces) => {
          set((state) => {
            if (pieces.length === 0) return state;
            // Never fill cells hidden under a bar — they'd be silently deleted
            // by the next banner edit (same hazard as fillAll/random/alternate).
            const covered = new Set(coveredSlotIds(state.textBars));
            // Cells hidden under a SNAPPET are not empty either — they hold no
            // record of their own, but the snappet is drawn over them. Filler
            // painted there would be invisible, double-counted in the parts list,
            // and silently deleted the moment the snappet moved.
            for (const id of snappetCoverage(state).keys()) covered.add(id);
            const newSlots = { ...state.slots };
            let changed = false;
            for (const id of getAllSlotIds(state.frameConfig)) {
              if (newSlots[id] || covered.has(id)) continue;
              const piece = pieces[Math.floor(Math.random() * pieces.length)];
              newSlots[id] = { pieceId: piece.pieceId, setId: piece.setId };
              changed = true;
            }
            if (!changed) return state;
            return withHistory(state, { slots: newSlots, updatedAt: Date.now() });
          });
        },

        // Mirror the left half of the frame onto the right half, ACROSS THE GRID.
        //
        // This used to be four independent loops, one per zone, each re-deriving
        // "how many cells does this zone have" from raw config fields. Every one of
        // them was a chance to be wrong about a flag, and two of them were: the wing
        // loop assumed `leftSlots + 1` rows (ignoring fullWidthTopBar/bottomRows) and
        // the bottom loop assumed ONE bottom row, so the school frame's second bottom
        // row — indices bottomSlots..2*bottomSlots-1 — was never mirrored in either
        // direction (stale art on the right half survived a Mirror silently).
        //
        // The frame is a lattice, and a mirror is a lattice operation: the reflection
        // of (row, col) is (row, cols-1-col), full stop. Driving it off buildGrid uses
        // the ONE definition of the frame's shape, so no zone can be forgotten and no
        // future zone/flag can drift out of sync again. The plate hole has no slot, so
        // cellAt returns null there and it is skipped for free.
        //
        // Equivalence on the existing frames is exact: for /build (no wings) the top
        // and bottom rails reflect i ↔ n-1-i with the odd centre column fixed, and the
        // left rail at col 0 reflects onto the right rail at col cols-1 — the same
        // pairs the old code produced. With wings, grid col wingCols-1-c (wing-left)
        // reflects onto wingCols+topSlots+c (wing-right), i.e. the same flat index.
        //
        // A mirror reflects a FOOTPRINT, not a point. A span of `w` columns
        // anchored at grid column `c` covers [c, c+w-1], and the reflection of
        // that RANGE is [cols-c-w, cols-1-c] — so the mirrored ANCHOR sits at
        // `cols - c - w`, not at `cols - 1 - c`. Copying the span verbatim to the
        // point reflection translates the tile instead of reflecting it, pushing
        // half of it off the frame. For a 1x1 the two formulas coincide, which is
        // why /build's pairs are untouched.
        mirrorTopSlots: () => {
          set((state) => {
            const newSlots = { ...state.slots };
            const grid = buildGrid(state.frameConfig);
            const coverage = snappetCoverage(state);
            const barCovered = new Set(coveredSlotIds(state.textBars));
            const ctx = {
              grid,
              slots: state.slots,
              sections: state.sections,
              barCovered,
            };

            // Collected, then applied in two passes, so the outcome cannot depend
            // on the order `grid.slots` happens to come in.
            const clears: string[] = [];
            const writes: Array<{ id: string; tile: PlacedTile }> = [];

            for (const slot of grid.slots) {
              const tile = state.slots[slot.id];
              // A cell hidden UNDER a snappet holds no record of its own — its
              // anchor reflects the whole footprint. Treating it as "empty" here
              // would delete the very reflection that anchor just produced.
              if (!tile && coverage.has(slot.id)) continue;

              const span = tileSpan(tile);
              const mirrorCol = grid.cols - slot.col - span.cols;
              // Drive strictly left → right: the reflected footprint has to land
              // clear of the source's own. Equal/overlapping means the tile
              // straddles (or is) the centre column, which mirrors onto itself.
              if (mirrorCol <= slot.col + span.cols - 1) continue;
              const target = grid.cellAt(slot.row, mirrorCol);
              if (!target) continue; // no cell opposite (asymmetric config)

              if (!tile) {
                // Empty source → empty its reflection. Resolve through the
                // coverage map so a snappet ANCHORED elsewhere is cleared too,
                // instead of surviving as art with no counterpart on the left.
                const owner = state.slots[target.id] ? target.id : coverage.get(target.id);
                if (owner) clears.push(owner);
                continue;
              }

              // Route the write through the same gate as placeTile/moveTile.
              // Writing straight into newSlots let Mirror seat a footprint the
              // builder itself would have refused — over the plate hole, into a
              // suppressed section, or under a banner.
              const verdict = canPlace(ctx, { row: slot.row, col: mirrorCol }, span);
              if (!verdict.ok) continue;
              clears.push(...verdict.evicts);
              writes.push({ id: target.id, tile: { ...tile } });
            }

            for (const id of clears) delete newSlots[id];
            for (const { id, tile } of writes) newSlots[id] = tile;

            return withHistory(state, {
              slots: clearCoveredTiles(newSlots, state.textBars, state.frameConfig),
              updatedAt: Date.now(),
            });
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
            return withHistory(state, {
              slots: clearCoveredTiles(newSlots, state.textBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        clearAll: () => {
          set((state) =>
            withHistory(state, {
              slots: {},
              textBars: [],
              selectedBarId: null,
              updatedAt: Date.now(),
            })
          );
        },

        applyPreset: (preset) => {
          set((state) =>
            // A preset is a FULL-CANVAS replace ("Build this look"): swap in its
            // tiles AND drop any existing banners so an old bar can't float over
            // the new design hiding (and later silently deleting) preset tiles.
            withHistory(state, {
              slots: { ...preset.slots },
              textBars: [],
              selectedBarId: null,
              bottomBar: preset.bottomBar
                ? { ...state.bottomBar, ...preset.bottomBar }
                : state.bottomBar,
              updatedAt: Date.now(),
            })
          );
        },

        applyLook: (look, setId) => {
          set((state) => {
            // Full-canvas replace, recreating the look's marketing preview, all in
            // ONE history entry so a single Undo reverts the whole look.
            // 1) Tiles: the look's exact placements, then themed filler in any
            //    still-empty perimeter slot.
            const slots: Record<string, PlacedTile> = {};
            for (const [slotId, pieceId] of Object.entries(look.slots)) {
              slots[slotId] = { pieceId, setId };
            }
            if (look.filler.length) {
              for (const id of getAllSlotIds(state.frameConfig)) {
                if (slots[id]) continue;
                const pieceId = look.filler[Math.floor(Math.random() * look.filler.length)];
                slots[id] = { pieceId, setId };
              }
            }

            // 2) Banner(s): bottom first so the optional QR rides it, then top.
            //    Each is CENTERED on its row (matching the preview; a left-aligned
            //    bar would sit on — and delete — the flanking tiles).
            const bars: PlacedTextBar[] = [];
            const addBanner = (row: TextBarRow, banner: LookBanner) => {
              const maxUnits = rowLength(state.frameConfig, row);
              const qr = bars.length === 0 ? state.qrCode.enabled : false;
              const config: BottomBarConfig = {
                ...state.bottomBar,
                text: banner.text,
                ...(banner.backgroundColor ? { backgroundColor: banner.backgroundColor } : {}),
                ...(banner.textColor ? { textColor: banner.textColor } : {}),
              };
              const widthUnits = measureTextBarUnits(config, qr, maxUnits);
              const startIndex = Math.max(0, Math.round((maxUnits - widthUnits) / 2));
              bars.push({ id: makeTextBarId(bars), row, startIndex, widthUnits, config, qr });
            };
            if (look.bottomBar) addBanner("bottom", look.bottomBar);
            if (look.topBar) addBanner("top", look.topBar);
            const textBars = syncFirstBarQr(bars, state.qrCode.enabled);

            return withHistory(state, {
              // Bars replace the tiles they cover (no hidden layers).
              slots: clearCoveredTiles(slots, textBars, state.frameConfig),
              textBars,
              selectedBarId: null,
              bottomBar: textBars.length ? { ...textBars[0].config } : state.bottomBar,
              designName: look.name ?? state.designName,
              updatedAt: Date.now(),
            });
          });
        },

        updateBottomBar: (updates) => {
          set((state) =>
            withHistory(state, {
              bottomBar: { ...state.bottomBar, ...updates },
              updatedAt: Date.now(),
            })
          );
        },

        placeTextBar: (row, startIndex) => {
          set((state) => {
            const maxUnits = rowLength(state.frameConfig, row);
            const config = { ...state.bottomBar };
            // One optional QR per design rides the FIRST banner. A newly placed
            // first bar inherits the design's QR toggle; later bars never carry it.
            const isFirst = state.textBars.length === 0;
            const qr = isFirst ? state.qrCode.enabled : false;
            const widthUnits = measureTextBarUnits(config, qr, maxUnits);
            // HONOR the drop column: snap to the nearest FREE run to `startIndex`
            // so a DRAGGED bar lands where you dropped it (never overlapping a
            // neighbor — findFreeStart clamps + searches outward from there).
            // Tap-to-add (addTextBar) passes a centered index for a no-drag add.
            const start = findFreeStart(state.textBars, row, widthUnits, maxUnits, startIndex);
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
            const newBars = syncFirstBarQr([...state.textBars, bar], state.qrCode.enabled);
            return withHistory(state, {
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars, state.frameConfig),
              selectedBarId: bar.id,
              updatedAt: Date.now(),
            });
          });
        },

        placeTextBarCentered: (row) => {
          // Place a CENTERED bar on `row` with no drag. The freshly-measured width
          // is forced ODD and the rows are odd (13), so (maxUnits - width) is even
          // → the bar centers perfectly. Used by tap-to-add AND the preset seeder,
          // which needs each banner centered between its flanking tiles exactly as
          // the marketing previews show (a left-aligned bar would land on — and
          // delete — the flanking tiles).
          const state = get();
          const maxUnits = rowLength(state.frameConfig, row);
          const isFirst = state.textBars.length === 0;
          const qr = isFirst ? state.qrCode.enabled : false;
          const widthUnits = measureTextBarUnits(state.bottomBar, qr, maxUnits);
          const centered = Math.round((maxUnits - widthUnits) / 2);
          const before = state.textBars.length;
          get().placeTextBar(row, centered);
          return get().textBars.length > before;
        },

        addTextBar: () => {
          // Tap-to-add: drop a CENTERED bar with no drag (reliable, especially on
          // mobile). Bottom row first, then top; no-ops if both rows are full.
          return get().placeTextBarCentered("bottom") || get().placeTextBarCentered("top");
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
            return withHistory(state, {
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        // Manually set a bar's width in tile units. Clamps to the free span at its
        // position (fitWidth) and marks the width MANUAL so text/font/QR edits keep
        // it — the font auto-fits to whatever width the bar carries (see the
        // renderers' fitTextBarFont). Undoable.
        setTextBarWidth: (id, widthUnits) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar) return state;
            const maxUnits = rowLength(state.frameConfig, bar.row);
            const fit = fitWidth(state.textBars, bar, widthUnits, maxUnits);
            if (fit.widthUnits === bar.widthUnits && fit.startIndex === bar.startIndex && bar.manualWidth) {
              return state;
            }
            const updated: PlacedTextBar = { ...bar, widthUnits: fit.widthUnits, startIndex: fit.startIndex, manualWidth: true };
            const newBars = state.textBars.map((b) => (b.id === id ? updated : b));
            return withHistory(state, {
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        // Hand the bar back to AUTO width — re-measure from its text/font and drop
        // the manual flag (the "Auto" reset beside the width control).
        resetTextBarWidth: (id) => {
          set((state) => {
            const bar = state.textBars.find((b) => b.id === id);
            if (!bar || !bar.manualWidth) return state;
            const maxUnits = rowLength(state.frameConfig, bar.row);
            const desired = measureTextBarUnits(bar.config, bar.qr, maxUnits);
            const fit = fitWidth(state.textBars, bar, desired, maxUnits);
            const updated: PlacedTextBar = { ...bar, widthUnits: fit.widthUnits, startIndex: fit.startIndex, manualWidth: false };
            const newBars = state.textBars.map((b) => (b.id === id ? updated : b));
            return withHistory(state, {
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        removeTextBar: (id) => {
          set((state) => {
            const remaining = state.textBars.filter((b) => b.id !== id);
            // Removing the first bar promotes the next one to carry the QR (if the
            // design has it enabled). Sync the flags, then re-fit the new first
            // bar so its width reserves/frees the QR space correctly.
            let synced = syncFirstBarQr(remaining, state.qrCode.enabled);
            const first = synced[0];
            if (first && first !== remaining[0]) {
              // The first bar's qr flag actually changed during promotion — re-fit
              // (a hand-set width is preserved; only auto-width bars re-measure).
              const maxUnits = rowLength(state.frameConfig, first.row);
              const desired = first.manualWidth
                ? first.widthUnits
                : measureTextBarUnits(first.config, first.qr, maxUnits);
              const { widthUnits, startIndex } = fitWidth(synced, first, desired, maxUnits);
              synced = synced.map((b, i) => (i === 0 ? { ...b, widthUnits, startIndex } : b));
            }
            return withHistory(state, {
              textBars: synced,
              slots: clearCoveredTiles(state.slots, synced, state.frameConfig),
              selectedBarId: state.selectedBarId === id ? null : state.selectedBarId,
              updatedAt: Date.now(),
            });
          });
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
            // A hand-set width sticks: keep it and let the font refit; otherwise
            // auto-measure from the new text/font.
            const desired = bar.manualWidth
              ? bar.widthUnits
              : measureTextBarUnits(config, bar.qr, maxUnits);
            const { widthUnits, startIndex } = fitWidth(state.textBars, bar, desired, maxUnits);
            const updated: PlacedTextBar = { ...bar, config, widthUnits, startIndex };
            const newBars = state.textBars.map((b) => (b.id === id ? updated : b));
            return withHistory(state, {
              textBars: newBars,
              slots: clearCoveredTiles(state.slots, newBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        setQrEnabled: (enabled) => {
          set((state) => {
            if (state.qrCode.enabled === enabled) return state;
            const qrCode = { ...state.qrCode, enabled };
            // Flip the first bar's qr to match (others stay off), then re-fit the
            // first bar so it reserves the QR's space when on and frees it when
            // off — never overlapping a neighbor. No bars yet → just store the flag.
            let textBars = syncFirstBarQr(state.textBars, enabled);
            const first = textBars[0];
            if (first) {
              const maxUnits = rowLength(state.frameConfig, first.row);
              const desired = first.manualWidth
                ? first.widthUnits
                : measureTextBarUnits(first.config, first.qr, maxUnits);
              const { widthUnits, startIndex } = fitWidth(textBars, first, desired, maxUnits);
              textBars = textBars.map((b, i) => (i === 0 ? { ...b, widthUnits, startIndex } : b));
            }
            return withHistory(state, {
              qrCode,
              textBars,
              slots: clearCoveredTiles(state.slots, textBars, state.frameConfig),
              updatedAt: Date.now(),
            });
          });
        },

        // A URL change just re-renders the QR (same footprint) — no resize needed.
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

        loadDesign: (design) => {
          // Full replace (restoring a saved design). Deep-copy nested objects so
          // the restored design can't share references with the saved payload, and
          // reset history so undo/redo starts fresh from the loaded design.
          set({
            designName: design.designName ?? "My Frame Design",
            plateState: design.plateState ?? "MO",
            slots: design.slots ? { ...design.slots } : {},
            textBars: Array.isArray(design.textBars)
              ? design.textBars.map((b) => ({ ...b, config: { ...b.config } }))
              : [],
            bottomBar: design.bottomBar ? { ...design.bottomBar } : { ...DEFAULT_BOTTOM_BAR },
            qrCode: design.qrCode ? { ...design.qrCode } : { ...DEFAULT_QR_CODE },
            // A store that OWNS its geometry keeps it: a payload saved before a
            // geometry change must not resurrect an unprintable frame.
            frameConfig: ownedFrameConfig
              ? { ...ownedFrameConfig }
              : design.frameConfig
                ? { ...design.frameConfig }
                : { ...DEFAULT_FRAME_CONFIG },
            dieCut: design.dieCut ?? false,
            sections: design.sections ? { ...design.sections } : {},
            selectedBarId: null,
            selectedSectionId: null,
            history: [],
            historyIndex: -1,
            updatedAt: Date.now(),
          });
        },

        // ── Sections (school builder) ────────────────────────────
        setSectionMode: (id, mode) => {
          set((state) => {
            // Side panels are tiles/art only — a text bar is a top/bottom affordance.
            const effMode: SectionMode = mode === "text" && !sectionSupportsText(id) ? "tiles" : mode;
            const cur = state.sections[id] ?? { mode: "tiles" };
            const next: SectionState = { ...cur, mode: effMode };
            // Seed a blank text config on first switch so the section renders + edits.
            if (effMode === "text" && !next.text)
              next.text = { ...DEFAULT_BOTTOM_BAR, fontFamily: SCHOOL_DEFAULT_FONT_FAMILY, text: "" };
            return {
              sections: { ...state.sections, [id]: next },
              selectedSectionId: id,
              updatedAt: Date.now(),
            };
          });
        },

        setSectionText: (id, updates) => {
          set((state) => {
            const cur = state.sections[id];
            const text = { ...DEFAULT_BOTTOM_BAR, ...cur?.text, ...updates };
            return {
              sections: { ...state.sections, [id]: { ...cur, mode: "text", text } },
              updatedAt: Date.now(),
            };
          });
        },

        clearSection: (id) => {
          // Back to TILES — suppression means the zone's tiles reappear (lossless).
          set((state) => ({
            sections: { ...state.sections, [id]: { mode: "tiles" } },
            updatedAt: Date.now(),
          }));
        },

        selectSection: (id) => {
          set({ selectedSectionId: id });
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

            return withHistory(state, {
              frameConfig: newConfig,
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        setWingColumns: (columns: number) => {
          set((state) => {
            if (!state.frameConfig.wings) return state;
            const clamped = Math.max(1, Math.min(5, columns));
            const wingWidth = clamped * state.frameConfig.tileSizeInches;
            const newConfig = getWingFrameConfig(state.frameConfig, wingWidth);

            // Remove tiles in slots that no longer exist when shrinking. The wing's
            // row count is unaffected by the column count, so a surviving flat index
            // still addresses the same cell — dropping `index >= clamped * rows` is
            // exactly the outermost columns. (This used to use `leftSlots + 1`, which
            // under-counts the school wing's rows by 2 and so deleted live tiles.)
            const newSlots = { ...state.slots };
            if (clamped < state.frameConfig.wingColumns) {
              const maxIndex = clamped * wingRowCount(state.frameConfig);
              for (const key of Object.keys(newSlots)) {
                // Parse off the KNOWN prefix rather than splitting on "-" and taking
                // the last part: that assumed the id ends in a bare integer, which is
                // true of today's ids by luck, not by contract.
                const idx = wingSlotIndex(key);
                if (idx !== null && idx >= maxIndex) delete newSlots[key];
              }
            }

            return withHistory(state, {
              frameConfig: newConfig,
              slots: newSlots,
              updatedAt: Date.now(),
            });
          });
        },

        // Standard model: `history[historyIndex]` is the live design, so undo
        // steps to the snapshot at `index - 1` and redo to `index + 1`.
        undo: () => {
          set((state) => {
            if (state.historyIndex <= 0) return state;
            const newIndex = state.historyIndex - 1;
            const snapshot = state.history[newIndex];
            const textBars = snapshot.textBars.map((b) => ({ ...b, config: { ...b.config } }));
            return {
              slots: { ...snapshot.slots },
              bottomBar: { ...snapshot.bottomBar },
              frameConfig: { ...snapshot.frameConfig },
              textBars,
              selectedBarId: reconcileSelectedBar(get().selectedBarId, textBars),
              historyIndex: newIndex,
              updatedAt: Date.now(),
            };
          });
        },

        redo: () => {
          set((state) => {
            if (state.historyIndex >= state.history.length - 1) return state;
            const newIndex = state.historyIndex + 1;
            const snapshot = state.history[newIndex];
            const textBars = snapshot.textBars.map((b) => ({ ...b, config: { ...b.config } }));
            return {
              slots: { ...snapshot.slots },
              bottomBar: { ...snapshot.bottomBar },
              frameConfig: { ...snapshot.frameConfig },
              textBars,
              selectedBarId: reconcileSelectedBar(get().selectedBarId, textBars),
              historyIndex: newIndex,
              updatedAt: Date.now(),
            };
          });
        },

        canUndo: () => get().historyIndex > 0,
        canRedo: () => get().historyIndex < get().history.length - 1,
      };
    },
    {
      name: persistName,
      // Guarded storage: a rejected write (quota exceeded) notifies a listener
      // instead of silently discarding the design. Throwing on the server (no
      // window) makes zustand skip persistence there, matching the default.
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") throw new Error("no window");
        return guardedLocalStorage;
      }),
      // Persist the FULL design so a reload restores exactly what the "Saved"
      // indicator promises. History is intentionally NOT persisted (undo/redo is
      // a within-session affordance, not a saved part of the design).
      // v7: the school frame trimmed its wings from 3 tile columns to 1 (E1 bed
      // fit), so persisted school blobs carry wing slot ids for columns that no
      // longer exist. Nothing about /build's persisted shape changed — the bump is
      // shared because the two builders share this factory, and a /build blob
      // simply passes through the (school-only) extra step untouched.
      version: 7,
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
        sections: state.sections,
        updatedAt: state.updatedAt,
      }),
      // v6 is the first version to persist slots/textBars/qrCode/bottomBar. Any
      // persisted blob from before v6 only ever carried meta (name/state/frame/
      // dieCut) — it never held a real design — so dropping the design-shaped
      // fields from an old blob is safe: they were absent anyway, and the seed
      // logic will populate a fresh design for that (effectively design-less)
      // user. Keep the meta fields so their name/state/frame survive the bump.
      migrate: (persisted, version) => {
        let blob: unknown = persisted;
        if (version < 6 && persisted && typeof persisted === "object") {
          const old = persisted as Record<string, unknown>;
          // Strip any pre-v6 design-shaped fields (there were none persisted
          // before v6) and keep only the meta the old blob actually carried.
          blob = {
            designName: old.designName,
            plateState: old.plateState,
            frameConfig: old.frameConfig,
            dieCut: old.dieCut,
            updatedAt: old.updatedAt,
          };
        }
        // Builder-specific step (school only). Absent on /build → identity.
        return (migrateExtra ? migrateExtra(blob, version) : blob) as DesignState;
      },
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) } as DesignState;
        // Owned geometry is not user data — the persisted copy is a cache of the
        // product's shape at the time of the last save, so the live definition wins.
        // (The persisted DESIGN is untouched; only the frame it sits on is refreshed.)
        if (ownedFrameConfig) merged.frameConfig = { ...ownedFrameConfig };
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
          const qrEnabled = merged.qrCode?.enabled ?? false;
          merged.textBars = syncFirstBarQr(
            legacy
              ? [{ id: "tb-legacy", ...legacy, config: { ...merged.bottomBar }, qr: qrEnabled }]
              : [],
            qrEnabled
          );
        }
        delete (merged as unknown as { textBar?: unknown }).textBar;
        // Sections are new — old persisted blobs won't have them.
        if (!merged.sections) merged.sections = {};
        return merged;
      },
    }
  )
  );
}

// ─── Store instances + React context ─────────────────────────────────────────
//
// `defaultDesignStore` is the ONE store /build (and every non-builder consumer:
// cart, print utils, autosave) uses — same persist key as before, so /build is
// byte-for-byte unchanged. A second builder (the school builder) creates its own
// instance with a DIFFERENT key and hands it down via `DesignStoreProvider`.

export { createDesignStore };

export const defaultDesignStore = createDesignStore("festive-frames-design-v5");

const DesignStoreContext = createContext<StoreApi<DesignState>>(defaultDesignStore);

export function DesignStoreProvider({
  store,
  children,
}: {
  store: StoreApi<DesignState>;
  children: ReactNode;
}) {
  return createElement(DesignStoreContext.Provider, { value: store }, children);
}

/** Subscribe to design state from the CONTEXT store (defaults to the /build store
 *  when no provider is present, so every existing call site is unchanged). Selector
 *  is optional — `useDesignStore()` returns the whole state (old behavior). */
export function useDesignStore(): DesignState;
export function useDesignStore<T>(selector: (state: DesignState) => T): T;
export function useDesignStore<T>(selector?: (state: DesignState) => T) {
  const store = useContext(DesignStoreContext);
  return useStore(store, selector ?? ((s: DesignState) => s as unknown as T));
}

/** The context store instance, for imperative access (`api.getState()`) inside a
 *  component — resolves to the school store under a provider, else the default. */
export function useDesignStoreApi(): StoreApi<DesignState> {
  return useContext(DesignStoreContext);
}
