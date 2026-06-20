# Go-Live: festiveframes.co (Cloudflare → Railway)

## DONE ✅
- DNS moved to Cloudflare (nameservers fish/vick.ns.cloudflare.com)
- ROOT CAUSE: Railway can't verify the APEX behind Cloudflare CNAME flattening →
  switched to www as the canonical domain (subdomains verify fine)
- www.festiveframes.co LIVE: CNAME → m6v0zz65.up.railway.app (DNS only), Railway
  cert issued (Let's Encrypt), serving the store (HTTP 200)
- SITE_URL → https://www.festiveframes.co (committed 6355470, pushed, Railway redeploying)

## DOMAIN DONE ✅
- [x] Apex festiveframes.co CNAME → Proxied (orange), Cloudflare cert valid
- [x] Redirect Rule (template "root to WWW"): festiveframes.co/* → www.festiveframes.co/* (301, path preserved)
- VERIFIED: both domains valid SSL, bare apex 301s to www store

## REMAINING LAUNCH ITEMS (dashboards) — after redirect
- [ ] Stripe webhook → https://www.festiveframes.co/api/stripe/webhook (checkout.session.completed)
      → copy whsec_ into Railway env STRIPE_WEBHOOK_SECRET (activates order emails)
- [ ] Railway env: RESEND_API_KEY, EMAIL_FROM, ADMIN_ORDER_EMAIL, SUBSCRIBE_ENDPOINT
- [ ] Resend: verify festiveframes.co (DKIM/SPF) so customer emails send to real buyers
- [ ] Stripe → Payment method domains → add www.festiveframes.co (Apple/Google Pay)
- [ ] Test: one real live order → /thanks + customer email + admin email

## NOTES
- Email stack already configured (MX mailspamprotection, SPF, DKIM) — leave alone
- Railway Hobby = 2 custom domains PER SERVICE (not the blocker; apex flattening was)

---

# Fork eufy export: add 3×12 jig variant (Bill's new tray) — 2026-06-20

Source of truth: `LPF FF Snappet UV Printer Organizer Tray 062026.AI` (repo root).
Keep the working 3×9 export 100% untouched. Fork now, merge later.

- [x] Measure the jig file — `scripts/measure-jig.mjs` + raster analysis. FINDING: the .AI is a page-fit bitmap (1364×1052, ~124 DPI), not vector. Confirms a perfectly even 3×12 grid (fit residual 0.03px) but NOT true scale. Decision: use Bill's 1.06″ pitch / 1.02″ face for absolute scale; layout from file.
- [x] `src/config/eufy-jig.ts` — added `makeGridJig()` + `EUFY_JIG_3X12` (centered even 3×12, pitch 1.06″, face 1.02″, pocket 0.992″ → 12.652×3.112, 36 pockets). `EUFY_JIG` (3×9) unchanged.
- [x] `ExportPartsList.tsx` — `downloadEufySheets(jig, fileTag)`; added desktop-only "eufyMake 3×12 (new jig)" button. Existing button calls (EUFY_JIG, "") → byte-identical filenames.
- [x] Docs — appended "Fork: 3×12 variant" to `tasks/eufy-print-pipeline.md`.
- [x] Verify — `npx tsc --noEmit` clean, eslint clean. Geometry numerically checked (centers/sheet/no-bleed). Measure script confirms even grid (residual 0.03px). Renderer unchanged & jig-parameterised (3×9 logic already verified).

## Open for Bill (before a production 3×12 run)
- [x] eufyMake E1 bed fits the 12.652″-wide footprint — confirmed (Henry, 2026-06-20).
- A real-scale vector/CAD of the tray would let us re-measure exact centers (this .AI is a thumbnail). One-line config swap.
</content>
