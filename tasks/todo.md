# Designer workshop — bottom row + draggable text bar

## Done this session
- [x] Replace "Order this design" with internal **Export Parts List** (table + CSV + print-to-PDF)
- [x] Tile images fill the full 1×1 cell (100% / cover, was 82% / contain)
- [x] Default text-bar font → **Bebas Neue**
- [x] QR generated live from URL → encodes **https://festiveframes.co** (no baked .com image)
- [x] Per-plate zoom knobs — Missouri zoom-in (crop car margin), California show-whole-plate

## Build: bottom = tiles, text bar = draggable + auto-fit quantized
Decisions: bar drops on **top or bottom row**; width **auto-fits text**, snapping up to whole tiles; QR rides inside the bar.

- [ ] **types**: SlotZone add `"bottom"`, drop `bottom-left/right`; `FrameConfig.bottomSlots`; `TextBarPlacement {row,startIndex,widthUnits}`
- [ ] **frame.ts**: `bottomSlots: 14` in DEFAULT_FRAME_CONFIG (gapless: 14×0.985 = 13.79)
- [ ] **slot-generator**: generate full `bottom` row (step = top step = 0.985); update zone count/id/all helpers
- [ ] **text-bar util**: `measureTextBarUnits()` (canvas, reference-unit so it's zoom-stable) + `coveredSlotIds()`
- [ ] **slogans data**: `JULY4_SLOGANS` list
- [ ] **design-store**: `textBar` placement + `placeTextBar/removeTextBar`; clear covered tiles; guard fill/place on covered; recompute units when text changes; persist + migrate legacy corner slots & missing bottomSlots
- [ ] **layout/useFrameLayout**: drop fixed `getBottomBarArea`; bar rect comes from placement
- [ ] **FrameCanvas**: full bottom-row groove; render text bar at its placement (on top of covered slots)
- [ ] **DndProvider**: handle `textbar` drag → drop on top/bottom slot sets placement (clamped to fit)
- [ ] **Text bar editor**: slogan dropdown (July 4th), draggable preview chip, placed/remove state
- [ ] **Export Parts List**: embed a captured **frame mockup image** at the top (prints too)
- [ ] **Export Parts List**: list **custom parts (text bars)** with dimensions + **Download print-ready PNG** of each
- [ ] `tsc --noEmit` + `next build` clean — all LOCAL, no Railway push

## Notes / v2
- Plate zoom values are easy dials in `plate-images.ts` (`plateDisplay`) — tune after eyeballing.
- QR as its own draggable tile = possible later if wanted.
