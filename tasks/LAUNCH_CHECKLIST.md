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
- [ ] Apple Pay / Google Pay: verify the domain in Stripe (Settings -> Payment method domains).

## Order emails + webhook (code is DONE; needs config to fire)
The webhook now sends a branded customer confirmation AND an admin order email via Resend
(src/lib/email.ts). It no-ops gracefully until configured. To turn it on:
- [ ] **Register the webhook** in Stripe: Developers -> Webhooks -> Add endpoint ->
      `https://<live-domain>/api/stripe/webhook`, event `checkout.session.completed`.
      Copy its **Signing secret** (`whsec_...`).
- [ ] In **Railway Variables** set: `STRIPE_WEBHOOK_SECRET` (the whsec above),
      `RESEND_API_KEY` (from resend.com), `EMAIL_FROM` (e.g. `Festive Frames <orders@festiveframes.co>`),
      `ADMIN_ORDER_EMAIL` (your inbox).
- [ ] **Resend domain:** verify your sending domain in Resend (add its DKIM/SPF DNS records) so
      `EMAIL_FROM` can use @festiveframes.co. Until verified, use Resend's test sender / your own email.
- [ ] (Optional belt-and-suspenders) Stripe -> Settings -> Customer emails -> enable
      "Successful payments" so Stripe also sends its own receipt.
- [ ] Test: real order in live mode (or `stripe trigger checkout.session.completed`) -> confirm the
      customer email + your admin email both arrive, and /thanks renders the order.

## Still to build (storefront phases)
- [ ] SEO assets: sitemap.xml, robots.txt, OG image (code-rendered via @vercel/og).
- [ ] QR codes (booth/car/card) + booth signage copy.
- [ ] Real photography drops into placeholder slots (see tasks/IMAGE_MANIFEST.md).
- [ ] Real-phone cellular test of the full QR -> checkout flow.
