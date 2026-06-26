# Cart system + kill undesigned checkout

Plan: C:\Users\david\.claude\plans\majestic-petting-gray.md

## Phase 0 — SHIP TODAY: every purchase goes through the designer ✅ DONE
- [x] #1 TheKit.tsx: both CTAs now <Link href="/build">; honest $69 card copy ("Build one, then add a second in your cart — 2 for $69")
- [x] #2 Deleted BuyButton.tsx (only TheKit used it)
- [x] #3 /buy page: server redirect("/build") — legacy kit funnel retired
- [x] #4 Hardened /api/checkout: legacy kit branch removed → 410 Gone; only kind:"custom-frame" lives
- [x] #5 Designer path untouched (Order disabled until hasDesign; single-frame $39 works)
- [x] npx next build exit 0 + npm run lint exit 0 (no new warnings)

## Phase 1 — Cart system ✅ BUILT (pending live Stripe test)
- [x] offers.ts: priceForFramesCents(n) + bulkSavingsCents(n) + MAX_CART_FRAMES (pairs: floor(n/2)*6900 + (n%2)*3900)
- [x] stores/cart-store.ts: zustand+persist (ff:cart), light line metadata, cartTotals helper
- [x] Designer.tsx: extracted prepareDesignDraft(); proof modal CTA → "Add to cart →" → /cart; addToCart fails loud if draft save fails
- [x] app/cart/page.tsx: lines + qty stepper (multiples of same design) + bulk total/savings + Design another / Checkout
- [x] /api/checkout kind:"cart": validate each draft exists, re-derive pairs total, per-design line items + one-off Stripe coupon for savings + shipping; cartId in metadata; allow_promotion_codes only when no coupon ($0 testing)
- [x] lib/order/store.ts: saveCartDraft/getCartDraft (order_carts table); draft TTL bumped 2h→24h
- [x] fulfill.ts + email-production.ts: fulfillCart() — one production email per design (qty + cart note) + ONE combined customer email, idempotent (claim keyed by cartId)
- [x] /api/order/fulfill + webhook + OrderFulfiller + thanks page: handle cart param; cart cleared on success
- [x] tsc --noEmit exit 0; eslint exit 0 (warnings only); npx next build exit 0 (/cart static)

## Drag-and-drop banner preview ✅ FIXED (agent, browser-verified)
- [x] ROOT CAUSE: FrameCanvas preview ghost spread barRect {x,y} raw into style — x/y aren't CSS box props, so ghost had no left/top and froze at top-left. (My pointer-collision fix was sound but not the cause.)
- [x] Fix: map x→left, y→top like a real PlacedBar. Verified via headless browser repro: ghost lands under cursor on correct rail. build + lint clean.

## Still to verify before/at deploy
- [ ] LIVE Stripe test (test mode): cart of 2 → $69; cart of 3 (qty) → $108; receipt shows designs + discount; /thanks fires ONE customer email + per-design production emails to Bill; webhook backup idempotent
- [ ] Manual click-through of banner drag on a real device (agent verified headless)
