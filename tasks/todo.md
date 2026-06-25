# Builder fixes — persistence, header state selector, plate shadow

Branch: master (do NOT commit/push). Build GREEN.

## 1. Design persistence (data-loss bug) — DONE
- [x] partialize now persists FULL design: designName, plateState, slots, textBars,
      selectedBarId, qrCode, bottomBar, frameConfig, dieCut, updatedAt (history NOT persisted)
- [x] persist version bumped to 6 + migrate() strips pre-v6 blobs to meta-only (safe)
- [x] Seed guard: returning user (slots OR textBars present) is left EXACTLY as saved —
      no re-seed, no fillEmpty patch; brand-new visitor still gets the seeded design

## 2. State selector moved into header — DONE
- [x] StateSelector now under the "Name your design" input (left cluster) in DesignerHeader
- [x] theme="header" variant matches dark header chrome; visible on mobile too (name hidden)
- [x] Removed from Designer.tsx (+ unused import); plate still reflects state (store-driven)

## 3. Plate drop shadow — DONE
- [x] Soft cast + contact shadow on LicensePlateArea on-screen wrapper (export untouched)

## Verify — DONE
- [x] npx next build exits 0
- [x] npm run lint: 0 errors, only pre-existing warnings (no new)
