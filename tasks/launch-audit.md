# Launch-day full audit + UX deep dive (2026-06-26)

Four parallel read-only reviewers → synthesized prioritized report.

- [x] A1 Money path — DONE. Pricing/coupon math/tamper-resistance/idempotency all VERIFIED CORRECT. BLOCKER: carts unrecoverable if DATABASE_URL unset in prod (no localStorage backup for carts; cross-instance/restart loses design + alert only if Resend configured) → CONFIRM DATABASE_URL + RESEND_API_KEY + PRODUCTION_EMAILS + STRIPE_WEBHOOK_SECRET in Railway. SHOULD: /api/order/draft returns 200 {ok:false} on save fail so prepareDesignDraft treats failure as success (mitigated by checkout 409 re-validation); partial cart draft loss silent (no alert when present<lines); webhook doesn't gate payment_status!=unpaid. NICE: per-design retry re-sends founder emails, coupon objects accumulate, expectedTotalCents unused, dead custom-frame single path.
- [x] A2 UX flow deep dive — DONE. BLOCKER: proof render fail/hang permanently disables "Add to cart" (no timeout in handleReview, hard-gated on proof truthiness) — iOS Safari canvas risk. SHOULD: no sticky mobile Order CTA; cart 409 unrecoverable dead-end; crowded mobile header; "Order · $39" label vs proof→cart→checkout chain. NICE: checkbox nudge, tile-tray scroll affordance, contact form client validation, dead footer social spans.
- [x] A3 Trust/legal — DONE. Live storefront clean (pricing consistent, TM fix holds, legal pages real & matched, support reachable, JSON-LD honest). BLOCKER: /classic still publicly reachable, serves fabricated "5.0 · 7 reviews" + named 5-star quotes (FTC fake-reviews) → 404/redirect/delete the route. SHOULD: contact form returns ok:true even when email unconfigured/fails (verify RESEND_API_KEY+ADMIN_ORDER_EMAIL; return non-200 on fail); firm "before the Fourth" promise on made-to-order (soften or commit); confirm homepage "early tester" named quotes are real people. NICE: founding offset 27 (only on /classic), legal "kit" nouns, durability claim evidence on file.
- [x] A4 Technical — DONE. Build exit 0, security/SEO solid. BLOCKER: orphaned /checkout + /confirmation record an order with NO payment, publicly reachable → redirect/delete. SHOULD: 5MB logo+hero PNGs on critical path (biggest perf win); builder has NO KeyboardSensor (biggest a11y gap); /cart indexable (robots line); no error.tsx; /api/order/draft unauth+unbounded body; email endpoints no rate limit; low-contrast pink/gold accent text. NICE: modal focus traps, placeholder-only labels, sound-toggle aria-label, returns/terms missing from sitemap, ~23MB dead shipped images, ssl rejectUnauthorized:false.

## SYNTHESIS — fix-now blocker batch ✅ SHIPPED (commit 71f0042 → master)
- [x] B-tech1: orphaned /checkout + /confirmation → redirect to /cart
- [x] B-trust1: /classic → 404 (notFound); fake reviews gone (original in git tag pre-redesign-classic)
- [x] B-ux1: proof-render — withTimeout in renderProof + Add to cart no longer hard-gated on proof; retry/continue UI
- [x] B-quick: /cart robots disallow; webhook payment_status!=unpaid gate; contact route 502 on email failure
- [x] Decided: softened "before the Fourth" → "for the best chance to arrive before the Fourth" (5 surfaces)
- [x] Decided: replaced named tester quotes with real founder voices (Becky/Bill/Henry)

## Owner confirmations (cannot do in code)
- [ ] Confirm Railway env: DATABASE_URL, RESEND_API_KEY, PRODUCTION_EMAILS, STRIPE_WEBHOOK_SECRET (DATABASE_URL is load-bearing for carts)
- [ ] Run one live $0 test order (100%-off promo on a single frame) → confirm production + customer emails arrive

## This-week fast-follows
- [ ] Compress logo (2.77MB) + hero years250.png (2.19MB) → WebP; builder KeyboardSensor + focusable RailSlot; mobile sticky Order CTA; partial-cart-draft-loss alert (fulfill.ts); modal focus traps/Esc; form aria-labels; accent contrast; delete dead public/ images; add returns+terms to sitemap; global-error.tsx; rate-limit email endpoints
