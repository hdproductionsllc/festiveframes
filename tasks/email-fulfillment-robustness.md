# Launch-critical EMAIL/FULFILLMENT robustness fixes

Root cause for #1 (verified via Stripe SDK v2277 changelog, matches pinned API `2026-05-27.dahlia`):
- Top-level `Checkout.Session.shipping_details` was REMOVED.
- Shipping now lives only at `collected_information.shipping_details` (required).
- Current retrieve calls don't expand it -> `shippingLines()` returns nothing -> "Address on file".

## Tasks
- [x] 1. Expanded `collected_information.shipping_details` on session retrieve in both
      routes (+ kit branch). `shippingLines()` now reads collected_information first.
- [x] 2. Attachment size guard in `sendProductionEmails`: sums bytes, drops print sheets
      if > 30MB with body note; retries once without sheets on send failure.
- [x] 3. Customer-email failure fires `sendFulfillmentFailureAlert` (labeled customer-conf failure).
- [x] 4. No-recipients / no-key => throws => `fulfillOrder` releases claim + alerts.
      Graceful in local dev (logs loudly, alert no-ops without key).
- [x] 5. `npx next build` exit 0 + `npm run lint` 0 errors (18 pre-existing warnings, none in scope).
