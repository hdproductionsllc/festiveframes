# Launch Pipeline TODO (branch: launch/order-production-pipeline)

Real order tomorrow → production. Public launch Friday. Plan: .claude/plans/enumerated-napping-frog.md

## Workstream 1 — Order → Production pipeline (P0)
- [ ] `src/lib/utils/parts-list.ts` — extract reusable buildPartsList()/csv/html from ExportPartsList
- [ ] `src/lib/order/store.ts` — draft store + atomic idempotency (Postgres/Redis, in-memory fallback)
- [ ] `src/lib/order/fulfill.ts` — single idempotent fulfillOrder() + failure alert
- [ ] `src/app/api/order/draft/route.ts` — persist design JSON + artifacts
- [ ] `src/lib/email-production.ts` — founders email (attachments) + customer (confirm+proof+thank-you)
- [ ] checkout route — custom-frame $3900 line item, allow_promotion_codes, metadata.orderId
- [ ] webhook — fulfillOrder backup trigger on metadata.orderId
- [ ] thanks page — fulfillOrder primary trigger
- [ ] DesignerHeader — ORDER · $39 CTA
- [ ] Designer — handleOrder (render → POST draft → checkout → redirect)
- [ ] End-to-end $0 coupon test (founders + customer emails arrive; no double-send)

## Workstream 2 — New artwork into app
- [ ] Sync 5 final snappets → public/tiles/july4 (american-flag, bomb-pop, eagle, liberty-bell, uncle-sam-hat)
- [ ] Confirm 250 ribbon design w/ owner; re-run optimize-images

## Workstream 3 — Banner fonts + cursive
- [ ] Add script/cursive + display fonts (@font-face / Google import)
- [ ] Append to BOTTOM_BAR_FONTS; categorize picker (Script · Display · Classic)

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
