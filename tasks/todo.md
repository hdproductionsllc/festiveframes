# Builder one-model interaction (place/move/remove via drag)

Goal: KILL the paint/eraser tool toggle. One consistent model:
- Drag palette tile -> cell = place (replace if occupied). [already works]
- Drag a PLACED tile -> another cell = move.
- Drag a PLACED tile OFF the frame = remove (poof). Mirror placed-textbar behavior.
- Tap-to-place stays (select palette tile, tap cell). Touch removal fallback: tap placed tile -> small X.

## Tasks
- [x] Study DndProvider, RailSlot, PlacedTileView, design-store, palette-store, FrameCanvas, ToolBar, Coachmark
- [ ] design-store: add `moveTile(fromSlotId, toSlotId)` (move/replace, covered-slot aware)
- [ ] DndProvider: handle `type: "placed-tile"` (move on frame, remove off frame, poof sound, overlay ghost)
- [ ] RailSlot: placed tile draggable; remove activeTool click logic; keep tap-to-place; touch X-remove fallback
- [ ] Delete ToolBar entirely + its usages in TilePalette
- [ ] palette-store: drop activeTool/setTool/DesignTool
- [ ] useKeyboardShortcuts: drop P/R tool keys; Escape clears selection
- [ ] types: remove DesignTool
- [ ] globals.css: add poof keyframe
- [ ] Onboarding coachmark copy: teach the one model
- [ ] next build (exit 0) + npm run lint (no NEW errors)

## Review
DONE. One model shipped: drag palette tile -> place; drag placed tile -> move;
drag placed tile off frame -> poof (mirrors placed-textbar). Tap-to-place kept;
touch removal = tap placed tile -> ✕. Eraser/paint tool fully deleted (ToolBar
component, palette-store activeTool/setTool, DesignTool type, P/R shortcuts).
Added moveTile to design-store, placed-tile branch in DndProvider, tile-poof
keyframe, grab cursor + hover-lift affordances, updated coachmark + hints.

Build: next build exits 0 (33/33 pages). Lint: 0 errors, 20 warnings (all
pre-existing img/set-state; none in my changed logic). On master, no commits.
