# Festive Frames — Launch Checklist

## Stripe (account: acct_1TGQ09IF0pAWcizm — "HD PRODUCTIONS LLC")

### Branding (DO THIS — customers currently see "Still Beside Me")
This account is shared with the "Still Beside Me" project, and a Stripe account
shows ONE business name at checkout. To present HD Productions to Festive Frames
buyers, in the Stripe dashboard for this account:
- [ ] Settings -> Business -> **Public business name** -> set to "HD Productions LLC"
      (this also changes how Still Beside Me charges appear — acceptable since both
      are HD Productions; if you need fully separate branding, use a dedicated account).
- [ ] Settings -> **Statement descriptor** -> e.g. "HD PRODUCTIONS" (<= 22 chars).
      Optionally set a per-charge suffix later so Festive Frames vs Still Beside Me
      are distinguishable on card statements.

### Local testing (TEST mode)
- [ ] Paste this account's **test** secret key into `.env.local` (STRIPE_SECRET_KEY=sk_test_...).
- [ ] `stripe listen --forward-to localhost:3000/api/stripe/webhook` -> put the printed
      whsec_... into STRIPE_WEBHOOK_SECRET.
- [ ] Test orders with card 4242 4242 4242 4242: single, bundle, mixed bundle, FOURTH promo,
      both fulfillment options. Confirm /thanks renders the real order.

### Go-live (LIVE mode, on Vercel)
- [ ] Live keys are at `Documents/Heroes Live Forever/StillBesideMe/.env`
      (STRIPE_SECRET_KEY sk_live_..., publishable pk_live_...). Add to Vercel env vars
      (Production): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL=https://festiveframes.com.
- [ ] Create the **FOURTH** $5-off promotion code in the dashboard (allow_promotion_codes
      already surfaces the field at checkout).
- [ ] Register webhook endpoint https://festiveframes.com/api/stripe/webhook -> set its
      signing secret as STRIPE_WEBHOOK_SECRET in Vercel.
- [ ] Apple Pay / Google Pay: verify the festiveframes.com domain in Stripe (Payment methods).
- [ ] Wire the webhook "email David for pickup prep" TODO (src/app/api/stripe/webhook/route.ts).

## Still to build (storefront phases)
- [ ] SEO assets: sitemap.xml, robots.txt, OG image (code-rendered via @vercel/og).
- [ ] QR codes (booth/car/card) + booth signage copy.
- [ ] Real photography drops into placeholder slots (see tasks/IMAGE_MANIFEST.md).
- [ ] Real-phone cellular test of the full QR -> checkout flow.
