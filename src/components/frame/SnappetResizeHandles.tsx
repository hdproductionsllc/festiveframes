"use client";

import { useRef, useState, type RefObject } from "react";
import type { FrameSlot, TileSpan } from "@/lib/types";
import { snappetRect, type SnappetPreview } from "@/lib/utils/snappet";

/**
 * Drag-to-resize handles for the SELECTED placed snappet (school builder only).
 *
 * A placed snappet the customer taps grows three handles — right edge, bottom edge,
 * and the bottom-right corner. Dragging one previews a candidate span LIVE (reusing
 * the drop-indicator's valid/invalid styling) and commits it on release. It is the
 * resize twin of a footprint DRAG: `resolveSnappetResize` (via the `resolve` prop)
 * pins the anchor and varies the span, exactly as `resolveSnappetDrop` pins the span
 * and varies the anchor.
 *
 * Why this is NOT a dnd-kit draggable: every droppable on the frame is 1x1, and
 * DndProvider derives its "drag off the frame → remove" margin from the winning
 * droppable's size — resizing a droppable would inflate that margin and break the
 * delete gesture. The handles therefore run their own pointer-capture drag and read
 * grid position from `layerRef` (the overflow layer whose origin is the frame's), so
 * no cell ever changes size.
 *
 * Left/top handles are intentionally omitted: the anchor is the persistence key, so
 * moving it is a MOVE (drag the tile), not a resize. Side panels are two cells wide,
 * so the right handle simply can't grow past the panel — `resolve` reports that as a
 * rejected preview rather than needing a special case here.
 */
export interface SnappetResizeHandlesProps {
  /** The selected snappet's anchor cell (its top-left). */
  anchorSlot: FrameSlot;
  /** Its current footprint. */
  span: TileSpan;
  /** Live tile size in px (containerWidth / totalWidthInches * tileSizeInches). */
  tileSize: number;
  /** The overflow layer whose top-left equals the frame's origin — the reference
   *  for mapping a pointer position back to a grid column/row. */
  layerRef: RefObject<HTMLDivElement | null>;
  /** Upper bounds for a candidate span (the grid's dimensions), so a wild drag can't
   *  ask canPlace to expand an astronomically large footprint. */
  maxCols: number;
  maxRows: number;
  /** Validate a candidate span at the fixed anchor → a preview (or null off-grid). */
  resolve: (cols: number, rows: number) => SnappetPreview | null;
  /** Commit the resize (design-store `resizeTile`), which re-validates and no-ops if
   *  the release landed on an invalid size. */
  commit: (cols: number, rows: number) => void;
}

type Handle = "right" | "bottom" | "corner";

const NUB = 14; // px — the draggable square's side

export function SnappetResizeHandles({
  anchorSlot,
  span,
  tileSize,
  layerRef,
  maxCols,
  maxRows,
  resolve,
  commit,
}: SnappetResizeHandlesProps) {
  // The candidate footprint under an active handle drag (null when idle). Held in
  // state so the preview + handle positions track the pointer as it moves.
  const [preview, setPreview] = useState<SnappetPreview | null>(null);
  const activeHandle = useRef<Handle | null>(null);

  // The footprint the handles frame RIGHT NOW: the live candidate while dragging,
  // else the committed span. Positions the nubs on the edge the drag is exploring.
  const shownSpan: TileSpan = preview
    ? { cols: preview.cols, rows: preview.rows }
    : span;
  const rect = snappetRect(anchorSlot, shownSpan, tileSize);

  const clamp = (v: number, max: number) => Math.min(Math.max(1, v), max);

  const candidateFrom = (handle: Handle, clientX: number, clientY: number): { cols: number; rows: number } => {
    const layer = layerRef.current;
    // Fall back to the current span if the layer isn't measurable (it always is
    // while a snappet is on screen) — a resize can't compute a cell without it.
    if (!layer) return { cols: span.cols, rows: span.rows };
    const box = layer.getBoundingClientRect();
    // The pointer in frame-relative px (the layer's origin IS the frame's origin),
    // then in whole cells past the anchor. `ceil` means the footprint grows to
    // include the cell the pointer is over, and 0.001 absorbs a sub-pixel undershoot
    // sitting exactly on a boundary.
    const localX = clientX - box.left;
    const localY = clientY - box.top;
    const cols = clamp(Math.ceil((localX - anchorSlot.x) / tileSize - 0.001), maxCols);
    const rows = clamp(Math.ceil((localY - anchorSlot.y) / tileSize - 0.001), maxRows);
    return {
      cols: handle === "bottom" ? span.cols : cols,
      rows: handle === "right" ? span.rows : rows,
    };
  };

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    activeHandle.current = handle;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { cols, rows } = candidateFrom(handle, e.clientX, e.clientY);
    setPreview(resolve(cols, rows));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const handle = activeHandle.current;
    if (!handle) return;
    const { cols, rows } = candidateFrom(handle, e.clientX, e.clientY);
    setPreview(resolve(cols, rows));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeHandle.current) return;
    activeHandle.current = null;
    if (preview) commit(preview.cols, preview.rows);
    setPreview(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  const nubStyle = (cursor: string): React.CSSProperties => ({
    position: "absolute",
    width: NUB,
    height: NUB,
    borderRadius: 3,
    background: "#f8c53b",
    border: "2px solid #1e1b17",
    boxShadow: "1px 1px 0 rgba(30,27,23,0.6)",
    cursor,
    touchAction: "none",
    zIndex: 6,
  });

  // A handle press must never bubble to the frame's deselect-on-empty-click.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const half = NUB / 2;
  const rejected = preview != null && !preview.valid;

  return (
    <>
      {/* Selection ring + live candidate preview. While dragging it reuses the drop
          indicator's gold (valid) / red (rejected) language so a resize reads the
          same as a drop; idle, it's a plain gold ring marking what's selected. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute ${preview ? `ff-drop-indicator ${rejected ? "ff-drop-indicator--rejected" : ""}` : ""}`}
        style={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
          zIndex: 5,
          ...(preview
            ? {}
            : {
                borderRadius: 3,
                outline: "2px dashed rgba(248,197,59,0.9)",
                outlineOffset: -2,
                boxShadow: "0 0 10px 1px rgba(248,197,59,0.4)",
              }),
        }}
      />

      {/* Right edge — width only. */}
      <div
        role="slider"
        aria-label="Resize snappet width"
        aria-valuenow={shownSpan.cols}
        onPointerDown={onPointerDown("right")}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={stop}
        style={{ ...nubStyle("ew-resize"), left: rect.x + rect.width - half, top: rect.y + rect.height / 2 - half }}
      />

      {/* Bottom edge — height only. */}
      <div
        role="slider"
        aria-label="Resize snappet height"
        aria-valuenow={shownSpan.rows}
        onPointerDown={onPointerDown("bottom")}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={stop}
        style={{ ...nubStyle("ns-resize"), left: rect.x + rect.width / 2 - half, top: rect.y + rect.height - half }}
      />

      {/* Bottom-right corner — width AND height. */}
      <div
        role="slider"
        aria-label="Resize snappet"
        aria-valuenow={shownSpan.cols}
        onPointerDown={onPointerDown("corner")}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={stop}
        style={{ ...nubStyle("nwse-resize"), left: rect.x + rect.width - half, top: rect.y + rect.height - half }}
      />
    </>
  );
}
