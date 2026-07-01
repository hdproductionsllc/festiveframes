# Builder Overhaul — Plan (2026-06-30)

Five workstreams, ordered safest-first. All work on a feature branch → PR → CI green →
manual verify → merge (master auto-deploys to the LIVE store, no staging).

Branch: `feat/builder-overhaul-float-print-split`

---

## 1. Drag-and-drop corner-jump fix  — smallest, highest-confidence  ✅ DONE
The drop-cue flashes to the top-right corner the instant you pick up a tile, before you move.

Root cause: `src/components/designer/DndProvider.tsx:74-76` — on the first collision
frame, `pointerCoordinates` is briefly `null`, so it falls back to `closestCenter`,
which snaps to a corner cell. The `// keyboard drag` justification is stale (no
KeyboardSensor is registered).

- [x] Changed `if (!pointer) return closestCenter(args)` → `if (!pointer) return []`
      (no target until the real pointer arrives; cue stays hidden, no corner flash).
- [x] Removed now-unused `closestCenter` import; left `useDragTile.ts` untouched.
- [ ] Verify in browser: cue appears only under the cursor, never in a corner; mobile OK.

## 2. eufy print split — tiles on one run, banners on another (same geometry)  ✅ DONE (pending render test)
Today `planEufySheets` merges banners onto the tile sheet. Split them; geometry/jig/DPI unchanged.

- [x] `eufy-print-core.ts` — `planEufySheets` returns `{ tileSheets, bannerSheets }`.
      Tiles paginate across the FULL pocket set on every sheet (delete `sheet1Centers`,
      `clearsBanners`, `exclusiveRowYs`, `sheetIdx===0` special-casing). Keep banner
      placement geometry verbatim but emit as `bannerSheets` (tiles: []).
- [x] Removed now-dead `FULL_ROW_BANNER_UNITS` + `exclusiveRowY` + `clearsBanners`.
- [x] `EufyPrintResult`: `sheets` → `tileSheets`/`bannerSheets` (kept `bannerCount`).
- [x] `eufy-print.ts` + `eufy-print-server.ts` — single `renderSheets` helper run over both.
- [x] `ExportPartsList.tsx` `downloadEufySheets` — both sets, `-tiles-`/`-banners-` filename tags.
- [x] `fulfill.ts` `renderEufyPrintSheets` — names + combines both into `printSheets`.
- [ ] Verify (render test): tiles+banner → separate tiles sheet AND banner sheet; tile
      sheet fills every pocket (no gaps where the banner used to sit).

## 3. Desktop floating frame — two-column studio  ✅ DONE (pending browser check)
Today desktop stacks canvas (full-width band) on top, palette+editor below → scrolling the
frame off-screen. Make canvas a left column pinned in place; tools scroll on the right.

- [x] `Designer.tsx` `<main>` only — desktop two-column via explicit grid placement:
      canvas `lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 lg:self-start`;
      palette `lg:col-start-2 lg:row-start-1`; editor `lg:col-start-2 lg:row-start-2`.
- [x] All changes `lg:`-gated; mobile `order-1/2/3` stack preserved; DOM order unchanged.
- [x] `build-skin.css` and `BuildChrome` untouched.
- [ ] Verify in browser: desktop >=1024px — frame floats while tools scroll; mobile unchanged.

## 4. Taller bottom bar — optional full-width 2-row banner  — CONFIRM GEOMETRY
Default unchanged. Add a button; when on, the bottom becomes a 2-row full-width banner.

**Proposed geometry (NEEDS YOUR OK):** turning the extension ON grows the frame downward by
one tile row (7 -> 8 rows tall, height 6.937" -> ~7.928"); the bottom **2 rows x full 13-unit
width** become a single banner; no tiles allowed in that region. At 1 row (default) the bottom
stays "tiles or a normal banner" exactly as today.

- [ ] Add an "Extend bottom banner (full width)" toggle in `BottomBarEditor`.
- [ ] Design store: a `bottomBarRows: 1 | 2` (or `extendedBanner: boolean`) flag, persisted.
- [ ] When extended: force a full-width banner (`widthUnits` = row length, `startIndex` = 0,
      height = 2 tiles), clear tiles under it, block tile placement there.
- [ ] `FrameCanvas.barRect` + frame height/aspect: support a 2-tile-tall banner and the
      added row when extended.
- [ ] Print (banner sheet from #2): render the 2-tall full-width banner at `h = 2*facePx`.
- [ ] Verify: toggle on -> frame grows a row, bottom is one full-width 2-tall banner, no tiles
      there; toggle off -> reverts to today's behavior; banner prints correctly on its own sheet.

## 5. Deploy / safety
- [ ] Feature branch; PR into master; let CI (`lint` + `build`) go green.
- [ ] Manually verify print output (tiles sheet + banner sheet) before merge — fulfillment
      uses `@napi-rs/canvas` server-side and only fails at order time, not at build.
- [ ] Merge -> Railway auto-deploys to www.festiveframes.co.

---

## Sequencing
Do #1 (drag) and #3 (float) first — independent, low-risk, instantly verifiable UX wins.
Then #2 (print split). Then #4 (taller bar) — it depends on #2's banner-sheet path.
Open the PR after #1-#3; fold in #2 and #4 once geometry is confirmed.
