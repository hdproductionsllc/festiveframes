# Fix: text banners can overlap

## Overlap paths found
1. `placeTextBar` always centers a new bar — a 2nd same-row bar lands on top of the 1st. NO collision check.
2. `moveTextBar` (drag reposition, DndProvider) only clamps to row bounds — drops on top of another bar freely.
3. `updateTextBar` (text/font/size edits grow `widthUnits`) — a bar can grow into a neighbor.
4. `updateTextBarQr` (toggling QR changes `widthUnits`) — same growth-into-neighbor risk.
5. Preset/seed path (Designer.tsx -> `placeTextBar("bottom", 0)`) routes through #1 — covered once #1 is fixed.
Top vs bottom rows are independent (different `row`) — only same-row bars collide.

## Plan
- [x] Add pure helpers to `src/lib/utils/text-bar.ts`:
      `rangesOverlap`, `fitsAt`, `findFreeStart`, `maxWidthAt`.
- [x] `placeTextBar`: place at first free start near center; reject (no-op) if row full.
- [x] `moveTextBar`: snap to nearest non-overlapping start at target; snap back to original if none.
- [x] `updateTextBar` / `updateTextBarQr`: cap `widthUnits` (via `fitWidth`) so the bar can't grow into a neighbor.
- [x] Build (`npx next build` exit 0) + `npm run lint` clean (0 errors).

## UX choices
- Place: reject silently (no-op) when row is full — no overlap created.
- Move: snap back to original position when target can't fit (no overlap).
- Width growth: cap to available space between neighbors; render shrink-fits text.
