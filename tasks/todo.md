# Tier 1 — Revenue & trust hardening  (2026-07-03)

Scope: close the abuse/trust holes surfaced by the 4-agent review before the school
builder ships. NONE of this changes `/build`'s rendered output, checkout payload, or
print pipeline.

## 1. save-design phishing fix (I introduced this — C1)
- [x] `save-design/route.ts`: build the restore link from `SITE_URL` only, never the
      attacker-controllable `Origin` header.
- [x] `email.ts`: `escapeHtml` also escapes `"` and `'`; escape the URL in both `href`s.

## 2. Rate limiting (H1)
- [x] New `src/middleware.ts`: per-IP sliding-window limits on the abuse-prone routes
      (cartoonize, pet-caption, lab/pet-submit, save-design, contact, subscribe,
      review, order/draft). Leave webhook / checkout / fulfill untouched.
      VERIFIED: subscribe → 12x 200 then 429.

## 3. Body-size cap (H2)
- [x] Same middleware rejects oversized POSTs (per-route `maxBytes` via content-length).
      VERIFIED: 70KB body to contact (64KB cap) → 413.

## 4. School image = silent data loss (I introduced this — perf CRITICAL)
- [x] `SectionEditor.tsx`: encode uploads as JPEG q0.85 (PNG only when the image has
      real transparency via alpha scan), cap the long edge at 1200px.
- [x] `design-store.ts`: guarded localStorage wrapper catches quota failures + exposes
      `onPersistQuotaExceeded` listener. Stored bytes identical → /build unaffected.
- [x] `SchoolDesigner.tsx`: dismissible red banner when a persist write is rejected.

## Verify
- [x] `npx tsc --noEmit` clean
- [x] `npm run lint` clean (0 errors; 19 pre-existing warnings, none in touched files)
- [x] `npm run build` succeeds (middleware registered as ƒ Proxy)
- [x] Screenshot `/build` unchanged; `/lab/school` still works

## 5. Stop the subscribe-notification flood (added 2026-07-03, from owner)
- [x] `store.ts`: `subscribers` table + `recordSubscriber(email)` (INSERT..ON CONFLICT
      DO NOTHING RETURNING; in-memory fallback) — true only for a NEW email.
- [x] `subscribe/route.ts`: lowercase-normalize, dedup gate (fail-open), notify only when
      new. VERIFIED: new→{ok:true}; repeat→{ok:true,already:true}; UPPERCASE→already.
- [x] Rename `middleware.ts`→`proxy.ts` (Next 16 convention; kills deprecation warning).
- [x] Cleaned test rows from prod `subscribers` table (0 real rows remain).
