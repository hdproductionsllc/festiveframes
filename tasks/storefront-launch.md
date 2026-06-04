# Festive Frames — Storefront / Conversion Site (v4) — Launch Plan

Hard launch: live + phone-tested on cellular by **June 26, 2026**. Event date: **July 4, 2026**.
Source spec: `FESTIVE_FRAMES_FULL_SITE_PROMPT_v4.md`. This plan records the **resolved deltas** from that spec.

## Locked decisions (product owner, 2026-06-04)

1. **One codebase, Next.js 16** — NOT Astro. `/` and `/buy` are server components (near-zero client JS) to hit Lighthouse 90+ / sub-2.5s 4G. Builder stays at `/build`. The v4 "Astro" requirement is retired.
2. **All kits $39, every bundle $69, always** — July 4 Limited is a **$39 variant** (dated 2026 tile), not a separate $49 SKU. The "$79 if Limited included" line and all dynamic bundle math are DELETED. Server enforces: single = $39 x qty, bundle = $69 flat.
3. **All 17 tile sets stay live in `/build`** — the 6 "kits" are a curated buying layer on the storefront only.
4. **Kit-selection persistence** — URL param (`?kit=<id>`) + `localStorage` fallback, scoped to `/ <-> /buy <-> Stripe-cancel` round-trip. NOT forced into the builder's state model.
5. **`/buy` stays `noindex,follow` AND remains the primary CTA target** — the reviewer's "don't link /buy" advice is rejected; noindex already prevents indexing without breaking the human funnel.

## Codebase facts (verified 2026-06-04)
- Next.js 16 App Router, Tailwind v4 (tokens in `globals.css` `@theme inline`, no config file).
- Designer currently at `/` -> moves to `/build`. Builder keeps its dark "workbench" theme.
- Existing fake `/checkout` + `/confirmation` order flow stays untouched this round; replaced in the Stripe phase.
- Brand tokens exist: red `#C8102E`, navy `#1B2A4A`, gold `#FFD700`. Marketing adds warm cream + Americana surfaces.
- `kits.ts` is a storefront catalog (identity + photo + contents string), independent of the designer's 17 tile sets.

## Build order (mirrors v4, deltas baked in) — checkpoint after each phase

### Phase 0 — Foundation  ✅ DONE (build green 2026-06-04)
- [x] Routing: designer moved `/` -> `/build`; marketing `(site)` route group; skeleton `/buy` + `/thanks`; branded `not-found.tsx`
- [x] Americana theme (navy/cream/red/gold tokens, 2 self-hosted fonts via next/font), `SiteHeader` + `SiteFooter`
- [x] `src/config/season.ts` (theme, popup, promo FOURTH, countdown dates, SITE_URL)
- [x] `src/config/kits.ts` (6 launch kits + 3 future inactive; all $39, july-4-limited limited:true)
- [x] `src/config/offers.ts` (single $39, bundle $69 flat, default = bundle, `formatUsd` helper)
- [x] `src/content/copy.ts` (all copy; verified no em dashes / hype / savings / team marks)

### Phase 1 — Homepage `/` (SEO + trust + discovery)  ✅ DONE
- [x] Hero, What It Is (completeness/permanence anchoring), Kit Showcase (cards -> `/buy?kit=<id>`)
- [x] How It Works, Gallery slots, Trust/local-production, 6-Q FAQ, CTA + email capture (stub `/api/subscribe`), SEO footer
- [x] Meta title/description, one h1, h2 sections, Product + FAQPage + Organization JSON-LD
- Pre-existing lint debt (not this phase): 6 errors/warnings in designer code (`design-store.ts` prefer-const, `<img>` usage). Build unaffected.

### Phase 2 — `/buy` (revenue engine) + Stripe end-to-end (test mode)  ✅ DONE (build green, pricing-security verified 2026-06-04)
- [x] Sticky buy bar, hero (defaults to American Classic or `?kit=`), shipping-cutoff countdown
- [x] Kit picker (6 swipeable cards), What's In Every Kit, How It Works, Built to Last (UV-printed/plain-language material)
- [x] Offer block: 2 cards, **bundle preselected + "Most Popular"**, $39 reads complete, "mix kits" optional link
- [x] Qty selector (1-5), fulfillment (free festival pickup / $5 flat ship), 30-day guarantee
- [x] Serverless Checkout Session from `{selection, kitIds, quantity}` — server-priced only; verified no client price can reach Stripe, no exploit yields non-flat charge
- [x] success_url `/thanks?session_id=...`, cancel_url `/buy`; `?kit=` + localStorage persistence wired
- [x] `allow_promotion_codes` (FOURTH surfaces at checkout), webhook `checkout.session.completed` structured log
- [ ] LIVE-MODE only (needs David): Stripe test/live keys in `.env.local`, create FOURTH promo code, register webhook secret, enable Apple/Google Pay in dashboard

### `/thanks` (built alongside Stripe) ✅ DONE
- [x] Retrieves real Stripe session, renders kit name(s)/qty/fulfillment, graceful fallback; tile-drop teaser + email capture (only here); navigator.share; /build cross-link

### Phase 3 — Interactions
- [ ] July-4 popup (once/visitor, 2s, code chip, focus trap + Escape, never during checkout)
- [ ] Countdown, sticky bar, qty selector, kit/offer selection state + persistence

### Phase 4 — SEO technical layer  ✅ DONE (build green, SEO-verified 2026-06-04)
- [x] Per-route meta, canonical, OG/Twitter + **code-rendered** 1200x630 OG image (`opengraph-image.tsx`, no asset file needed)
- [x] robots.txt, sitemap.xml (`/` and `/build` only), `/buy` noindex,follow, `/thanks` noindex,nofollow, `metadataBase` set
- [x] JSON-LD on `/`: Product (American Classic, $39, InStock) + FAQPage + Organization (St. Louis)

### Phase 7 (partial) — QR + signage + launch docs  ✅ DONE
- [x] 3 QR PNGs (booth/car/card, 1024px, UTM-tagged) -> `public/marketing/qr/` + `scripts/generate-qr.mjs` + README
- [x] Booth signage copy -> `public/marketing/signage/README.md`
- [x] `tasks/LAUNCH_CHECKLIST.md` (Stripe go-live + branding), `tasks/IMAGE_MANIFEST.md` (Ideogram prompts)
- [ ] Analytics events (next phase); top-level `README.md` editing guide

### Phase 5 — `/build` integration  ✅ DONE (build green, verified 2026-06-04)
- [x] Designer at `/build`, dark workbench preserved, fully functional (sibling-overlay chrome, internals untouched)
- [x] Persistent "Start with a kit - $39" pill -> /buy; first-visit onboarding popup (3-step, localStorage-gated, never July-4 popup)
- [x] All 17 tile sets remain available
- Minor a11y nit (not blocking): background pill not `inert` while onboarding modal open

### Analytics events  ✅ DONE
- [x] `src/lib/analytics.ts` SSR-safe `track()` (Plausible + dataLayer + UTM merge, no-ops until provider attached)
- [x] Wired: kit_selected, offer_selected, buy_click, checkout_start, purchase, popup_claim, builder_open, builder_tutorial_start

### Phase 6 — `/thanks` + 404
- [ ] `/thanks`: retrieve Stripe session, render real order, pickup/shipping, **tile-drop teaser + email capture (only here)**, `navigator.share`
- [ ] Branded 404: Shop Kits / Home

### Phase 7 — Assets, analytics, docs
- [ ] 3 QR PNGs (booth/car/card) to `/marketing/qr/` + README
- [ ] Booth signage copy `/marketing/signage/README.md` ("$39" / "Two for $69")
- [ ] Analytics events (kit_selected, offer_selected, buy_click, checkout_start, purchase, popup_claim, builder_open/tutorial)
- [ ] `LAUNCH_CHECKLIST.md`, `README.md` (editing copy/season/kits/offers)

### Phase 8 — Polish + verify
- [ ] Design direction (vintage Americana, navy/cream/red/gold, self-hosted display + body fonts)
- [ ] Motion (reduced-motion respected), Lighthouse 90+, **real-phone cellular test of every checkout path**

## Success criteria (from v4)
- Kit card understood by a stranger in < 2s
- QR -> Stripe Checkout in < 60s; default path (bundle + default kit) = zero decisions beyond Buy
- $39 reads complete, $69 reads obvious, no savings math anywhere
- Season 2 / new kits / price changes are config-only
