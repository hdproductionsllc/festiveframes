"use client";

import { createPortal } from "react-dom";
import { useDesignStore } from "@/stores/design-store";
import { useUIStore } from "@/stores/ui-store";
import { buildGrid } from "@/lib/utils/slot-generator";
import { coveredSlotIds } from "@/lib/utils/text-bar";
import { tileSpan, resolveSnappetResize } from "@/lib/utils/snappet";

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

export function SnappetSizeControl() {
  const selectedId = useUIStore((s) => s.selectedSnappetSlotId);
  const selectSnappet = useUIStore((s) => s.selectSnappet);
  const requestRecrop = useUIStore((s) => s.requestRecrop);
  const slots = useDesignStore((s) => s.slots);
  const frameConfig = useDesignStore((s) => s.frameConfig);
  const sections = useDesignStore((s) => s.sections);
  const textBars = useDesignStore((s) => s.textBars);
  const resizeTile = useDesignStore((s) => s.resizeTile);
  const removeTile = useDesignStore((s) => s.removeTile);

  if (typeof document === "undefined") return null;
  if (!selectedId) return null;
  const tile = slots[selectedId];
  if (!tile) return null; // stale selection (tile moved/removed)

  const span = tileSpan(tile);
  const grid = buildGrid(frameConfig);
  const ctx = { grid, slots, sections, barCovered: new Set(coveredSlotIds(textBars)) };
  const isPhoto = !!tile.image;

  const seatable = (cols: number, rows: number): boolean =>
    cols >= 1 && rows >= 1 && resolveSnappetResize(ctx, selectedId, cols, rows) !== null;

  const apply = (cols: number, rows: number) => {
    if (cols === span.cols && rows === span.rows) return;
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
    const inc = isW ? { cols: span.cols + 1, rows: span.rows } : { cols: span.cols, rows: span.rows + 1 };
    const value = isW ? span.cols : span.rows;
    return (
      <div key={label} className="flex items-center gap-1.5">
        <span className="w-3 text-[11px] font-extrabold text-[#1e1b17]/60">{label}</span>
        <button
          type="button"
          aria-label={`Shrink ${label === "W" ? "width" : "height"}`}
          disabled={!seatable(dec.cols, dec.rows)}
          onClick={() => apply(dec.cols, dec.rows)}
          className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[#1e1b17] bg-white text-lg font-black leading-none text-[#1e1b17] shadow-[2px_2px_0_#1e1b17] active:translate-y-0.5 disabled:opacity-30 disabled:shadow-none"
        >
          −
        </button>
        <span className="w-5 text-center text-base font-extrabold tabular-nums text-[#1e1b17]">{value}</span>
        <button
          type="button"
          aria-label={`Grow ${label === "W" ? "width" : "height"}`}
          disabled={!seatable(inc.cols, inc.rows)}
          onClick={() => apply(inc.cols, inc.rows)}
          className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[#1e1b17] bg-[#3fb0e6] text-lg font-black leading-none text-white shadow-[2px_2px_0_#1e1b17] active:translate-y-0.5 disabled:opacity-30 disabled:shadow-none"
        >
          +
        </button>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-[440px] flex-wrap items-center justify-between gap-3 rounded-2xl border-[3px] border-[#1e1b17] bg-[#faf0d6] px-4 py-2.5 shadow-[4px_4px_0_#1e1b17]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#1e1b17]/70">
            Size{isPhoto ? " (photo)" : ""}
          </span>
          <span className="rounded-md bg-[#1e1b17]/10 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-[#1e1b17]">
            {span.cols}×{span.rows}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {renderStepper("W")}
          {renderStepper("H")}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              removeTile(selectedId);
              selectSnappet(null);
            }}
            className="rounded-lg border-2 border-[#1e1b17] bg-brand-red px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[2px_2px_0_#1e1b17] active:translate-y-0.5"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => selectSnappet(null)}
            className="rounded-lg border-2 border-[#1e1b17] bg-white px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1e1b17] shadow-[2px_2px_0_#1e1b17] active:translate-y-0.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
