# Task: Process Becky Newman 4th of July snappet artwork — DONE (branch master, no commit)

## Replacements (drop-in PNG swap, id/name/registration unchanged)
- [x] `Final Waving flag.png` -> public/tiles/july4/waving-flag.png
- [x] `Final Firecracker snappet.png` -> public/tiles/july4/firecracker.png
- [x] `Final white star with red square.png` -> public/tiles/july4/star-red.png
- [x] `Final white star with blue square.png` -> public/tiles/july4/star-blue.png

## New featured tiles (PNG copied + registered)
- [x] colonial-flag.png — id july4th:colonial-flag, "Colonial Flag"
- [x] pinwheel-snappet.png — id july4th:pinwheel-snappet, "Pinwheel"
- [x] pennant-blue-dot.png — id july4th:pennant-blue-dot, "Blue Pennant"
- [x] pennant-red-stripe.png — id july4th:pennant-red-stripe, "Striped Pennant"

## Processing
- [x] Resized all to 1200x1200, palette PNG, alpha preserved on the 6 die-cut shapes
      (star-red/star-blue are full-bleed square designs with no transparent area — correct)
- [x] Added 4 new ids to DIE_CUT_ELIGIBLE in TileArtwork.tsx
- [x] Registered 4 new tiles in FEATURED section of fourth-of-july.ts

## Decision
- Pinwheel: ADDED as new realistic die-cut snappet (july4th:pinwheel-snappet).
  Existing flat geometric pattern july4th:pinwheel left untouched (different art, still valid).

## Verify
- [x] npx next build — exit 0
- [x] npm run lint — 0 errors, 19 pre-existing warnings (none in changed files)
