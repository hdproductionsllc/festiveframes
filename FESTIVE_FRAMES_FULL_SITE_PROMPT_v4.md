# CLAUDE CODE PROMPT - FESTIVE FRAMES FULL SITE (SEO + CONVERSION SYSTEM) v4

## MISSION

Build a production-ready website for Festive Frames, a customizable snap-on license plate frame system with interchangeable decorative tiles.

This is a 3-part funnel system:

1. SEO discovery layer (Google traffic) at /
2. High-conversion purchase flow (QR + ads + direct traffic) at /buy
3. Interactive builder tool (existing system integration) at /build

## THE CORE SELLING INSIGHT (READ FIRST)

The product is not "design variety." It is instant identity recognition in under 2 seconds. Buyers do not want to design. They want to recognize themselves and tap once.

Therefore the site sells PRE-COMPOSED IDENTITY KITS, not tiles and not a design process.

- A kit is a finished look with a name, a photo, and an identity ("that's me")
- Tiles are customization AFTER purchase, not decisions BEFORE purchase
- The Builder is a post-purchase and engagement layer, never the buying path
- Every kit card must pass the 2-second test. If it needs explaining, it does not ship.

Launch deadline: live, tested on a real phone over cellular, by June 26, 2026. Hard event date: July 4, 2026.

## PRICING ARCHITECTURE (READ SECOND, IT GOVERNS /buy)

We are not selling "a frame." We are selling a complete identity kit plus a collectible system. Pricing has exactly three levels and every page reflects this:

1. ENTRY, the impulse buy: Single Kit - $39
   Framing: complete, never limited. The line is "Everything you need to customize your car today." NEVER call it a starter kit, never make it feel inferior. It must justify itself alone.

2. CORE OFFER, the default and real profit engine: Two-Kit Bundle - $69
   People buy bundles for social logic, not math. Frame it as "One for you, one for a gift" / "second car". The bundle is PRESELECTED on /buy and badged "Most Popular". Visitors deselect down to one instead of deciding up to two. Visual weight, never aggressive language.

3. SCARCITY, the conversion accelerator: July 4 Limited Edition Kit - $49
   Ship this as a distinct SKU ONLY if the dated 2026 tile design is meaningfully distinct and inventory supports it. Otherwise it becomes a visual variation of the $39 American Classic. Build kits.ts so either choice is a config flip. LIMITED badge, no countdown gimmicks beyond the real shipping cutoff.

VALUE ANCHORING RULE: never anchor with price comparisons or savings. Anchor with completeness and permanence. The recurring phrases across the site are: "One-time frame install." "Buy once, change endlessly." "Install once. Swap forever." $39 is not cheap; it is the entry to a lifetime customization system.

HARD PRICING RULES:
- NO savings language anywhere. Never "save $9", never percentages, never strikethrough prices.
- NO third+ price points on /buy. Three levels max, and Limited only if it earns its slot.
- NO tile-pack or expansion upsells before or during checkout. Future packs ("new tile drops coming soon", seasonal sets) appear ONLY post-purchase: on /thanks and in email. Lifetime value lives after the sale, never in its way.
- Quantity selector still exists (someone buying 4 for the office), but the visual story is $39 vs $69.

## HARD CONSTRAINTS

- Astro + Tailwind CSS, deployed on Vercel
- Stripe Checkout required (no Shopify, no CMS). Stripe is the source of truth. No database in v1.
- Mobile-first (70%+ traffic mobile; /buy is ~95% mobile QR scans)
- Fast on cellular networks
- Routes only: /, /buy, /build, /thanks, /404
- No login, no accounts

## GLOBAL SYSTEM RULES

- All copy in /src/content/copy.ts
- All seasonal values in /src/config/season.ts (theme, popup, promo code, countdown dates, hero images)
- ALL KITS in /src/config/kits.ts: id, name, identity line, price, Stripe price ID, contents, images, sort order, active flag, limited flag. Adding, retiring, repricing kits is config only.
- Offer-level config in /src/config/offers.ts: single price, bundle price, default selection (bundle), Most Popular badge text. Pricing experiments are config changes.
- NO em dashes anywhere. Use hyphens with spaces, commas, or periods.
- No hype language. Banned: "elevate", "unleash", "revolutionary", "game-changer", "Imagine...", "Whether you're... or...". No exclamation stacking.
- No fake testimonials, counters, or star ratings. Ever.
- Unverified product claims get // TODO-VERIFY comments and soft wording.
- Accessibility AA: semantic HTML, focus states, popup focus trap + Escape, alt text everywhere.

## TRADEMARK GUARDRAIL (HARD RULE)

No professional team names, league marks, or team slogans anywhere, including "Cardinals Country" and "Chiefs Kingdom". These are protected marks. Express the identity team-neutral: GAME DAY, STL, DEFENSE WINS, TAILGATE MODE, red/navy/white sets. Local pride (STL, MIDWEST) is fine. kits.ts makes licensed kits trivial to add later if David secures rights.

## LAUNCH KIT CATALOG (drives kits.ts)

Six kits online at launch. Booth-exclusive kits exist offline only and are intentionally NOT on the site.

TIER 1, shown first:

1. AMERICAN CLASSIC KIT - $39 (DEFAULT / HERO KIT)
   Identity: patriotic pride, all ages. Contents: USA word tiles, red/white/blue solids, stars pattern tiles, fireworks accent, LAND OF THE FREE word set.
   Card line: "July 4 ready in 10 seconds."

2. MERICA MODE KIT - $39
   Identity: humor + patriotism. Contents: MERICA, HONK IF YOU LOVE FREEDOM, FAST NOT FURIOUS, distressed flag tiles, eagle and star icons.
   Card line: "This one is for the fun people."

3. STL PRIDE KIT - $39
   Identity: local belonging. Contents: STL, GAME DAY, red/navy solids, subtle arch icon tile.
   Card line: "If you're from here, this one hits."

4. GAME DAY KIT - $39
   Identity: sports tribalism, team-neutral. Contents: GAME DAY, DEFENSE WINS, TAILGATE MODE, red/navy/white set.
   Card line: "For Saturdays, Sundays, and rivalry days."

TIER 2:

5. FAMILY RIDE KIT - $39
   Identity: parent pride. Contents: DAD'S CAR, MOM MOBILE, FAMILY RIDE, ROAD TRIP CREW, KID APPROVED, star and stripe icons.
   Card line: "Kids pick the tiles. Parents end up smiling."

6. JULY 4 LIMITED EDITION KIT - $49 (conditional, see Pricing Architecture level 3)
   Identity: event scarcity. Contents: JULY 4 2026 dated tile, exclusive fireworks tile, USA and flag variants, full red/white/blue set.
   Card line: "The 2026 tile is printed once. When it's gone, it's gone."

Bundle rule: ANY two kits for $69, including mixing.

Future kits speced inactive in kits.ts: Road Trip Kit (ROAM, DRIVE, EXPLORE, A LITTLE LOST), Minimalist Blackout Kit (black/white/navy solids, DRIVE), Midwest Clean Kit (MIDWEST, EST. 1776, muted textures).

## SITE-WIDE SEO TECHNICAL LAYER

- Unique title + meta description per route (strings below)
- Canonical tags, Open Graph + Twitter cards, designed 1200x630 OG image
- robots.txt + sitemap.xml (sitemap: / and /build only)
- /buy noindex,follow. /thanks noindex,nofollow.
- JSON-LD on /: Product schema for the American Classic Kit (brand Festive Frames, $39 USD, InStock, url -> /buy) + FAQPage schema + Organization schema with St. Louis locality
- Descriptive image filenames and natural alt text
- One h1 per page, h2 sections, descriptive internal anchor text

## 1. HOMEPAGE / (SEO + TRUST + DISCOVERY)

Meta title: Custom License Plate Frames with Snap-On Tiles | Festive Frames
Meta description: Snap-on license plate frame kits made in St. Louis. Patriotic, funny, game day, and family designs. Install once, swap tiles forever. Shop July 4 kits.

SEO keywords woven naturally: custom license plate frame, personalized license plate frame, snap on license plate frame, funny license plate frame, patriotic car accessories, 4th of July car decorations, game day car accessories, gift for car lovers.

HERO
- h1: Customizable License Plate Frames with Snap-On Tiles
- Subhead: Pick a kit that's already you. Install once. Swap tiles forever.
- Primary CTA: Shop July 4 Kits -> /buy
- Secondary CTA: Design Yours -> /build
- Hero image: frame on a real car, American Classic tiles installed. Placeholder slot, dimensions in comments. David supplies photography.

WHAT IT IS (plain and factual; this is where completeness + permanence anchoring lives)
- Modular license plate frame system. The frame installs once with your existing plate screws and stays on the car for good.
- Decorative tiles snap onto the frame border and swap in seconds, no tools. Buy once, change endlessly.
- Tiles never cover plate numbers, registration stickers, or state name.

KIT SHOWCASE
A card per active kit from kits.ts: photo, name, identity line, "Shop this kit" -> /buy?kit=<id>. Card headings double as SEO phrases (Patriotic license plate frame kit, Funny license plate frame kit, St. Louis pride kit, Game day kit, Family road trip kit, July 4 limited edition).

HOW IT WORKS (3 steps)
Install the frame once. Snap in your kit. Swap tiles forever.

GALLERY
4-6 labeled placeholder slots: kits on cars, snap mechanism close-up, tile swap mid-action, booth shot after launch weekend.

TRUST / LOCAL PRODUCTION
Designed and 3D printed in St. Louis, Missouri. Precision snap-fit components, outdoor-rated material, built for everyday driving. // TODO-VERIFY material wording.

HOMEPAGE FAQ (6, mirrored in FAQPage schema)
1. Will it fit my car? All standard US plates, all 50 states.
2. Is it legal? Frame and tiles sit on the border only and never cover plate numbers, registration stickers, or the state name. Drivers are responsible for their state's plate display rules.
3. Do tiles stay on at highway speed? Soft verifiable wording. // TODO-VERIFY
4. Weather and car washes? Soft claims. // TODO-VERIFY
5. Can I mix kits? Yes. Every tile fits every frame. Two kits are $69.
6. When do new kits drop? Every season. Email list gets first access.

CTA SECTION + EMAIL CAPTURE + SEO FOOTER
Shop July 4 Kits -> /buy. Design your own -> /build. Email field ("Kit drops, festival stops, early access. No spam, ever.") wired to a stubbed endpoint with provider TODO; show success only after the endpoint accepts. Footer: one natural paragraph re-describing the product, plus Shop / Builder / contact email.

## 2. CONVERSION PAGE /buy (REVENUE ENGINE)

Meta: noindex,follow. Title: Shop July 4 Kits | Festive Frames.

PRIMARY GOAL: QR scan to Stripe Checkout in under 60 seconds. Recognition, not browsing. Kit picker + a two-card offer, nothing more.

RULES
- Above the fold: hero kit image, headline, price, buy button. Nothing else.
- Sticky buy bar always visible
- No SEO writing, no long explanations, no savings language
- First load under 500KB

PAGE STRUCTURE

STICKY MOBILE BUY BAR
Shows the current selection: "Two-Kit Bundle - $69" by default (or "American Classic Kit - $39" if the visitor switched to single). "Buy Now" goes straight to checkout with the current selection.

HERO (kit defaults to American Classic, or ?kit=<id> from homepage)
- h1: Make your license plate the most fun part of your car.
- Subhead: Pick your kit. Snap it on. Swap it forever.
- Big kit photo + CTA reflecting the default selection: Get the Two-Kit Bundle - $69
- One line under CTA: Free festival pickup July 3-4, or $5 flat shipping.

SHIPPING CUTOFF COUNTDOWN (dates from season.ts)
- Before June 28: "Order by June 28 to get it before the Fourth" + live countdown
- June 28 to July 4: "Order now, pick up free at our festival booth July 3-4"
- After July 4: hidden

KIT PICKER
Six kit cards, swipeable row on mobile, grid on desktop. Each card: photo of the finished look, name, identity line, price, "Pick This One". One tap selects (updates hero, sticky bar, offer block). Limited kit shows its badge. The photo does the selling; no paragraphs on cards.

WHAT'S IN EVERY KIT (shared block; the completeness anchor)
1. Frame rail (fits all standard US plates, installs once with your existing screws)
2. The kit's tile set (renders from kits.ts for the selected kit)
3. Starter alphabet tiles
4. Quick-start card
Caption: Everything you need to customize your car today. Buy once, change endlessly.

HOW IT WORKS
Snap the frame on. Click in tiles. Swap forever.

OFFER BLOCK (primary conversion; exactly two cards, bundle preselected)

Card A: July 4 Kit - $39
- Check list: Frame. [Selected kit] tile set. Starter alphabet.
- Button: Buy Now

Card B (PRESELECTED, visually dominant, badge "Most Popular"): Two-Kit Bundle - $69
- Check list: Everything in the kit, x2. One for you, one for a gift or the second car.
- Default pairing: two of the selected kit. A small "mix kits" link lets the buyer swap the second kit (one extra tap, optional, never required).
- Button: Buy Now

Rules for this block:
- The bundle card carries the visual weight: position, size, badge. No aggressive language, no "save" math, no strikethroughs.
- Deselecting to the $39 card is one tap and the $39 card must read as complete, never as the lesser option.
- Quantity selector (1-5) lives below both cards, small.
- Fulfillment choice: Free festival pickup July 3-4 OR $5 flat US shipping.
- Under the buttons: 30-day guarantee. If you do not love it, send it back.
- NOTHING about future tile packs, expansions, or drops appears anywhere on /buy.

LIGHT TRUST SECTION
"Spotted at St. Louis July 4 events" + photo strip slot. Real photos and quotes replace placeholders after launch weekend. No fake reviews.

FAQ (max 5)
Fit, legality (same wording as homepage, never drop it), installation, weather (soft), pickup vs shipping.

POPUP (only one on this page)
- Fires once per visitor (localStorage), 2 seconds after load
- "Happy Fourth of July!"
- "Festival special: code FOURTH for $5 off, today only."
- "Claim It" pins a code chip next to the buy button; X dismisses; Escape closes; never re-fires; never appears during checkout redirect
- Code and amount from season.ts

## 3. BUILDER /build (POST-PURCHASE AND ENGAGEMENT LAYER)

Meta title: Design Your Own License Plate Frame | Festive Frames Builder

- Page intro: "Already have a frame? Design your next look. Tiles fit every Festive Frames rail."
- Persistent link on every Builder screen: "Start with a kit - $39" -> /buy
- Integrate the existing builder with the site's header, theme tokens, fonts; lazy-load under an instant shell if heavy
- Entry points: homepage secondary CTA, /buy footer link, /thanks

ONBOARDING POPUP (first-time visitors only, localStorage)
- "Let us show you a quick tutorial of the Builder."
- "Show Me" (3-step tooltip overlay: 1 type your text, 2 add tiles and colors, 3 preview) and "Skip, I got this"
- Never repeats. Never stacked. /build never shows the July 4 popup.

## 4. THANK YOU PAGE /thanks

Meta: noindex,nofollow.
- Retrieves the Stripe session from session_id, renders the real order: kit name(s), quantity, fulfillment. Never a generic thanks.
- Headline: You're in. Your kit is reserved.
- Pickup: booth location placeholder, July 3-4 dates, "show this screen at the booth"
- Shipping: timeline from season.ts
- THE UPSIDE LAYER LIVES HERE AND ONLY HERE: "New tile drops are coming. Seasonal packs, holiday sets, limited runs. Your frame fits them all." + email capture. This is the lifetime-value hook, introduced only after money has changed hands.
- Social prompt: "Text a photo of your frame to a friend who needs one." navigator.share with copy-link fallback.
- Cross-link: "Design your next look in the Builder" -> /build

## 5. 404 PAGE
Branded, one line, two buttons: Shop Kits -> /buy, Home -> /.

## STRIPE IMPLEMENTATION

- One product per active kit, price IDs in kits.ts. Singles $39, Limited $49 if active as distinct SKU.
- One serverless function creates the Checkout Session from {selection: "single"|"bundle", kitIds, quantity}
- Bundle pricing: the function prices any two kits at $69 total via server-side line-item construction or coupon. Never trust client prices; everything resolves from kits.ts/offers.ts and Stripe price IDs. If the bundle includes the $49 Limited, total is $79 (config value in offers.ts).
- shipping_address_collection US; shipping_options: "Festival Pickup July 3-4 (free)" $0 and "US Shipping" $5 flat
- Apple Pay + Google Pay enabled and tested on a physical phone
- allow_promotion_codes true; FOURTH ($5 off) in Stripe, mirrored in season.ts
- success_url /thanks?session_id={CHECKOUT_SESSION_ID}, cancel_url /buy (returning to the visitor's last selection state)
- Webhook checkout.session.completed -> structured log with kit id(s) and single/bundle flag. TODO: per-order email to David for festival pickup prep.
- Test mode first; live-swap steps in LAUNCH_CHECKLIST.md

## QR SYSTEM

Three high-res PNGs (300dpi-ready, quiet zone) to /marketing/qr/ with README on minimum print sizes:
- /buy?utm_source=qr&utm_campaign=booth
- /buy?utm_source=qr&utm_campaign=car
- /buy?utm_source=qr&utm_campaign=card
Production domain set once in config.

## BOOTH SIGNAGE COPY (deliverable, /marketing/signage/README.md)

Booth pricing is seen, not explained. Provide print-ready copy hierarchy:
- BIG SIGN, one line: "Custom License Plate Frames - $39"
- SECOND LINE, half size: "Two for $69"
- Nothing else on the price sign. No feature lists, no paragraphs.
- Small QR placard copy: "Skip the line. Buy here." + booth QR code
Include suggested sizes (banner, A-frame, tabletop) and pair each with the matching QR asset.

## ANALYTICS

Plausible or Vercel Analytics. Events:
- kit_selected (kit id)
- offer_selected (single | bundle) - measures the bundle-default strategy
- buy_click (kit id(s), single/bundle, page, campaign)
- checkout_start (kit id(s), bundle flag)
- purchase (on /thanks with session retrieved; kit id(s), single/bundle, AOV)
- popup_claim
- builder_open, builder_tutorial_start
UTM source/campaign attached throughout. By July 5 David must know: top-selling identity, bundle attach rate, and AOV per QR placement.

## DESIGN DIRECTION

- Vintage American summer, not clip-art patriotism. Roadside Americana meets modern product brand.
- CSS variables: deep navy base, warm cream, signal red accent, single gold for stars.
- Typography: characterful mid-century American signage display face + clean body font, self-hosted. No Inter, Roboto, Arial, system defaults.
- Texture: subtle paper grain, faint hero star field, slim candy-stripe dividers. Restraint.
- Motion: one staggered hero reveal, snap micro-animation on the buy button, ticking countdown, smooth kit-card and offer-card selection states. Nothing else moves. Respect prefers-reduced-motion.
- Kit cards and the two offer cards are the visual heart of the site: consistent photography framing so everything reads as one family. The bundle card's dominance comes from layout, not louder graphics.

## PERFORMANCE

- Lighthouse mobile 90+ on / and /buy; /buy under 2.5s on simulated 4G
- Astro Image, AVIF/WebP, explicit dimensions, hero preloaded; kit images lazy below fold
- Max 2 font families, subset, font-display swap
- Small Astro/vanilla islands only (popup, countdown, sticky bar, picker and offer state). No client framework on / or /buy.

## DELIVERABLES BEYOND CODE

- LAUNCH_CHECKLIST.md: live Stripe keys, live products + FOURTH code, real-phone cellular test orders (single, bundle, mixed bundle, promo code, both fulfillment options, Apple Pay), printed QR scan test, analytics events firing, OG preview, booth address inserted on /thanks
- README.md: editing copy.ts, season.ts swaps, kits.ts add/retire/reprice, offers.ts pricing experiments
- /marketing/signage/README.md as above

## OUT OF SCOPE FOR V1

- Accounts, login, order history
- Individual tile pack SKUs (post-launch; teased only on /thanks and email)
- Booth-exclusive kits on the site (offline only, on purpose)
- Blog or extra pages
- Inventory counts

## BUILD ORDER

1. Skeleton of all 5 routes, Vercel preview
2. Theme system (season.ts, tokens, typography), kits.ts + offers.ts, homepage
3. /buy kit picker + two-card offer block + Stripe Checkout end to end in test mode, including bundle default, mixed bundles, and /thanks session retrieval
4. Popups, countdown, sticky buy bar, quantity selector
5. SEO layer: meta, JSON-LD, sitemap, robots, OG image
6. /build integration + onboarding popup
7. QR + signage assets, analytics events, LAUNCH_CHECKLIST.md, README.md
8. Polish: motion, copy from copy.ts, Lighthouse, real-phone test

Show preview URLs after each step. Ask before deviating from this document.

## SUCCESS CRITERIA

- A stranger understands any kit card in under 2 seconds
- QR scan to Stripe Checkout in under 60 seconds; the default path (bundle, default kit) requires zero decisions beyond tapping Buy
- Analytics answer by July 5: top identity, bundle attach rate, AOV per QR placement
- $39 reads as complete, $69 reads as the obvious adult decision, and no savings math appears anywhere
- / ranks over time for custom license plate frame variants
- Season two, new kits, and price changes are config-only
