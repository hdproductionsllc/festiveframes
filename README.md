# Festive Frames

Customizable snap-on license plate frame kits. Storefront (SEO home, conversion `/buy`, post-purchase `/thanks`) plus the interactive tile **Builder** at `/build`. Next.js 16 (App Router) + Tailwind v4, Stripe Checkout, deployed on Vercel.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000 (or next free port)
npm run build    # production build
```

Checkout needs Stripe keys in `.env.local` (gitignored). Without them the site runs fine and the Buy button shows a friendly "warming up" message. See `tasks/LAUNCH_CHECKLIST.md` for the full go-live steps.

## Routes
- `/` marketing homepage (SEO, indexable)
- `/buy` conversion page (noindex,follow) — QR/ad/direct traffic
- `/thanks` order confirmation (noindex,nofollow)
- `/build` the interactive Builder (the designer app)
- `404` branded

## Where to change things (config-driven, no code edits needed)

| Want to change... | Edit this file |
|---|---|
| Any marketing copy (home + /buy + /thanks) | `src/content/copy.ts` |
| Kits: add / retire / rename / reorder / reprice | `src/config/kits.ts` (set `active`, `tier`, `price` in cents) |
| Offer prices, default selection, "Most Popular" badge | `src/config/offers.ts` (single 3900, bundle 6900) |
| Seasonal theme, promo code, countdown dates, hero image, `SITE_URL` | `src/config/season.ts` |

**Pricing rule (do not break):** every kit is `3900` cents ($39); every 2-kit bundle is `6900` cents ($69), always. No savings/percent language anywhere. The Stripe server (`src/app/api/checkout/route.ts`) is the only pricing authority and never trusts a client-sent amount.

**Copy rules:** no em dashes, no savings language, no hype words, no fake reviews, no pro team trademarks. Unverified durability claims keep a `// TODO-VERIFY` comment.

## Adding a new kit
1. Add an entry to `kits.ts` (`active: true`, stable `id`, `cardLine`, `contents`, image paths).
2. Drop its photos at the paths you set (see `tasks/IMAGE_MANIFEST.md` for dimensions).
3. Create a Stripe product/price only if you switch off inline pricing (current setup needs no Stripe product per kit).

## Assets & marketing
- QR codes: `node scripts/generate-qr.mjs` -> `public/marketing/qr/` (regenerate after confirming the production domain in `season.ts`).
- Booth signage copy: `public/marketing/signage/README.md`.
- Social/OG image: rendered in code at `src/app/opengraph-image.tsx` (no asset file to maintain).
- Photography to supply: `tasks/IMAGE_MANIFEST.md` (paths, dimensions, Ideogram prompts).

## Analytics
`src/lib/analytics.ts` `track()` fires funnel events (kit_selected, offer_selected, buy_click, checkout_start, purchase, popup_claim, builder_open, builder_tutorial_start). Events no-op until you attach a provider (add a Plausible script or GTM/Vercel). UTM params are auto-merged.

## Project status
See `tasks/storefront-launch.md` for the build checklist and `tasks/LAUNCH_CHECKLIST.md` for go-live steps.
