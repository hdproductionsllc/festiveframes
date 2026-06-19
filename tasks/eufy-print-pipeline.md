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
