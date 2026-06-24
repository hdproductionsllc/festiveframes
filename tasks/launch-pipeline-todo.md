# Launch Pipeline TODO (branch: launch/order-production-pipeline)

Real order tomorrow → production. Public launch Friday. Plan: .claude/plans/enumerated-napping-frog.md

## Workstream 1 — Order → Production pipeline (P0)  ✅ CODE COMPLETE (builds clean)
- [x] `src/lib/order/parts-list.ts` — reusable buildPartsList()/csv/html
- [x] `src/lib/order/store.ts` — draft store + atomic idempotency (in-memory; Postgres = V2)
- [x] `src/lib/order/fulfill.ts` — single idempotent fulfillOrder() + failure alert
- [x] `src/app/api/order/draft/route.ts` + `/api/order/fulfill/route.ts`
- [x] `src/lib/email-production.ts` — founders email (attachments) + customer (confirm+proof+thank-you)
- [x] checkout route — custom-frame $3900 line item, allow_promotion_codes, metadata.orderId
- [x] webhook — fulfillOrder backup trigger; thanks page — fulfillOrder primary relay
- [x] DesignerHeader ORDER · $39 CTA + Designer handleOrder
- [ ] End-to-end $0 coupon test (BLOCKED: needs Stripe test keys + PRODUCTION_EMAILS)

## Workstream 2 — New artwork into app  ✅ DONE
- [x] Synced 5 final snappets → public/tiles/july4 + optimized (300–800KB)
- [ ] Confirm 250 ribbon design w/ owner

## Workstream 3 — Banner fonts + cursive  ✅ DONE
- [x] 14 new fonts incl. cursive (Great Vibes, Allura, Dancing Script, Pacifico, Sacramento…)
- [x] Categorized picker (Script · Display · Classic); typecheck + lint clean

## Workstream 4 — QR rules + square QR snappet  ✅ DONE
- [x] First banner QR required/locked; later banners optional
- [x] Square QR tile → public/tiles/july4/qr.png + registered in fourth-of-july.ts

## Workstream 5 — July-4th-only streamline  ✅ DONE
- [x] Surface only July-4th set (SURFACED_SET_IDS); "More tile sets" UI hidden

## Workstream 6 — Mobile + tutorial  ✅ DONE
- [x] Always-visible bottom tile tray (bigger tiles, tap-to-place)
- [x] Spotlight coachmark walkthrough (arrows/highlights) → tiles→canvas→text→Order

## Workstream 7 — Home → builder + made-to-order copy  ✅ DONE (presets = fast-follow)
- [x] Homepage "Build this look" → /build?look=<id> (builder opens pre-filled, customizable)
- [x] "Made to order, by hand, USA" messaging across home + FAQ/JSON-LD
- [ ] FAST-FOLLOW: author per-look preset slot maps so each look loads its exact design

## Workstream 8 — Deploy  ✅ DONE
- [x] .github/workflows/ci.yml (lint + build gate) + DEPLOY.md

## STATUS: all code built; full `next build` + `npm run lint` GREEN. Branch 2+ commits ahead of master.
## GO-LIVE BLOCKERS (owner): Resend domain verify · Railway vars · then deploy + $0 live test.

## Owner tasks (blockers)
- [ ] Becky + Bill emails → PRODUCTION_EMAILS
- [ ] Stripe LIVE keys + live webhook + 100%-off coupon (FFTEST0)
- [ ] Railway Postgres/Redis plugin
