# Portfolio Profitability Audit — June 9, 2026

Comprehensive evaluation of all active business/code projects in `C:\Users\david\Documents`.
Method: 10 parallel research agents read each project's code, configs, docs, and git history.
Scope limit: structural audit only — actual revenue/traffic numbers must come from Stripe/GA dashboards.

---

## Executive Summary

**Core pattern identified: projects get built to ~90% and stall at the revenue switch.**
At least six finished or near-finished products are missing only a payment integration,
an env variable, or a deploy. Infrastructure cost across the whole portfolio is modest
(~$100–300/month, most of it one leak); the dominant cost is founder attention spread
across 31 projects.

---

## 🔴 Active Money Leaks

| # | Leak | Cost / Risk | Fix | Effort |
|---|------|-------------|-----|--------|
| 1 | Festive Frames checkout in Stripe TEST mode on launch day | Every real order bounces | Live keys + STRIPE_WEBHOOK_SECRET + RESEND_API_KEY in Railway | 30 min |
| 2 | Festive Frames email capture silently dropping signups | Pre-launch list = 0 | Set SUBSCRIBE_ENDPOINT | 5 min |
| 3 | HeadshotExperts monorepo infra running with $0 revenue | ~$150–300/mo (Supabase, Upstash, Replicate, Resend) | Pause/delete cloud projects OR commit to 30-day ship | 1 hr |
| 4 | Carton Ninja "Add to Cart" → href="#" | Finished product cannot take money | Wire Stripe checkout | 2 hrs |
| 5 | Hamilton Operating CTA is mailto: only | $1,500 audits unbookable | Calendly + Stripe | 4 hrs |
| 6 | **Live Stripe secret key in abandoned PurgeMode .env** | Security breach risk | **Rotate key TODAY**, then delete project | 15 min |
| 7 | Live Anthropic key in Pet Subtitles .env.local (and other keys across folders) | Exposure risk | Audit + rotate; move to platform env vars | 1 hr |
| 8 | Quartet fleet: 225 pages built, ~zero organic traffic after 6 months | Opportunity cost | Activate off-site channels (GBP, The Knot, GigSalad, planner referrals) for ONE city, measure | ongoing |
| 9 | Pet Subtitles Anthropic API cost vs $9.99/mo plan | Possible negative margin per heavy user | Check usage in console; consider cheaper model tier | 2 hrs |
| 10 | Duplicate dead builds consuming attention (Hero Frames, OLD hdp.com, priceframe-next, MusicCompiler x2) | Context-switching tax | Kill list below | 1 hr |

---

## 💰 Revenue Opportunities (ranked by effort-to-first-dollar)

### Tier 1 — Hours from revenue
1. **Festive Frames** — Launch day TODAY. Founding edition 27/250. Blockers are pure config
   (DNS, live Stripe keys, webhook, Resend, SUBSCRIBE_ENDPOINT). Runbook exists in
   `tasks/LAUNCH_CHECKLIST.md`. Post-launch upside: 5 inactive kits ready to flip `active: true`
   for sequential drops; /build designer hidden but production-ready as acquisition funnel;
   B2B dealer channel documented ($10–14/frame bulk, $199–499/mo retainers).
2. **Quiet Japan Vol 1** — Print-ready KDP PDFs done. Upload to Amazon.
   ⚠️ Verify AI artwork licensing + "Yuki Shima" copyright/pen-name rights first.
3. **Carton Ninja** — Product finished, photographed, site live. Wire Stripe + execute the
   already-written Amazon FBA listing strategy (CARTON-NINJA-AMAZON-LISTINGS.md).
   Realistic $2–5K first month.
4. **MarginBuild / Hamilton Operating Co.** — Highest-margin offer in portfolio
   ($1,500 audit → $5–25K builds → $2,500/mo retainers). CLAUDE.md playbook complete with
   cold-email scripts. Wire Calendly+Stripe, send 10 emails from warm network.

### Tier 2 — Weeks from revenue, bigger ceilings
5. **Podium** — 247 commits, active TODAY, 90% launch-ready B2B SaaS for ensemble/gig
   management. Built-in first customers: own quartet fleet. Run rate ~$60–100/mo (justified).
   Most valuable software asset in portfolio.
6. **headshotexperts.com** — Content/education site feature-complete, undeployed. Deploy to
   Vercel + Gumroad/Stripe for playbook tiers ($97/$497/$997) + Capture One affiliate.
   Expected $500–2K/mo within 3 months.
   ⚠️ Brand collision with the HeadshotExperts app monorepo — pick one identity.
7. **String quartet fleet** (lonestar / project / subito / meridian) — Real product is
   $1,490+ gigs. Sites are enterprise-grade; traffic is near-zero. Unlock = off-site channels,
   not more pages. Test Houston first; replicate what works. Subito redesign is shovel-ready
   (needs images + Formspree + SiteGround upload). Risk: shared analytics ID + near-identical
   structure may trip Google duplicate-content suppression — separate analytics/hosting if
   organic search matters.

### Tier 3 — Already earning; scale
8. **StillBesideMe** (inside Heroes Live Forever) — The ONLY project with live Stripe revenue
   and real fulfilled orders (WHCC printing). Audit Stripe dashboard for volume/margin, then
   put marketing behind it. Memorial vertical = evergreen demand.
9. **Pet Subtitles** (whatmypetthinks.com) — Live, subscriptions active. Check API
   cost-per-user; A/B higher tiers; add referral loop.
10. **PriceFrame** — Live affiliate site, ~$20/mo cost, 50+ articles, path to $1.5–2.5K/mo.
    Scale content to 200+ articles; expand homeowner-services vertical; Mediavine at 50K
    sessions.
11. **chicagolandheadshots.com** — Live B2B lead-gen for $1–5K corporate deals. Keep, monitor.
    Note: RESEND_API_KEY empty — verify contact form actually delivers.
12. **Henrydavidphotography.com 2026 Build** — Ship it (2–3 weeks). Merge henrydavidstudio.com
    assets in; the core photography business ($5K–100K corporate projects) is still the
    biggest real-dollar engine in the portfolio.

### Niche / optional
- **Rialto Bridge violin mute** (FreeCAD Claude Projects) — print-ready luxury niche product.
  Test print → validate on instrument → Etsy/small-batch.
- **Sushi SRS** — finished game; itch.io button = low-effort trickle revenue.
- **Options AI** — solid engineering, blocked on Schwab credentials; personal tool, high
  regulatory/acquisition friction as a product. Keep personal.
- **DSH composer site** — live, generating leads; add pricing transparency + Calendly.
- **Rebecca Chung site** — deploy-ready (SiteGround steps in README); 1-day lift.

---

## 🪦 Kill / Archive List

| Project | Action | Why |
|---------|--------|-----|
| Hero Frames | DELETE (or fold into Festive Frames) | Near-duplicate designer, fake checkout, no git |
| OLD henrydavidphotography.com | DELETE | 100% superseded by 2026 Build |
| priceframe-next | ARCHIVE spec, delete scaffold | Zero code; 4–6 mo build vs working PriceFrame |
| PurgeMode | ROTATE STRIPE KEY, then delete | Abandoned 5 months, mocked backend, live key exposed |
| MusicCompiler + Music Compiler 2026 | MERGE or archive | Duplicate internal tools |
| Staff Pro Services | SHELVE | Ops-heavy marketplace; deploy only if inbound demand appears |
| The Quiet Mind | CLARIFY or kill | Cover art with no album behind it |
| henrydavidstudio.com folder | MERGE assets into 2026 Build, 301 the domain | Asset dump, no site |
| StillBesideMe Easter asset folders | Archive/move to CDN | 1.3GB local images |
| New folder | DELETE | Empty |
| FreeCAD-Projects | ARCHIVE | One PNG, superseded by mute project |
| HeadshotExperts monorepo | KILL infra or 30-day ship deadline | $150–300/mo burn, no payments wired |

---

## 30-Day Execution Plan

**Week 1 (this week):**
- [ ] Festive Frames go-live: DNS → live Stripe keys → webhook/Resend → SUBSCRIBE_ENDPOINT → analytics → full funnel test
- [ ] Rotate PurgeMode Stripe key + audit all .env files for live secrets
- [ ] Pause/delete HeadshotExperts Supabase/Upstash/Replicate projects (stop the only real cash burn)

**Week 2:**
- [ ] Carton Ninja: Stripe wiring + Amazon FBA listing submission
- [ ] Hamilton Operating: Calendly + Stripe on audit; send first 10 cold emails from playbook
- [ ] Quiet Japan Vol 1: resolve art licensing question → upload to KDP

**Week 3–4:**
- [ ] Podium: beta launch to own ensembles + 2–3 friendly ensemble leaders
- [ ] Quartet fleet: Houston channel test (Google Business Profile, The Knot, GigSalad, 10 planner outreach emails); measure leads for 30 days before touching other cities
- [ ] Deploy headshotexperts.com + Gumroad playbook checkout

**Deliberately NOT in the plan:** any new builds, priceframe-next, Staff Pro, Kitchinto
(park until at least 3 of the above are generating).

---

## Verification Needed From You (data I can't see)

1. Stripe dashboard: StillBesideMe + Pet Subtitles actual monthly revenue
2. Anthropic console: Pet Subtitles API spend vs subscription revenue
3. Supabase/Upstash/Replicate billing: confirm HeadshotExperts burn estimate
4. Domain registrar: full list of renewing domains (est. 15+ × ~$15/yr)
5. Google Analytics: quartet fleet + PriceFrame traffic
6. Quiet Japan: confirm rights to AI-generated artwork and Yuki Shima pen name
