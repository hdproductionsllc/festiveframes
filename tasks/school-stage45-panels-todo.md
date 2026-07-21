# Stage 4.5 — model PANELS as grid rectangles

## Goal
Turn the four "sections" from ZONES into PANEL RECTANGLES. Keep the 4 section id
STRING values (persistence). LEFT/RIGHT own the corners; TOP/BOTTOM are inner-only.

## Steps
- [x] Read current system (sections, snappet, slot-generator, design-store, FrameCanvas, tests)
- [x] Decide design: put `panelAt` on FrameGrid so snappet.ts needs no config threading
- [ ] `src/lib/utils/panels.ts`: `panelOf(row,col,config)`, `panelRects(config)`, `PanelRect` — derived from config formulas (leaf module, types-only import)
- [ ] `slot-generator.ts`: add `panelAt(row,col)` to FrameGrid via panelOf
- [ ] `sections.ts`: `panelSuppressed(panel,sections)`, `slotSuppressed(slot,sections,config)`, `sectionBounds(id,slots,config)` (panelOf-based)
- [ ] `snappet.ts`: canPlace panel-containment rule + reason "panel"; use grid.panelAt + panelSuppressed; visibleAnchorSlots uses grid.panelAt (signature unchanged)
- [ ] FrameCanvas: pass frameConfig to slotSuppressed + sectionBounds
- [ ] `panels.test.ts`: panelOf corner, partition, etc.
- [ ] snappet.test.ts: add panel tests; fix 11x2 grab-offset test (now cross-panel → use bottom-panel wide snappet)
- [ ] design-store.test.ts: fix cross-panel snappet fixtures (307, 292) to panel-legal
- [ ] tsc / vitest / eslint clean
- [ ] Visual: seed store, LEFT=image (16 cells incl corners), TOP=image (10 inner), screenshot + Read
