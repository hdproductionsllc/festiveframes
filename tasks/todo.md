# Fix: Eufy print sheet never sent + mobile drag overshoot

## Issue 2 — mobile drag overshoot (DONE)
- [x] Root cause: palette tile was the only drag source missing `touch-action: none`
      (frame, placed tiles, banner button all have it). Mobile browser ate the
      first slice of the finger gesture as a scroll → drag + pointer-driven drop
      shadow started offset → had to overshoot. Desktop (mouse) ignores
      touch-action, so it was fine — matching the report.
- [x] Fix in `src/hooks/useDragTile.ts`: always set `touchAction: "none"`.
- [x] tsc clean.

## Issue 1 — Eufy print sheet never attached (server-side auto-attach)
Decision (Henry): auto-attach via server-side render. The PNG must arrive on the
production email with zero clicks.

Root cause: `printSheets` is hardcoded `[]` at checkout (Designer.tsx:281) for
EVERYONE; fulfillment reads `artifacts.printSheets` (always empty) → email always
says "NO print sheet." The design JSON IS saved in the DB draft, just never used.

- [x] 1. Added `@napi-rs/canvas` + `serverExternalPackages` in next.config.ts.
- [x] 2. Extracted `src/lib/utils/eufy-print-core.ts` (isWhiteSnappet,
        buildPrintQueue, setPngDpi/crc32, shared types); client eufy-print.ts now
        imports them — behavior unchanged.
- [x] 3. Created `src/lib/utils/eufy-print-server.ts` —
        `composeEufyPrintSheetsServer(design, jig)` (@napi-rs/canvas; artwork from
        public/ on disk, remote via fetch, data: via base64).
- [x] 4. Wired into fulfill.ts (fulfillOrder + fulfillCart) — renders from
        `draft.design`, attaches sheets, wrapped so a render failure never blocks
        the order. fulfillOrder now always loads the draft for its design JSON.
- [x] 5. Updated stale "ordered on mobile" copy in email-production.ts.
- [x] 6. Verified: tsc 0, eslint clean, `next build` 0. Runtime render test PASSED
        — 3796×934 PNG @ 300 DPI (pHYs embedded), 4 printed tiles + 1 blank-white
        skipped, real July4 artwork loaded from disk, registers to the jig grid.

## RESULT: shipped-ready. Eufy sheet now auto-attaches to EVERY production email
(mobile + desktop), completing the half-finished 2026-06-26 migration (commit
0ef695f removed client render for speed but never built the fulfillment render).

## Notes / constraints
- `PlacedTile = { pieceId, setId }` — no inline artwork; everything resolves via
  `getPiece` (pure, server-safe). Custom uploads are a PLAN, not shipped.
- Eufy sheet renders TILE artwork + solid fills only — NO text. Banners (text
  bars) are separate files, still rendered client-side at checkout. No server fonts.
- Use `EUFY_JIG_3X12` (production tray). 720 DPI. Transparent bg drives the
  white underbase.
