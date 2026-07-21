# School Print Output (safe half)  (2026-07-21)

Scope: give the school design a PRINT-READY output — a high-DPI PNG of the whole
assembled frame + a panel-grouped parts list. NEW renderer; do NOT touch
compose-frame.ts / fulfill.ts / Stripe. /build stays byte-identical.

## Plan — DONE
- [x] 1. NEW `src/lib/utils/compose-school-frame.ts`
  - [x] Pure geometry helpers: `schoolCanvasSize`, `shouldRotateForBed`,
        `schoolBannerRect` + `schoolRenderMetrics` (wing offset + base bottom row =
        the compose-frame banner bug fixed HERE)
  - [x] `drawSchoolFrame(ctx, design, images, W, H)` — env-agnostic (browser canvas
        AND @napi-rs/canvas): plate, ring+wing tiles, multi-cell snappets (uploaded
        art full-res), text/image sections, banners
  - [x] `composeSchoolFrame(design, opts)` — browser entry: preload (Image +
        getFullRes + QR), draw, rotate to 16.5x13 bed, setPngDpi → data URL
  - [x] copied small helpers; imported shared text-bar fit fns; compose-frame UNTOUCHED
- [x] 2. Export button in SchoolDesigner header ("Export print file") — client-only PNG download
- [x] 3. Additive `buildPanelPartsList` in parts-list.ts (groups by `grid.panelAt`);
        flat `buildPartsList` byte-identical
- [x] 4. Tests: geometry + drawSchoolFrame napi smoke + panel grouping + /build regression
- [x] 5. tsc / vitest (206 pass) / eslint all clean; sample PNG rendered → scratchpad → Read OK

## v2 ideas
- Render the multi-cell uploaded-art snappets in the sample (needs a seeded IndexedDB blob)
- A "Preview" (open in new tab) alongside the download; a per-panel PNG export
- Wire composeSchoolFrame + buildPanelPartsList into the (confirm-first) school order flow

## Guardrails
- Do NOT modify compose-frame.ts, fulfill.ts, or any Stripe/checkout/order code
