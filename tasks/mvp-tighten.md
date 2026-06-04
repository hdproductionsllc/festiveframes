# MVP Tighten — ship ONE set, real, on festiveframes.co (2026-06-04)

Context: the v1 build is good but too broad for launch. Collapse to ONE real product, fix domain,
make the site "real" (privacy, working email), drop the builder from launch (KEEP the code), redeploy.

## Decisions (product owner)
- **One launch product: "Freedom Frame Set"** (Independence Day / July 4). All other kits ARCHIVED locally (active:false, NOT deleted).
- **Builder (/build) is NOT part of launch.** Unlink it everywhere + remove from sitemap. DO NOT delete the builder code (archived in place; future home of the custom photo-tile feature).
- **Domain: festiveframes.co** (not .com). Update canonical SITE_URL, email, QR codes.
- **Kit includes MORE tiles than the sample photo shows**, so buyers can mix & match (see recommendation below).

## Code changes (ship)
- [ ] kits.ts: rebrand `american-classic` -> "Freedom Frame Set" (keep id for now to avoid breaking image/JSON-LD/?kit refs); set merica-mode, stl-pride, game-day, family-ride, july-4-limited -> active:false (archived). Only Freedom Frame Set active.
- [ ] season.ts: `SITE_URL` -> https://festiveframes.co
- [ ] Regenerate QR codes (node scripts/generate-qr.mjs) so they point at .co
- [ ] SiteHeader: make the logo LARGER; remove the "Builder" nav link
- [ ] SiteFooter: remove "Open the builder" link; email -> hello@festiveframes.co; add "Privacy" link
- [ ] Remove /build from sitemap.ts
- [ ] copy.ts: home.secondaryCta no longer points at /build (repoint to /buy "See the kit"); thanks.builderCta repoint/remove; whatsInKit reflects the generous tile count + mix-and-match
- [ ] Single-product UX: KitShowcase heading (drop "Six kits, each one already someone."); hide KitPicker when only 1 active kit; OfferBlock hide "mix kits" when 1 active kit + fix heading
- [ ] /privacy: real privacy policy page (data collected, Stripe, analytics, email, hosting, rights, contact) + footer link
- [ ] /api/subscribe: make REAL — forward to a configurable provider endpoint (env SUBSCRIBE_ENDPOINT); graceful if unset; document
- [ ] checkout route: derive redirect base from request Origin (so success/cancel work on whatever domain is live now), falling back to env SITE_URL then constant
- [ ] Build green -> commit -> push master -> Railway redeploy -> verify live

## Needs David (not code)
- [ ] Railway env: STRIPE_SECRET_KEY (sk_live, FRAMES HDP LLC), SITE_URL, STRIPE_WEBHOOK_SECRET -> turns checkout ON
- [ ] Point festiveframes.co DNS at Railway; set SITE_URL env to https://festiveframes.co once live
- [ ] Email provider: set SUBSCRIBE_ENDPOINT (Formspree/Beehiiv/ConvertKit/Resend) -> email capture goes live
- [ ] Confirm physical kit tile count (see recommendation) and the Stripe business name shown to customers

## Tile-count recommendation (answer to "how many?")
A standard frame border holds ~24 tiles when full (top ~11, sides ~5 each, bottom corners). To make
"mix and match" real, ship MORE than one full frame's worth:
- **~40 decorative tiles** (themed: stars, stripes, fireworks, USA/word tiles, solids) = fill the frame (~24) plus ~16 spares to swap and rearrange.
- **Full A-Z + 0-9 letter/number set** for the bottom bar (the "starter alphabet").
Marketed as: "Comes loaded with 40+ tiles, far more than you see here, so you can mix, match, and
restyle your frame any time." Exact count is David's manufacturing call; copy uses a config value.

## Documented separately
- Custom photo-tile upload (builder, future): tasks/CUSTOM_TILE_UPLOAD_PLAN.md
