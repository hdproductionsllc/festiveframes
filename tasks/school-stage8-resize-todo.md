# Stage 8 — resize handles on placed snappets + suggestSnappetSize

## (B) Pure algorithm first (easy, high-value building block)
- [ ] `suggestSnappetSize(imageAspect, free)` in `src/lib/utils/snappet.ts`
      maximize art area = cols^2/aspect, rowsNeeded = ceil(cols/aspect) <= free.rows,
      cols <= free.cols, tie-break least bg, never 0x0.
- [ ] `resolveSnappetResize(ctx, anchorSlotId, cols, rows)` pure helper
      (fixed anchor, varied span → SnappetPreview via canPlace, excludeId = anchor).

## (A) Store
- [ ] `resizeTile(slotId, newSpan)` in design-store: validate via canPlace
      (exclude self), reject invalid, evict overlapped anchors, 1x1-normalize
      (drop span), one withHistory step. Add to DesignState interface.

## (A) Selection
- [ ] ui-store: `selectedSnappetSlotId` + `selectSnappet(id)`.
- [ ] RailSlot/PlacedTileCell: multi-cell click selects (1x1 unchanged → /build safe).
- [ ] FrameCanvas frame root: click on empty space deselects (gated on anySpan).

## (A) Handles UI
- [ ] `SnappetResizeHandles` in FrameCanvas snappet layer: right/bottom/corner nubs
      on the selected anchor. Pointer-drag → candidate span from grid geometry →
      resolveSnappetResize live preview (reuse ff-drop-indicator styling) → resizeTile
      on release. Droppables stay 1x1.

## Tests
- [ ] snappet.test.ts: suggestSnappetSize (2:3→2x3, 1:1→2x2, 4:3→2x2, 16:9→2x2 @ free{2,8}),
      fits free, never 0, landscape not 1x1; resolveSnappetResize basics.
- [ ] design-store.test.ts: resizeTile grow-reject (panel/plate), grow-evict,
      shrink frees cells, undo restores span, 1x1-only unaffected.

## Verify
- [ ] npx tsc --noEmit / npx vitest run / npx eslint (all clean)
- [ ] seed snappet, screenshot /lab/school, Read PNG for handles.
