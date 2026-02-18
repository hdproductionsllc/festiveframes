# Festive Frames Designer — Implementation Checklist

## Foundation
- [x] Step 0: Project scaffolding (Next.js + Tailwind + dependencies)
- [x] Step 1: Type system & constants
- [x] Step 2: Slot generation & layout math
- [x] Step 3: Zustand stores (design, palette, UI)
- [x] Step 4: Tile set data (Essentials + 4th of July)

## Visual Components
- [x] Step 5: Frame canvas (RailSlot, PlacedTileView, LicensePlateArea, BottomTextBar, QRCodeOverlay)
- [x] Step 6: Drag & drop system (DndProvider, DragOverlay, touch support, snap sound)
- [x] Step 7: Tile palette (SetTabs, TileGrid, ToolBar, QuickActions, PresetGallery, responsive)
- [x] Step 8: Bottom bar editor (text input, font selector, color pickers, alignment, spacing, QR toggle)

## Assembly & Polish
- [x] Step 9: Designer layout & keyboard shortcuts
- [x] Step 10: PNG export, auto-save indicator, visual polish

## Quality Revamp
- [x] SVG Tile Artwork: Revamp 9 low-quality SVG tiles (flag, eagle, liberty, peace, crown, skull, moon, usa, music)
- [x] Realistic Plate: Improve CSS fallback plate + image loading robustness
  - [x] Shift plate up to create gap above bottom bar
  - [x] Improve CSS plate with metallic texture, embossed text, better shadows
  - [x] Add crossfade from fallback to image, eager loading
  - [x] Verify all 50 state images load from GitHub (confirmed 200 OK)
  - [x] Remove duplicate frame-level bolt holes (plate renders its own)
- [x] Bottom Bar: Lower within frame (gap created by shifting plate up)

## Visual Quality + Layout Fixes
- [ ] Fix bottom bar — extend from plate bottom to frame bottom edge
- [ ] Add 5th tile to left/right side rails (4 → 5 slots each)
- [ ] Update 4th of July presets to fill new side rail slots
- [x] Replace hand-drawn SVGs with Twemoji CDN (professional, consistent, free)
  - [x] Data already had Twemoji URLs — cleaned up 700 lines of dead custom SVG code
  - [x] Increased Twemoji image fill from 75% → 82% for better visual impact
- [ ] Find better license plate image source (higher res, photorealistic)

## "See It On Your Car" Preview
- [x] Create `CarSelector.tsx` — stock car buttons + upload photo picker
- [x] Create `CarPreview.tsx` — car photo with draggable/zoomable frame overlay
- [x] Create stock car SVG placeholders (sedan, SUV, truck)
- [x] Update `stock-cars.ts` to use SVG paths
- [x] Add Design/Preview tab toggle to `Designer.tsx`
- [x] Auto-capture frame when switching to preview tab
- [x] Build verification — zero TypeScript errors

### V2 Ideas
- [ ] Replace SVG placeholders with real rear-view photos (Unsplash/Pexels)
- [ ] Add more vehicle types (minivan, sports car, motorcycle)
- [ ] Persist preview overlay position per car
- [ ] "Snap to plate" auto-positioning
- [ ] "Share Preview" — export car+frame composite as image
- [ ] Re-capture frame automatically when edits happen while on preview tab

---

## Wings Feature — Horizontal Frame Extensions

### What Are Wings?

Wings extend the frame **left and right** to fill the car's plate basin — the recess
that's wider than the US plate (designed for European-width plates). The standard
frame stays **completely untouched**. Wings are a parallel system.

```
Standard (13.5" × 7.5"):
[top ——— 11 tiles ———]
[L] [  LICENSE PLATE  ] [R]
[BL] [ bottom bar  ] [BR]

Wing Frame (e.g., ~18" × 7.5"):
[————— top ——— ~15 tiles —————]
[WL][WL][L] [  LICENSE PLATE  ] [R][WR][WR]
[WL][WL][BL] [ wider bot bar ] [BR][WR][WR]
```

### Phase 1: Core Wing Frame System
> Render a wing frame with extra tile columns, togglable from the designer

- [ ] **1.1 Types** — Add `"wing-left" | "wing-right"` to `SlotZone`, add wing properties to `FrameConfig`
  - `wingWidthInches: number` (width of EACH wing, 0 = standard)
  - `wingColumns: number` (tile columns per wing, auto-calculated)
  - File: `src/lib/types/index.ts`

- [ ] **1.2 Constants** — Wing config helpers
  - `getWingFrameConfig(baseConfig, wingWidthInches)` — returns config with wings
  - `getStandardConfig(wingConfig)` — strips wings back to standard
  - `DEFAULT_WING_WIDTH = 2.5"` (2 tile columns per side — fits most basins)
  - File: `src/lib/constants/frame.ts`

- [ ] **1.3 Slot Generator** — Wing slot generation in `generateSlots()`
  - When `wingWidthInches > 0`: widen frame, shift plate/rails right by wing width
  - Generate `wing-left` slots: grid of (wingColumns × sideSlots) tiles
  - Generate `wing-right` slots: mirror of wing-left
  - Top rail: recalculate tile count for wider width
  - Bottom corners: shift to new outer edges
  - File: `src/lib/utils/slot-generator.ts`

- [ ] **1.4 Layout Utils** — Wing-aware positioning
  - `getPlateArea()` — shift plate right by wing width
  - `getBottomBarArea()` — widen to span full width (between outer corners)
  - New: `getWingArea(config, "left"|"right", containerWidth)` — wing bounds
  - File: `src/lib/utils/layout.ts`

- [ ] **1.5 Frame Canvas** — Render wing areas with rail grooves
  - Wing groove rendering (same matte-black style as existing grooves)
  - Tile slots render in wing zones just like top/left/right
  - File: `src/components/frame/FrameCanvas.tsx`

- [ ] **1.6 Frame Layout Hook** — Return wing areas
  - File: `src/hooks/useFrameLayout.ts`

- [ ] **1.7 Design Store** — `toggleWings` action
  - Switches between standard and wing config
  - `frameConfig` in undo/redo history
  - Clean up wing slots when disabling
  - `fillAll`/`randomFill`/`alternateSlots` include wing zones
  - localStorage migration for old configs
  - File: `src/stores/design-store.ts`

- [ ] **1.8 UI Toggle** — Wings switch in palette
  - Segmented control: Standard | Wings (matches DieCutToggle pattern)
  - File: `src/components/tiles/TilePalette.tsx`

### Phase 2: Photo-Based Basin Measurement
> User uploads car rear photo → guided tool → auto-sizes wings to their car

- [ ] **2.1 Basin Measurement Component**
  - Upload car photo (or reuse stock car / existing upload)
  - Overlay plate outline (locked 12:6 ratio) — user aligns to their plate
  - Plate = scale reference (12" known width)
  - Basin width markers on left/right — user drags to basin edges
  - Calculate: `wingWidth = (basinPx / platePx × 12 - 13.5) / 2 - safetyMargin`
  - Round to nearest 1.25" increment (tile size)
  - File: `src/components/measurement/BasinMeasure.tsx`

- [ ] **2.2 Measurement Store** — Persist photo + measurements
  - File: `src/stores/measurement-store.ts`

- [ ] **2.3 Measurement Flow** — Wire into designer
  - Enabling wings first time → prompts measurement
  - "Measure My Car" button in wings mode
  - Result feeds `wingWidthInches` into frame config

### Phase 3: Stock Car + Missouri Plate

- [ ] **3.1 Add Lexus LX 470** as stock car option
  - Copy IMG_5282.JPG → `public/stock-cars/lexus-lx470-rear.jpg`
  - Add to `src/data/stock-cars.ts`

- [ ] **3.2 Refine Missouri plate** from photo reference
  - Blue "Missouri" script at top, red number, "Show-Me State" motto
  - Update CSS fallback in `src/data/plates.ts`

### Phase 4: Polish & Verification

- [ ] **4.1** Export/PNG capture includes full wing width
- [ ] **4.2** Car preview overlay works with wing frames
- [ ] **4.3** Responsive — wing frame scales on mobile
- [ ] **4.4** Persistence — old localStorage loads cleanly
- [ ] **4.5** Presets — standard presets leave wing slots empty
- [ ] **4.6** Pricing — wing surcharge decision (check with product owner)

### Slot Count Reference
| Mode | Top | L | R | BL/BR | Wing-L | Wing-R | **Total** |
|------|-----|---|---|-------|--------|--------|-----------|
| Standard | 11 | 5 | 5 | 2 | 0 | 0 | **23** |
| Wings 2-col | ~15 | 5 | 5 | 2 | ~14 | ~14 | **~55** |
| Wings 3-col | ~17 | 5 | 5 | 2 | ~21 | ~21 | **~71** |
