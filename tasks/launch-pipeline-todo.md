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

## Workstream 4 — QR rules + square QR snappet
- [ ] First banner QR required/locked; later banners optional
- [ ] Square QR tile → public/tiles/july4/qr.png + register in fourth-of-july.ts

## Workstream 5 — July-4th-only streamline
- [ ] Surface only July-4th set; hide "More tile sets" UI

## Workstream 6 — Mobile + tutorial
- [ ] Always-visible categorized bottom tile tray (bigger tiles)
- [ ] Spotlight coachmark walkthrough (arrows/highlights)

## Workstream 7 — Home → builder presets + made-to-order copy
- [ ] Real presets in fourth-of-july.ts; homepage CTAs → /build?preset=
- [ ] "Every frame is made to order" messaging

## Workstream 8 — Deploy
- [ ] .github/workflows/ci.yml (lint + build gate) + DEPLOY.md

## Owner tasks (blockers)
- [ ] Becky + Bill emails → PRODUCTION_EMAILS
- [ ] Stripe LIVE keys + live webhook + 100%-off coupon (FFTEST0)
- [ ] Railway Postgres/Redis plugin
