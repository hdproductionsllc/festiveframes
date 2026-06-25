# Drag UX deep dive — smooth drop indicator

## Diagnosis (verified by reading the code)
- `collisionDetection={pointerWithin}`: `over` goes null at cell borders, over the
  center plate area (no slots), and on fast moves -> glow blinks. ROOT clunk.
- Re-render storm: every `onDragOver` -> `setOverSlotId` in Designer -> re-renders
  FrameCanvas + ALL ~30 RailSlots (none memoized). Jank.
- Per-cell glow pops cell-to-cell with a 0.9s infinite pulse — abrupt, not gliding.
- RailSlot root has `transition-all duration-150` — animates everything each render.
- Empty cells: solid `#ffffff` edge-to-edge -> merged white blob.

## Plan
- [x] Custom collision: pointerWithin -> fallback closestCenter, accept slot only
      when pointer is reasonably near (keeps drag-off-to-remove = null).
- [x] Single gliding drop indicator in FrameCanvas that TRANSLATES to target slot
      rect (transform/opacity). Remove per-cell glow + isOver prop.
- [x] Memoize RailSlot (React.memo) + drop isOver -> drag stops re-rendering slots.
- [x] CSS: remove transition-all from RailSlot; crisp quick indicator transition.
- [x] Empty cells: subtle inset shadow + faint hairline, no black gaps.
- [x] Keep banner footprint, source-transform ghost, overlay, drag-off intact.
- [x] Build green + lint clean.
