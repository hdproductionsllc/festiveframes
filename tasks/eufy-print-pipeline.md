# eufyMake E1 print-pipeline (production / fulfillment)

## Goal
Turn a finished customer design (a frame = N square tiles, each with artwork) into a
**single print-ready PNG laid out to our physical 3D-printed jig**, so we import it once
into eufyMake Studio, align to the jig's zero-point, and UV-print all the tile faces in
one pass. Then pop the tiles out and ship them as the kit. No Adobe, no Firefly, no API.

## What the .ai actually is (confirmed by parsing it)
- It is the **jig layout**, not a product. Brown circles = pockets that hold the round
  underside of each square tile, flat printable face up.
- Sheet: **9.900" x 3.300"**. Grid: **3 rows x 9 cols = 27 pockets**.
- Printable face per tile: **~0.946" square**, centers on a ~1.1" pitch.
- Exact pocket centers (points, origin bottom-left):
  - cols: 40, 118, 199, 277, 356, 434, 514, 592, 673
  - rows: 198 (top), 119 (mid), 40 (bottom)

## Why this is easy in our app
`src/lib/utils/compose-frame.ts` already drops images into slots on a `<canvas>` and
exports a PNG. The eufy print file is just a **second render target of the same data** —
tiles laid on the jig grid instead of the on-screen frame.

## The pipeline
1. **Jig config** — new `src/config/eufy-jig.ts`: sheet size, DPI, pocket grid (cols/rows
   in inches), printable tile size. Geometry-as-data so a real jig that differs from the
   draft .ai is a one-line edit (de-risks the #1 unknown — see Open Questions).
2. **Print-sheet renderer** — new `composeEufyPrintSheet()`:
   - Canvas = 9.9" x 3.3" x DPI (default **720** -> 7128 x 2376 px), **transparent bg**
     (alpha drives the eufy white-underbase automatically).
   - Collect the design's required tiles (by artwork + quantity), draw each into the next
     pocket at its exact center, sized to 0.946" square (cover-fit, tile corner radius).
   - **Paginate**: >27 tiles -> sheet 1..k. Each sheet a separate PNG.
   - Filename: `{order}-eufy-sheet-{n}-of-{k}.png`.
3. **Operator UI** — add "Download eufy print sheet" to the existing production modal
   (`ExportPartsList.tsx`). Show pocket fill count + sheet count so the operator knows how
   many jig loads a run takes.
4. **Verify** — render a real design, eyeball registration against the .ai preview, confirm
   px dims + transparency + DPI metadata are print-correct.

## STATUS: v1 built + verified (2026-06-19)
- [x] `src/config/eufy-jig.ts` — geometry from the .ai (27 pockets, 0.946", 9.9x3.3, 720 DPI)
- [x] `src/lib/utils/eufy-print.ts` — `composeEufyPrintSheets()` + pHYs DPI tagging
- [x] `ExportPartsList.tsx` — "eufyMake print sheet" button + status line
- [x] Verified: pocket overlay registers dead-center on the .ai proof; pHYs reads 720 DPI;
      tsc + eslint clean. (Decisions: set+quantities, hand-sort, 720 DPI, config-driven jig.)

## Fork: 3×12 variant (Bill's new Snappet tray) — 2026-06-20
Bill rebuilt the holding jig as a **3×12** set (fill more bed per pass) and tightened the
snappet pockets. New specs: **1.06″ pitch**, **0.992″ pocket face**, print images scaled to
**1.02″** (slight overspray hides the unprinted snappet edge). Decision (Henry): **keep the
3×9 export exactly as-is and fork** — add a second button, run both, merge later.

- The dropped file `LPF FF Snappet UV Printer Organizer Tray 062026.AI` turned out to be a
  **page-fit bitmap** (1364×1052, ~124 DPI), not a real-scale vector. Image analysis
  (`scripts/measure-jig.mjs` + raster pass) confirmed a **perfectly even, square, centered
  3×12 grid** (fit residual 0.03 px) — which resolves the inconsistent arithmetic in Bill's
  email — but it can't give true inches. So absolute scale = Bill's measured **1.06″**.
- Because the grid is provably even, the whole config follows from that one pitch.
  `src/config/eufy-jig.ts` now has `makeGridJig()` + `EUFY_JIG_3X12` (36 pockets,
  12.652″ × 3.112″ sheet, 720 DPI, 1.02″ face). The renderer was already jig-parameterised
  (`composeEufyPrintSheets(jig)`) — no change.
- **MERGED (Henry, 2026-06-20):** production moved fully onto the 3×12 tray. The 3×9 button
  was retired from `ExportPartsList.tsx` — only **"eufyMake 3×12 print sheet"** is shown now
  (desktop-only, filenames `-eufy-3x12-sheet-…`). The 3×9 geometry is **kept** in
  `eufy-jig.ts` as `EUFY_JIG` (still the default for `composeEufyPrintSheets`/`jigPocketCount`),
  so re-adding its button later is a few lines.
- **TODO when a real-scale tray file arrives:** re-measure exact centers (like the 3×9) and
  replace the numbers in `EUFY_JIG_3X12` — one edit.
- **Bed fit: CONFIRMED (Henry, 2026-06-20)** — eufyMake E1 **Mini Flatbed = 330 × 90 mm
  (12.992″ × 3.543″)**. The 3×12 sheet (12.652″ × 3.112″) fits with ~0.34″ (8.6 mm) spare on
  the long axis and ~0.43″ on the short. The 3×9 (9.9″ × 3.3″) fits comfortably too. The bed's
  long axis (12.992″) is the hard ceiling — a 3×13 set (13.712″) would NOT fit, so 3×12 is the
  max single-pass column count at 1.06″ pitch.

## Solid-color tiles: print all but white (2026-06-20)
We stock **only white blank snappets**. So in `composeEufyPrintSheets`, a no-artwork tile
skips UV printing **only if its color is white** (near-white tolerance ≥240 per channel, e.g.
"Snow White" #F5F5F5). Every other solid color (Holly Red, Gold, Silver, …) has no matching
blank, so it's **printed as a solid opaque fill** onto a white snappet (the printer adds the
white underbase). Earlier code skipped *all* no-artwork tiles — that silently dropped colored
tiles from the sheet. `skippedBlankTiles` now means white-only.

## Server-side AUTO-ATTACH at fulfillment (2026-06-28)
The print sheet now generates **automatically on the server at fulfillment** and is
**attached to the production email** — zero clicks, on both mobile and desktop orders.
This closes a gap: commit `0ef695f` (2026-06-26) removed the client-side render from
add-to-cart "to keep checkout snappy / regenerate at fulfillment" but the fulfillment
render was never built, so from 2026-06-26 onward NO order shipped with a print sheet.

- `@napi-rs/canvas` (prebuilt native canvas, no system deps; Railway linux-x64) +
  `serverExternalPackages` in next.config.ts.
- `src/lib/utils/eufy-print-core.ts` — pure shared logic (queue build, white-snappet
  skip, pHYs DPI tag) so the browser + server renderers can never drift.
- `src/lib/utils/eufy-print-server.ts` — `composeEufyPrintSheetsServer(design, jig)`;
  artwork loads from `public/` on disk (local `/tiles/...`), HTTP (remote CDN), or
  base64 (`data:`). Defaults to `EUFY_JIG_3X12`.
- `src/lib/order/fulfill.ts` — renders from the SAVED `draft.design` for both single
  orders and carts; wrapped so a render failure NEVER blocks the paid order (email
  then shows the regenerate-on-desktop fallback note).
- The desktop "eufyMake print sheet" button (ExportPartsList) still works for manual
  regeneration — same shared core, identical output.

## CONSOLIDATED sheet: tiles + banners on ONE sheet (2026-06-28)
Banners now print on the SAME eufy sheet as the tiles → one print job per design
(no more separate banner PNG attachments). Geometry (Henry's spec):
- Banner height = 1 tile face (1.02"); width = widthUnits × 1.02" (same scale as tiles).
- ALL banners sit bottom-right, right edge FLUSH with the sheet's right edge.
- Multiple banners stack upward from the bottom; BIGGEST (widest) on the bottom.
- Leftover (banner length ≠ pocket pitch) is the gap to the LEFT of each banner.
- Tiles fill pockets in reading order, SKIPPING pockets a banner covers; excess
  tiles paginate onto plain pocket-grid sheets after sheet 1.

Implementation:
- `planEufySheets(queue, bannerWidthUnits, jig)` in eufy-print-core.ts is the single
  source of truth for the geometry (shared by both renderers).
- Banner artwork = the FONT-PERFECT PNG the customer saw (client-rendered at checkout,
  stored in `artifacts.banners`), composited onto the sheet — so we DON'T have to
  vendor the ~25 banner Google fonts server-side. The server matches each text bar to
  its banner PNG by name (`banner-${row}-${startIndex}`).
- fulfill.ts drops the separate banner attachments only when every banner landed on
  the sheet (`bannerCount === banners.length`); otherwise keeps them as a fallback.
- NOTE: if a banner PNG is missing from the draft (rare client render timeout at
  checkout), that banner can't be composited → it's kept as a separate attachment
  fallback. A v2 robustness option is server-side banner text rendering (needs the
  fonts vendored).

## Scope (v1 vs later)
- v1: square tiles only -> jig sheets.
- Later: text bars (1xN custom parts, longer than a pocket) get their own print layout;
  the 12x6 plate image; auto/registration mark; multi-order batching to fill jigs.

## Honest limitation
The eufyMake E1 has **no API / hot-folder / CLI** (researched). We can generate the
print-ready PNG automatically, but a human still imports it into eufyMake Studio and
presses print. That's the streamline ceiling without UI-automation hacks.

## Open questions (must confirm before/while building)
1. **Does the measured jig (27 pockets, 0.946" face, 9.9x3.3) match the REAL 3D-printed
   tray?** If the printed tray differs, the PNG won't register. Geometry is config-driven
   so it's adjustable, but I need the true numbers.
2. **Fill order** when a design has fewer/more than 27 tiles — does pocket position matter,
   or just print the right SET and quantities and sort by hand? (Assumed: set + quantities.)
3. **DPI** — 720 (matches native art res, small files) vs 1440 (printer max, ~4x file).
