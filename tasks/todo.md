# Marketing site: SEO / AIO / schema / testimonials

## Goal
Rank + get cited by AI answer engines out of the gate (low ad spend). Honest schema only — no fake reviews.

- [ ] **copy.ts**: add `seo` long-form block (search-intent keywords) + `testimonials` (Becky, Henry); expand `home.faq` (12 total, high-intent questions)
- [ ] **SeoContent.tsx**: render the keyword-rich content section
- [ ] **Testimonials.tsx**: render Becky (artist) + Henry (founder) — labeled as makers, NOT customer reviews
- [ ] **page.tsx**: render new sections; enrich JSON-LD:
  - Organization → add logo + OnlineStore type
  - add WebSite entity
  - Product/Offer → priceValidUntil, itemCondition, MerchantReturnPolicy (30d), OfferShippingDetails ($5 US)
  - keep FAQPage (now 12), ItemList, BreadcrumbList
  - NO aggregateRating/Review (no real customer reviews yet — ready to add later)
- [ ] **public/llms.txt**: concise factual brand/product summary for AI crawlers
- [ ] `next build` clean + deploy

## Search intent targeted (woven naturally, no stuffing)
custom / customizable / personalized / decorative license plate frame · snap-on /
interchangeable / swappable tiles · patriotic / American flag / red white & blue /
stars & stripes · 4th of July / Independence Day car decoration · fits all US plates
50 states · made in USA / St. Louis · legal (doesn't cover plate) · car wash / weather ·
car gift

## Product images (needs David)
Builder output > current AI lifestyle shots. Recommend: export 3-5 designs from /build
(Save Image, hi-res), drop in public/, I integrate as hero/kit/gallery. (Alt: I write a
sharp compositor to render flat frame images from tile arrangements.)
