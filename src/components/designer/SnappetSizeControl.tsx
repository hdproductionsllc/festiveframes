"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { getPiece } from "@/data/sets";
import { useUIStore } from "@/stores/ui-store";
import { ColorSwatch, HexInput } from "./ColorField";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { minSpanFor, tileSpan, resolveSnappetResize } from "@/lib/utils/snappet";

// Floating size control for the SELECTED tile/snappet (school builder). The on-canvas
// resize handles only exist for already-multi-cell snappets and are fiddly on a phone,
// so this gives a reliable, thumb-friendly way to grow/shrink ANY placed tile — a 1x1,
// a set piece, or an uploaded photo — after it's on the frame.
//
// For an uploaded PHOTO, changing the ASPECT (cols:rows) would cover-crop the art with
// no crop tool, so instead of committing silently it routes through the existing
// re-crop flow (requestRecrop → SnappetRecropModal): the crop tool re-opens at the new
// footprint with the print-DPI gate. Same-aspect resizes (and all set pieces) commit
// straight through. This is what makes an approved crop no longer feel "locked in".

/**
 * The stepper glyphs. These two are the most load-bearing icons on the page: − and +
 * are the buttons' ONLY labels (the `aria-label` carries the meaning for screen
 * readers, but a sighted user has nothing else). Drawn at 14px rather than the
 * house 16px because they sit in a 32px square control alongside a number.
 */
/**
 * The per-tile colour choices. Deliberately SHORT and deliberately not a colour
 * wheel: this is a badge on a school's frame, not a paint app, and the useful
 * answers are "the frame's own colours" plus white and black to lift one badge
 * out of the field. The school's colour is already the default via the
 * design-wide control, so it does not need a swatch of its own here.
 */
const TILE_COLORS = ["#FFFFFF", "#1B2A4A", "#111111", "#F8C53B", "#9E1B32"] as const;

function StepIcon({ dir }: { dir: "minus" | "plus" }) {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir === "plus" ? "M12 5.5v13M5.5 12h13" : "M5.5 12h13"} />
    </svg>
  );
}

export function SnappetSizeControl() {
  const selectedId = useUIStore((s) => s.selectedSnappetSlotId);
  const selectSnappet = useUIStore((s) => s.selectSnappet);
  const requestRecrop = useUIStore((s) => s.requestRecrop);
  const setTileColors = useDesignStore((s) => s.setTileColors);
  const slots = useDesignStore((s) => s.slots);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const resizeTile = useDesignStore((s) => s.resizeTile);
  const removeTile = useDesignStore((s) => s.removeTile);

  // The panel itself, for the outside-tap test below.
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Every way OUT of this panel. It had three — Done, Remove, Escape — and the
  // owner still reported it as stuck, which is the verdict that matters: Escape
  // does not exist on a phone, and Done is an unlabelled grey button at the end of
  // a crowded bar. Two more exits, both of them the ones people actually try:
  //
  //  · an X in the corner, because that is where forty years of windows put it;
  //  · tapping ANYWHERE that is not the panel and not a frame tile. Clicking the
  //    frame's empty space already cleared the selection (FrameCanvas), but a tap
  //    on the page around the builder cleared nothing, so the panel followed you
  //    down the page. Listening on pointerdown at the document catches those.
  //    Taps on tiles are excluded so selecting a DIFFERENT badge swaps the panel
  //    to it instead of closing it first.
  //
  // Declared BEFORE the early returns: hooks may not sit behind a condition.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectSnappet(null);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return; // using the panel
      if (t.closest?.("[data-tile-cell]")) return; // picking a (different) tile
      if (t.closest?.("[data-snappet-handle]")) return; // dragging a resize handle
      selectSnappet(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [selectedId, selectSnappet]);

  if (typeof document === "undefined") return null;
  if (!selectedId) return null;
  const tile = slots[selectedId];
  if (!tile) return null; // stale selection (tile moved/removed)

  const span = tileSpan(tile);
  // The floor for THIS piece. Real artwork is unreadable at a single ~1in cell, so a
  // badge stops at 2x2; a plain 1x1 tile and the calibration tiles are exempt.
  // See `minSpanFor`. Uploaded photos carry no piece and keep the 1x1 floor.
  const min = minSpanFor(getPiece(tile.pieceId));
  const grid = buildGrid(frameConfig);
  const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
  const isPhoto = !!tile.image;

  const seatable = (cols: number, rows: number): boolean =>
    cols >= 1 && rows >= 1 && resolveSnappetResize(ctx, selectedId, cols, rows) !== null;

  const apply = (cols: number, rows: number) => {
    if (cols === span.cols && rows === span.rows) return;
    if (cols < min.cols || rows < min.rows) return;
    if (!seatable(cols, rows)) return;
    // Photo + aspect change → re-crop instead of a silent cover-crop.
    if (isPhoto && cols * span.rows !== rows * span.cols) {
      requestRecrop(selectedId, cols, rows);
      return;
    }
    resizeTile(selectedId, { cols, rows });
  };

  // A plain render helper (NOT a nested component — that would reset state each render
  // and trips react/static-components). Keyed so React reconciles the two steppers.
  const renderStepper = (label: "W" | "H") => {
    const isW = label === "W";
    const dec = isW ? { cols: span.cols - 1, rows: span.rows } : { cols: span.cols, rows: span.rows - 1 };
    const belowMin = dec.cols < min.cols || dec.rows < min.rows;
    const inc = isW ? { cols: span.cols + 1, rows: span.rows } : { cols: span.cols, rows: span.rows + 1 };
    const value = isW ? span.cols : span.rows;
    return (
      <div key={label} className="flex items-center gap-1.5">
        <span className="ff-micro w-3">{label}</span>
        <button
          type="button"
          aria-label={`Shrink ${label === "W" ? "width" : "height"}`}
          disabled={belowMin || !seatable(dec.cols, dec.rows)}
          onClick={() => apply(dec.cols, dec.rows)}
          className="ff-btn ff-btn-secondary ff-btn-icon-lg"
        >
          <StepIcon dir="minus" />
        </button>
        <span className="w-5 text-center text-[13px] font-medium tabular-nums text-[var(--ff-ink)]">{value}</span>
        <button
          type="button"
          aria-label={`Grow ${label === "W" ? "width" : "height"}`}
          disabled={!seatable(inc.cols, inc.rows)}
          onClick={() => apply(inc.cols, inc.rows)}
          className="ff-btn ff-btn-secondary ff-btn-icon-lg"
        >
          <StepIcon dir="plus" />
        </button>
      </div>
    );
  };

  // Per-tile colour. Offered ONLY here, i.e. only while a tile is selected, which
  // is what keeps it from becoming a sixth always-on picker: the design-wide
  // Background/Rim controls dress the whole frame, and this picks ONE badge out of
  // it (a senior's own sport, a captain's star). "Reset" clears the override and
  // the tile falls back to the frame's colour, so the two controls never fight.
  const renderSwatches = (
    key: "field" | "rim",
    label: string,
    current: string | undefined,
  ) => (
    <div className="flex items-center gap-1.5">
      <span className="ff-micro">{label}</span>
      {TILE_COLORS.map((hex) => (
        <button
          key={hex}
          type="button"
          aria-label={`${label} ${hex}`}
          aria-pressed={current === hex}
          onClick={() => setTileColors(selectedId, { [key]: hex })}
          className="h-6 w-6 rounded-[6px] border"
          style={{
            backgroundColor: hex,
            borderColor: current === hex ? "var(--ff-ink)" : "var(--ff-line-strong)",
            boxShadow: current === hex ? "0 0 0 2px var(--ff-accent-soft)" : undefined,
          }}
        />
      ))}
      {/* Exact colour for THIS tile, same pair as the panel controls: presets for
          speed, swatch + hex for "the precise colour on our brand sheet". */}
      <ColorSwatch
        value={current ?? "#1B2A4A"}
        onChange={(hex) => setTileColors(selectedId, { [key]: hex })}
        label={`${label} colour`}
        size={24}
      />
      <HexInput
        value={current ?? "#1B2A4A"}
        onChange={(hex) => setTileColors(selectedId, { [key]: hex })}
        label={label}
        className="hidden sm:block"
      />
      <button
        type="button"
        onClick={() => setTileColors(selectedId, { [key]: null })}
        disabled={!current}
        className="ff-btn ff-btn-secondary ff-btn-sm"
      >
        Reset
      </button>
    </div>
  );

  return createPortal(
    <div className="ff-school-portal fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 pointer-events-none">
      <div
        ref={panelRef}
        className="ff-modal pointer-events-auto relative flex w-full max-w-[440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5"
      >
        {/* The exit everyone looks for first. */}
        <button
          type="button"
          aria-label="Close tile options"
          onClick={() => selectSnappet(null)}
          className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ff-line-strong)] bg-[var(--ff-card)] text-[var(--ff-ink)] shadow-sm"
        >
          <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="ff-label">Size{isPhoto ? " (photo)" : ""}</span>
          <span className="rounded-[6px] bg-[var(--ff-sunk)] px-1.5 py-0.5 text-[12px] tabular-nums text-[var(--ff-ink)]">
            {span.cols}×{span.rows}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {renderStepper("W")}
          {renderStepper("H")}
        </div>
        <div className="flex w-full flex-col gap-1.5 border-t border-[var(--ff-line)] pt-2">
          {renderSwatches("field", "Background", tile.field)}
          {renderSwatches("rim", "Highlight", tile.rim)}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              removeTile(selectedId);
              selectSnappet(null);
            }}
            className="ff-btn ff-btn-danger ff-btn-sm"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => selectSnappet(null)}
            className="ff-btn ff-btn-secondary ff-btn-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
