# School Frame Builder — Multi-Cell Snappets + Direct-to-Frame Print  (2026-07-20)

Full plan: `C:\Users\david\.claude\plans\dynamic-moseying-sutton.md`

Goal: turn `/lab/school` into a sellable school product — multi-cell snappets
(2x2, 2x4, 11x2) on a frame that fits the eufyMake E1 bed for direct printing.

## STYLE + INTERACTION DIRECTION (decided 2026-07-20, from Foundry research)

Three research agents examined the sibling `project-foundry` repo. Decisions:

- **Artwork = premade spirit-art library (~50–100 pieces WE draw) + customer upload.**
  NOT generative AI (rejected). NOT Foundry's procedural SVG engine (too big/closed).
  Correction: Foundry's art is NOT "ChatGPT style" — it is a deterministic procedural
  SVG renderer computing a metal look from 2 school colors. Its AI images are throwaway.
- **Interaction = OPEN** — drag-resize canvas + upload + content-first suggestion
  (Stages 3/4/7/8). Foundry is "pick approved options, no freeform"; we diverge.
- **Fonts = Foundry's collegiate stack, ALREADY in `BOTTOM_BAR_FONTS`** (Anton, Alfa
  Slab One, Oswald, Bebas, Staatliches). Curate the school picker to that subset,
  away from the Cartoon/Luckiest-Guy sticker identity. No new fonts needed.
- **Banners = templated like Foundry.** `src/data/school-phrases.ts` is 15 flat
  strings with a hardcoded stale `2026`. Move to: top=school name, bottom=audience
  phrase; `CLASS OF {year}` / `#{number}` / mascot-as-banner; four audience families
  (senior/parent/pride/alumni); restrained UPPERCASE voice, no exclamation points.

Full findings: task #11. Memory: `project_school_style_direction.md`.

## PRODUCT MODEL (from the product owner, 2026-07-20)

Three levels. The builder currently models level 1 and level 3, but has no concept
of level 2 as a **product** unit:

```
Frame (base, with rails)              <- sold once, kept
 └── 4 PANELS                         <- the repeat-purchase SKU, sold as a SET OF 4
      └── N snappets, various sizes   <- what the builder composes (1x1, 2x2, 11x2 ...)
```

- **First purchase:** base frame + a four-panel set = ONE bundle price.
  A 2-set discount is fine (the existing `priceForFramesCents` already bundles 2-for).
- **Repeat purchase:** an existing customer buys a newly designed snap-in set of
  four panels — a FULL replacement, no frame. **This is the retention play, and it
  is the reason panels must be a first-class unit rather than a rendering detail.**

### What this changes

- **Parts list (Stage 5)** must group by PANEL, then list the snappets within each.
  Today `buildPartsList` emits a flat tile tally with no panel level at all.
- **A panel-set SKU** has to exist independently of the frame SKU, so a replacement
  set can be ordered on its own.
- **Print output (Stage 6)** is likely FOUR panel images (or one assembled-frame
  image that is then cut/snapped), not 36 loose snappets on a jig tray.

### PHYSICAL CONSTRUCTION (product owner, 2026-07-20)

**Everything is a snappet.** All four panels are printed on snappets that snap onto
the base rail system. A "panel" is a logical REGION and a SKU grouping — it is not a
distinct physical part type.

- **Horizontal banners (top, bottom): the panel is ONE snappet.**
  Top = a single 10x1. Bottom = a single 10x2.
- **Vertical panels (left, right): MULTIPLE snappets of various sizes**, tiling the
  2-wide x 8-tall region. So side snappets are capped at 2 columns: 1x1, 2x1, 2x2,
  2x4, up to 2x8.

This reconciles what looked like two conflicting requirements — "print the full frame
fully assembled" AND "sell replaceable snap-in sets". Both hold:
  snap blank snappets onto the rail -> print the ASSEMBLED unit in ONE E1 pass
  (registration is trivial, one file) -> snappets stay individually removable, so a
  replacement set is just new snappets printed the same way.

**Snappet catalogue this implies (Stage 5):**
| Region | Size | Count per frame |
|---|---|---|
| Top banner | 10x1 | 1 |
| Bottom banner | 10x2 | 1 |
| Left panel | mixed, max 2 cols wide | N, tiling 2x8 |
| Right panel | mixed, max 2 cols wide | N, tiling 2x8 |

NOTE: the "11x2" size mentioned early on resolves to **10x2** — with left/right owning
cols 0-1 and 12-13, the banner span is cols 2-11 = 10 cells.

### INTERACTION MODEL: content-first, size-suggested (product owner, 2026-07-20)

**The customer does NOT pick a snappet size.** They pick CONTENT; the builder
suggests the snappet size whose aspect ratio maximizes the printed content, and
tells them what it snapped to.

This INVERTS the drag-a-2x4-tile model. `TilePiece.defaultSpan` is still the right
mechanism — but for uploads the span is COMPUTED from the image, not authored.

**Available shapes.** Side panels are 2 cols wide, so aspect = cols/rows caps at 2.0
and skews portrait. Largest snappet per distinct aspect:

| Size | Aspect | Cells | Matches |
|---|---|---|---|
| 2x1 | 2.000 | 2 | 2:1 |
| 2x2 | 1.000 | 4 | square |
| 2x3 | 0.667 | 6 | **2:3 exactly** |
| 2x4 | 0.500 | 8 | 1:2 |
| 2x6 | 0.333 | 12 | 1:3 |
| 2x8 | 0.250 | 16 | 1:4 |

Banners are fixed: top 10x1 (aspect 10.0), bottom 10x2 (aspect 5.0). No ordinary
photo fits those — banners are for TEXT, and any image there needs a purpose-made
wide crop.

**Measured crop survival** (cover-fit retention = min(a1,a2)/max(a1,a2)):

| Customer photo | Best fit | Kept |
|---|---|---|
| DSLR portrait 2:3 | 2x3 | **100%** |
| Square 1:1 | 2x2 | **100%** |
| Phone portrait 3:4 | 2x3 | 89% |
| Phone portrait 9:16 | 2x4 | 89% |
| Phone landscape 16:9 | 2x1 | 89% |
| School headshot 4:5 | 2x3 | 83% |
| Phone landscape 4:3 | 2x2 | 75% |
| DSLR landscape 3:2 | 2x1 | 75% |

**Portrait photos fit the vertical panels notably better than landscape**, and the
worst case still keeps 3/4 of the frame. Worth saying out loud in the UI ("portrait
photos fill this panel best") rather than silently cropping a third off someone's
landscape shot.

**CROP UI CHANGES THE VERDICT ABOVE.** (product owner, 2026-07-20: recrop / magnify /
drag-to-reposition.) Retention percentages measure how much of the image is DISCARDED
— they do not measure whether the customer minds. With a reposition+zoom crop, a 75%
retention stops being "we cut a third off your team photo" and becomes "you chose the
framing." **The crop UI is what makes landscape uploads shippable**; without it, that
75% row is a support-ticket generator. Treat it as required, not polish.

Already specced: `tasks/CUSTOM_TILE_UPLOAD_PLAN.md` §4 — pan + pinch/scroll zoom,
rule-of-thirds grid, reset, rotate 90, safe-area overlay, and crucially *export the
crop at the source's native resolution, not the on-screen size*.

**BORDERLESS PRINTING** (product owner, 2026-07-20): the E1 prints effectively
edge-to-edge, so:
- no white margin is needed on a snappet face — artwork fills the whole piece
- it confirms the existing overspray approach in `src/config/eufy-jig.ts`, which
  already prints a 1.03" image onto a 0.992" pocket face specifically so overspray
  hides the unprinted edge. Same idea, now official.
- the crop's safe-area overlay still matters: borderless means art runs to the edge,
  so faces/subjects near a boundary can still be lost to the physical snappet seam.
### SLOT vs CANVAS — a correction (2026-07-20)

An earlier note here claimed a mosaic "does NOT fix the aspect problem — a 2x8 panel
is 0.25 aspect however it is subdivided." The arithmetic was right and the conclusion
was wrong, because it assumed content must FILL its snappet. It need not.

A full-height snappet can be 3D-printed as ONE piece (product owner), and with
borderless printing that piece is a **canvas**, not a slot. Content sits ON it at its
native aspect:

| 4:3 landscape photo | keeps |
|---|---|
| SLOT model — fill the 0.25-aspect panel | **19%** |
| CANVAS model — full panel width, native aspect | **100%** (1.5 of 8 rows) |

| Photo | On a 1.98in-wide canvas | Rows used | Crop |
|---|---|---|---|
| 4:3 landscape | 1.98 x 1.49in | 1.5 / 8 | 0% |
| 3:2 landscape | 1.98 x 1.32in | 1.3 / 8 | 0% |
| 16:9 landscape | 1.98 x 1.11in | 1.1 / 8 | 0% |
| 3:4 portrait | 1.98 x 2.64in | 2.7 / 8 | 0% |

**Landscape photos are not a fit problem at all** once the panel is a layout surface.
The remaining space carries school colours, graphics, or further content. This
supersedes the "portrait fits better than landscape" guidance above — that only held
under the slot assumption.

### RESIZE-TO-EXPLORE (product owner, 2026-07-20)

The suggested size is a STARTING POINT, not a verdict. Once a snappet is placed the
customer can **drag and resize it to try different aspect ratios live**, with the
retention/quality meter updating as they go. Direct manipulation beats a one-shot
algorithmic pick — the customer sees the tradeoff instead of being told it.

**This makes Stage 4 (multi-cell drag/resize) central, not a power-user fallback.**
An earlier note demoted it on the assumption that content-first suggestion replaced
dragging. It does not: resize handles ARE the exploration mechanism. Stage 4 needs
resize handles on a placed snappet, not just drag-to-place.

### THE SIZING RULE (settled 2026-07-20)

> Panels are canvases. We place premade art and customer art on them, and can get any
> snappet dimension that fits the side panels **so long as it is a multiple of the base
> tile dimension (0.991").**

So: integer quantization HOLDS (the Stage 0 grid stands), and content sits ON the
snappet at native aspect with background filling the remainder. Both are true, and
together they give **zero crop**.

**Suggestion algorithm — maximize PRINTED ART AREA, not minimum background.**
(Minimizing background is the wrong objective: it picks a 1x1 for a landscape photo,
which has the least background AND a quarter the print size. The stated goal is to
maximize print content.)

```
for each integer (cols, rows) that fits the panel's free space:
    artW = cols * tile
    artH = artW / imageAspect          # native aspect, never distorted
    rows = ceil(artH / tile)           # integer rows that CONTAIN the art
    score = artW * artH                # maximize; tie-break on less background
```

Result for real customer photos — **every row is zero crop**:

| Photo | Snappet | Art (in) | Area | Background | Rows used |
|---|---|---|---|---|---|
| 2:3 portrait | 2x3 | 1.98 x 2.97 | 5.89 | **0%** | 3 / 8 |
| 9:16 portrait | 2x4 | 1.98 x 3.52 | 6.98 | 11% | 4 / 8 |
| 3:4 portrait | 2x3 | 1.98 x 2.64 | 5.24 | 11% | 3 / 8 |
| 4:5 headshot | 2x3 | 1.98 x 2.48 | 4.91 | 17% | 3 / 8 |
| 1:1 square | 2x2 | 1.98 x 1.98 | 3.93 | **0%** | 2 / 8 |
| 4:3 landscape | 2x2 | 1.98 x 1.49 | 2.95 | 25% | 2 / 8 |
| 3:2 landscape | 2x2 | 1.98 x 1.32 | 2.62 | 33% | 2 / 8 |
| 16:9 landscape | 2x2 | 1.98 x 1.11 | 2.21 | 44% | 2 / 8 |

Always 2 columns (full panel width = maximum print). Rows follow the aspect.

**Panel capacity:** a side panel is 8 rows, so roughly 4 landscape photos, or 2
portraits, or a mix — plus whatever premade art shares the space.

**Where resize handles earn their keep:** 16:9 lands 44% background. Some customers
will want that filled instead. Dragging the snappet edge to 2x1 trades background for
crop, and the live meters show exactly what they are giving up. The algorithm picks a
sane default; the handles let them disagree with it.

### What each panel CARRIES

- **TOP + BOTTOM = banners.** Text like "PARKWAY WEST" / "TIGERS — CLASS OF 2027".
- **LEFT + RIGHT = customizable fields.** This is where the multi-cell snappet work
  actually earns its keep — achievements, mascots, varied piece sizes.
- Physically all four are still assembled from snappets of various sizes; the
  distinction above is about CONTENT, not construction.

**Pricing: never per snappet.** Flat bundle (frame + 4-panel set), with a 2-set
discount. Confirmed against the code — `priceForFramesCents` (`src/config/offers.ts:58`)
already prices purely on unit count with a 2-for bundle and never inspects tiles.

**Priority consequence:** the top/bottom banner case is largely SOLVED already —
`PlacedTextBar` + `BottomBarEditor` + section `text` mode do auto-fitting text with
~50 fonts. The genuinely new work is the LEFT/RIGHT fields.

### The four panels map onto the existing zones

`SectionId = "wing-left" | "wing-right" | "top" | "bottom"` (`src/lib/types/index.ts`)
and `SECTION_IDS` (`src/lib/utils/sections.ts`) already enumerate exactly four. The
concept is modelled — it is just not a product unit yet.

### RESOLVED 2026-07-20 — panel boundaries. AND: PANELS ARE NOT ZONES.

Left and right panels span the FULL vertical, owning all four corners:

```
        col: 0  1  2 ......... 11  12 13
   row 0    [L  L][T  T ... T  T][R  R]
   row 1    [L  L]  · plate ·   [R  R]
    ...     [L  L]  · plate ·   [R  R]
   row 5    [L  L]  · plate ·   [R  R]
   row 6    [L  L][B  B ... B  B][R  R]
   row 7    [L  L][B  B ... B  B][R  R]

   LEFT  cols 0-1, rows 0-7 = 16 cells      TOP    cols 2-11, row 0   = 10 cells
   RIGHT cols 12-13, rows 0-7 = 16 cells    BOTTOM cols 2-11, rows 6-7 = 20 cells
```

Verified exact: 16+10+16+20 = **62** = the ring (14x8 minus the 50-cell plate hole).
No gaps, no overlaps.

**But this partition does NOT align with `SlotZone`.** Measured:

| Panel | Zones it cuts across |
|---|---|
| LEFT | `wing-left` 8, `top` 1, `left` 5, `bottom` 2 |
| RIGHT | `wing-right` 8, `top` 1, `right` 5, `bottom` 2 |
| TOP | `top` 10 |
| BOTTOM | `bottom` 20 |

A panel is a RECTANGLE IN GRID SPACE. Zones are six disjoint flat index spaces and
structurally cannot express one — the left panel alone needs cells from four of them.
This is precisely the case the Stage 0 unified `(row, col)` grid exists to serve.

**Live consequence — the sections UI is already mislabelled.** `SectionControls`
shows "LEFT PANEL", but `SectionId` is `wing-left`, i.e. column 0 only = 8 cells.
The physical left panel is 16. So setting LEFT PANEL to Image today fills only HALF
the panel, and the `top`/`bottom` zones each leak 1 and 2 cells per side into the
side panels.

**DONE in Stage 4.5** (verified 2026-07-20):
- new `src/lib/utils/panels.ts` — `panelRects(config)` + `panelOf(row,col,config)`,
  derived from the grid, not hardcoded
- `grid.panelAt(row,col)` added to `FrameGrid` alongside `isPlate`/`isOutside` (a
  cleaner home for panel ownership than threading config — the implementer's call)
- `slotSuppressed(slot, sections, config)` now resolves by panel, not zone; all
  callers updated (FrameCanvas, snappet visibleAnchorSlots + canPlace)
- `sectionBounds` unions per PANEL via `panelOf`
- `canPlace` gained the PANEL CONTAINMENT rule (reason `"panel"`): a footprint may
  not straddle two panels — subsumes the side-panel 2-col cap, still allows the
  legal wing+rail 2x2
- section id STRINGS kept stable (`wing-left` etc.) so no persist migration
- **Verified by my own screenshots:** LEFT-to-Image now fills all 16 cells incl.
  both corners (was 8 — the half-panel bug); TOP-to-Image fills only the inner 10,
  corners left to the side panels. 126 tests pass, `/build` pixel-intact.
- Parts list grouping by panel is the REMAINING piece → Stage 5.

## Stages

- [x] **Stage 0 — grid coordinate layer + gapless width fix**
  - [x] Add `row`/`col` to `FrameSlot`, add `GridCoord`
  - [x] Add `buildGrid(config)` — the unified lattice all six zones map into
  - [x] Fix `SCHOOL_FRAME_CONFIG.widthInches` 12 → 11.892 (rails were NOT gapless;
        `topStep` was 1.0008" against a 0.991" tile, drifting 0.108" across the row)
  - [x] Unify 4 copies of the wing-row count into `wingRowCount(config)`
  - [x] Add `gridInvariantHolds(config)` so a future config can't silently break the lattice
  - [x] Stand up vitest (matching project-foundry's convention) + 24 tests
  - [x] Verified: typecheck clean, lint clean, 24/24 pass, both builders render

- [x] **Stage 1 — wing trim to 1 column + store v7**
  - [x] `wingColumns: 3 → 1` (total width 17.95" → 13.87", fits the bed rotated)
  - [x] Persist v6 → v7 via `migrateExtra?` on `createDesignStore` (new
        `src/lib/utils/school-migration.ts`), passed only by `SchoolBuilder`.
        `/build` still calls `createDesignStore(name)` with no options at all.
  - [x] Fix `mirrorTopSlots` + `setWingColumns` — both rewritten in grid space
  - [x] Swap the test suite's local `TRIMMED` config for `SCHOOL_FRAME_CONFIG`
  - [x] **Found + fixed (adversarial review):** `SchoolDesigner`'s mount effect
        called `loadDesign({slots:{}})` unconditionally — a FULL replace one frame
        after persist hydrated, wiping a returning user's design AND writing the
        blank back over it. Made `migrateSchoolDesign` unobservable. The effect is
        now GONE; frame geometry is owned by the store instance instead.
  - [x] **Found + fixed:** `mirrorTopSlots` also ignored `bottomRows`, so the
        school frame's whole 2nd bottom row was never mirrored — same bug class as
        the wing one, in the same function.

- [x] **Stage 2 — span in the model, 1x1 everywhere** (no visible change)
  - [x] `PlacedTile.span?` + `TilePiece.defaultSpan?` + shared `TileSpan` type
  - [x] New `src/lib/utils/snappet.ts` — `tileSpan`, `occupiedCoords`,
        `coveredBySnappets`, `snappetRect`, `canPlace`
  - [x] Store routed through the expander; `fillEmpty` skips covered cells
  - [x] Three duplicated count loops consolidated into `src/lib/utils/tile-tally.ts`
  - [x] **Found + fixed:** `mirrorTopSlots` copied a span verbatim to the reflected
        anchor — translating a wide footprint instead of reflecting it, and
        bypassing `canPlace` entirely. Now `mirrorCol = cols - col - span.cols`
        and every write goes through the same gate as `placeTile`.
  - [x] **Found + fixed:** `canPlace` had no notion of text bars, so a multi-cell
        footprint could be seated under a banner — and `clearCoveredTiles` would
        never remove it, because it matches on anchor ids only. `barCovered` is
        now a required field on the placement context.
- [x] **Stage 3 — render multi-cell spans**
  - [x] `coveredBySnappets` + `hasAnySpan` gate; anchors sized via `snappetRect`;
        covered cells render droppable-only; dedicated overflow-visible snappet layer
  - [x] **Found + fixed (adversarial):** overhang layer gave the whole PAGE a
        horizontal scrollbar / painted over app chrome. Verified fixed — seeded a
        deliberate 3-wide overhang, page horizontal overflow = false.
  - [x] **Found + fixed:** `covered` was computed from ALL slots but anchors drawn
        from visible slots → a snappet anchored in a section-suppressed zone left
        dead chrome-less holes. Root-caused: both store and render now resolve
        coverage through the SAME `visibleAnchorSlots(slots, grid, sections)`.
  - [x] Verified visually (my own screenshots, valid piece ids): cross-zone 2x2
        (wing+rail), 2x4 tall, 10x2 banner all render as single scaled images;
        `/build` pixel-intact.

- [x] **Stage 4 — multi-cell drag/drop + preview**
  - [x] `resolveSnappetDrop` → `SnappetPreview`; droppables stay 1x1 (drag-off
        removal margin preserved); grab offset; span-sized DragOverlay ghost;
        valid/invalid preview treatment
  - [x] **Found + fixed:** `SnappetPreview.evicts` computed but never drawn — a
        valid drop could silently delete a mostly-off-cue snappet.
  - [x] **Found + fixed:** the SAME store-vs-render coverage divergence as Stage 3,
        on the drop path — placing a 1x1 on a suppressed snappet's footprint cell
        silently deleted the hidden snappet. Now regression-tested
        (`design-store.test.ts` — "Hide the LEFT panel… snappet paints nothing").
  - NOTE: this built DRAG-TO-PLACE. RESIZE-TO-EXPLORE (drag handles on a PLACED
        snappet, live meters) is the product-owner direction and is NOT yet built —
        see Stage 8. Scope the gap before the next drag pass.
- [ ] **Stage 5 — real multi-cell pieces + parts-list counting**
  - NOTE: the plan flagged a possible REVENUE BUG here — "if pricing is
    per-placed-tile, a 2x4 prices as a single 1x1". **Investigated 2026-07-20: it
    does not exist.** The authoritative charge is `priceForFramesCents(frames)`
    (`src/config/offers.ts:58`), used by `src/app/api/checkout/route.ts` as the
    Stripe `unit_amount`. It is a pure function of the FRAME COUNT with a 2-for
    bundle — `floor(n/2)*bundlePrice + (n%2)*singlePrice` — and never looks at
    tiles. So a 2x4 costs the customer exactly what a 1x1 does, by design.
    Stage 5 still needs span-aware parts-list COUNTING (a 2x4 is one physical
    part, not four) for production, but no pricing change is required.
  - DEAD CODE spotted while checking: `computePricing`
    (`src/lib/utils/pricing.ts`) is imported only by
    `src/components/checkout/PricingBreakdown.tsx`, which is mounted NOWHERE.
    Both are unreachable. Candidate for deletion — confirm before removing.
- [ ] **Stage 6 — direct-to-frame eufy print** — UNBLOCKED (thickness handled)

  **Pre-flight audit 2026-07-20 (verified current, post stages 0-4):**
  - The proof/export renderer `compose-frame.ts` is **span-BLIND**. It walks
    `generateSlots` 1x1 slots and draws `slots[slot.id]` per cell, so a 2x4 renders
    only its anchor cell as a 1x1 and the covered cells draw as empty/white. The
    on-screen `FrameCanvas` was made span-aware in Stage 3, but this SECOND renderer
    was not — they have diverged. Any Stage-6 print path must be span-aware or reuse
    the Stage-2 expander (`coveredBySnappets` / `snappetRect`).
  - `composeFrameImage` still reads `defaultDesignStore.getState()` (`compose-frame.ts:114`)
    — hardcoded to /build's store. A school export would render **/build's** design.
    Must become params-in.
  - Text bars still draw at `bar.startIndex * tile` (no wing offset) and `H - tile`
    (`compose-frame.ts:203`) — wrong x and wrong row on winged / 2-row frames.
  - `buildPrintQueue` (`eufy-print-core.ts:62`) tallies `Object.entries(slots)` —
    span-blind, so a 2x4 counts as one 1x1 snappet in the jig plan.
  - **The whole thing is LATENT for now:** `SchoolDesigner` has NO export/order path
    (verified — `composeFrameImage` is called only from `Designer.tsx` = /build, and
    `ExportPartsList.tsx`). So none of the above is a live bug yet; it is precisely
    the Stage-6 build surface. Nothing to fix until we wire school output.
  - Physical model settled: everything prints on snappets that snap onto the rail,
    so the print output is the assembled frame in ONE E1 pass — reuse `generateSlots`
    at `containerWidth = totalWidthInches * dpi` (its px IS print-space px), `setPngDpi`,
    `loadArtworkBuffer` (export it from `eufy-print-server.ts`).

- [ ] **Stage 7 — customer artwork upload at PRINT resolution** (NEW, 2026-07-20)

  Panel-level upload ALREADY EXISTS: `SectionEditor.tsx:90` →
  `downscaleToDataUrl(file, 1200)`, auto PNG-vs-JPEG by transparency detection,
  Fill/Fit toggle, `accept="image/*"`. It is good UX and works today.

  **But it cannot print.** The 1200px cap was chosen for localStorage quota, not
  for production. Measured against this project's own standard in
  `tasks/CUSTOM_TILE_UPLOAD_PLAN.md` (300 DPI target / 240 floor / 200 hard block):

  | Panel | Size | At 1200px | Verdict | Needs (240 DPI) |
  |---|---|---|---|---|
  | Left / Right | 1.98" x 7.93" | **151 DPI** | BLOCKED | 1903 px |
  | Top banner | 13.87" x 0.99" | **86 DPI** | BLOCKED | 3330 px |
  | Bottom banner | 13.87" x 1.98" | **86 DPI** | BLOCKED | 3330 px |

  **Root cause is architectural, not a constant to bump.** Images are stored as
  base64 data URLs inside the persisted zustand blob in localStorage — which is
  exactly why `SchoolDesigner` already carries a `storageFull` quota-exceeded
  banner. Print-res art (3330–4163 px) as base64, times four panels, is many MB
  and will blow the ~5–10 MB localStorage budget outright.

  So the fix is a split:
   - keep a small data URL as the ON-SCREEN preview (what exists today), and
   - upload the full-resolution ORIGINAL to the server, referenced by id, and
     composite THAT at print time.

  Also required before shipping user-generated prints, per the existing plan doc:
   - a live resolution gate / quality meter (green ≥ target, amber, red = blocked)
     computed on the CROPPED region, never on the raw upload — and never upscale
     to fake it
   - a crop UI locked to the target panel's aspect
   - **content moderation.** `CUSTOM_TILE_UPLOAD_PLAN.md` marks this REQUIRED. It
     matters more, not less, for a school product.

  `tasks/CUSTOM_TILE_UPLOAD_PLAN.md` is a thorough pre-existing spec for the
  TILE-level version of this. Reuse it; retarget the geometry from a 1.25" tile to
  the four panel sizes above.

## Blocked

- **Stage 6** needs the assembled frame thickness measured against the E1's stated
  5 mm object clearance. If the stack is thicker, direct-print-on-assembled changes
  shape and we fall back to pre-printed snappets. Calipers before code.

## The /build regression gate

`/build` must stay unchanged at every stage boundary. Run `npm test` — the
`/build regression gate` block asserts 36 slots, stable ids, and stable px geometry.
If it fails, stop.

## Verified bugs found (all pre-existing, none introduced by this work)

1. School rails not gapless — **fixed in Stage 0**
2. `wingRows = leftSlots + 1` in two store functions, under-counting by 2 — Stage 1
3. `composeFrameImage` reads `defaultDesignStore`, so school exports render
   `/build`'s design instead — Stage 6
4. Text bars export at the wrong x/y on winged + 2-row frames (missing wing offset,
   wrong bottom row) — Stage 6
