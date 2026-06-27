# Festive Frames — Google Ads Starter Plan

_Custom license-plate-frame builder · $39 / 2-for-$69 · $5 flat US shipping · made-to-order in St. Louis · design at /build_

Created 2026-06-27. Goal: start driving qualified traffic now, build conversion data, scale what works.

---

## PRIORITY 0 — Before you spend a dollar (do this first)

**Conversion tracking is not live.** `src/lib/analytics.ts` is a no-op shim: it pushes
`purchase` / `checkout_start` / `buy_click` to `window.dataLayer` but no Google tag
collects them. Without this, Google Ads optimizes on nothing.

Fastest path (plumbing already exists):
1. Create a **Google Ads** account + a **GA4** property (free).
2. Add a **GTM container** (or gtag) to the site — it auto-receives the existing
   `dataLayer` events. (One small code change; I can wire `@next/third-parties` GTM.)
3. In GTM, fire a **Google Ads "Purchase" conversion** on the `purchase` event
   (already fired on `/thanks` by `PurchaseTracker`). Send order value if available.
4. Also tag `begin_checkout` from `checkout_start` (micro-conversion / signal).
5. **Test one real $0 order** (your 100%-off promo) and confirm the conversion logs.

Until conversions are importing, run on **Maximize Clicks** (not Smart Bidding) and
keep budgets small. Switch to conversion bidding once ~15–30 conversions exist.

---

## Account structure (lean — don't fragment a starter budget)

Start with **Search only** (highest intent, fastest learning). Add Performance Max
in ~2 weeks once conversion data seeds it. Three campaigns:

```
GOOG_Search_NonBrand_Custom-Patriotic   ← the engine (most budget)
GOOG_Search_Brand_FestiveFrames          ← cheap defense (small)
GOOG_Search_Seasonal_July4               ← short burst, only if you can ship in time
```

### Campaign 1 — Non-Brand Search (the core)
Tight, theme-matched ad groups (each → its matching landing page for Quality Score):

| Ad group | Sample keywords (phrase + exact) | Landing page |
|---|---|---|
| Custom frames | "custom license plate frame", "personalized license plate frame", "design your own license plate frame" | `/build` |
| Patriotic | "patriotic license plate frame", "american flag license plate frame", "red white and blue license plate frame" | `/patriotic-license-plate-frame` |
| America's 250th | "america 250 license plate frame", "250th anniversary license plate frame", "1776 2026 license plate frame" | `/america-250-license-plate-frame` |
| Made in USA | "made in usa license plate frame", "american made license plate frame" | `/made-in-usa-license-plate-frame` |
| Veteran/military | "veteran license plate frame", "military license plate frame" | `/veteran-license-plate-frame` |
| Gifts (car guy/dad) | "gift for car guy", "patriotic gift for dad", "car gifts under 50" | `/gifts/...` |

Match types: launch **phrase + exact** (broad burns budget without conversion data).
Add broad later, gated by Smart Bidding + a strong negative list.

### Campaign 2 — Brand
Keywords: "festive frames", "festive frames license plate", "festiveframes".
Cheap clicks, protects the name, captures people who saw you elsewhere. ~$3–5/day.

### Campaign 3 — Seasonal July 4 (burst, conditional)
ONLY run if you can realistically ship to arrive ~July 4 (expedited). Keywords:
"4th of july license plate frame", "july 4th license plate frame", "patriotic car
decorations". **Pause or repoint to "America's 250th — all summer" after ~July 1.**

---

## Negative keywords (add at the account level)

`free`, `diy`, `how to make`, `template`, `svg`, `printable`, `decal`, `sticker`,
`vinyl wrap`, `eyeglass`, `glasses`, `picture frame`, `photo frame`, `wall frame`,
`oem`, `dealer`, `dealership`, `replacement screws`, `motorcycle` (unless supported),
`atv`, `bicycle`, `used`, `wholesale lot`, `jobs`, `salary`, `near me` (no local pickup).

Keep as KEYWORDS (buyers use these): `license plate holder`, `plate frame cover`.

---

## Responsive Search Ad copy (3 RSAs to start; pin nothing at first)

**Brand/TM note:** use "America's 250th" or "1776–2026" — never the registered
"America 250 / USA250" marks. Always pair brand with "Custom License Plate Frames."
Per the site's softened promise, do **not** hard-claim "arrives by July 4."

### RSA — Custom / Patriotic (primary)
Headlines (≤30 chars):
- Custom License Plate Frames
- Design Your Own Frame
- Patriotic Plate Frames
- Celebrate America's 250th
- Design It in Minutes
- $39 — Or 2 Frames for $69
- Snap-On Custom Tiles
- Hand-Made in the USA
- Stars, Flags & Fireworks
- $5 Flat US Shipping
- 30-Day Guarantee
- Build Your Frame Online
- Made to Order in St. Louis
- Your Car, Your Colors
- Red, White & Blue Style

Descriptions (≤90 chars):
- Design a one-of-a-kind plate frame in minutes. Hand-made in the USA, shipped fast.
- Snap on the tiles you want — flags, stars, fireworks. $39, or 2 for $69.
- Celebrate America's 250th with a frame that's truly yours. 30-day guarantee.
- Your car, your colors. Build it online; we hand-make it in St. Louis. $5 shipping.

### RSA — America's 250th (differentiator)
Swap headlines to lead with: "America's 250th, 1776–2026", "Celebrate 250 Years",
"A Frame for the 250th", "Limited Launch Edition". Same offer/trust lines.

### RSA — Gifts
Lead with: "The Gift for the Car Guy", "Personalized Patriotic Gift", "Gift Under
$50", "They Design It Themselves". Point to the relevant `/gifts/` page.

### Assets (set once, apply to all)
- **Sitelinks:** Design Your Frame (/build) · How It Works · 2 for $69 · 30-Day Guarantee
- **Callouts:** Made in USA · Hand-Made to Order · $5 Flat Shipping · Design in Minutes · 30-Day Guarantee
- **Structured snippet (Types):** Flags, Stars, Fireworks, Eagles, Banners
- **Price asset:** Single Frame $39 · Two Frames $69
- **Promotion asset:** "2 for $69" (no hard date claims)
- **Image assets:** the look previews (years250, spirit76, etc.) + a real frame-on-car photo

---

## Final URLs + UTMs (tracking already merges these)

`analytics.ts` auto-merges `utm_source/medium/campaign` into events. Use:
`?utm_source=google&utm_medium=cpc&utm_campaign=nonbrand_custom` (etc. per campaign).
Match each ad group to its themed landing page above (better Quality Score + CVR).

---

## Budget & bidding (starter)

| Tier | Daily | ~Monthly | Use |
|---|---|---|---|
| Toe-in | $20/day | ~$600 | Validate keywords + tracking; expect thin data |
| **Recommended** | **$40–50/day** | **~$1.2–1.5k** | Enough to seed conversions in ~2–3 wks |
| Push | $80–100/day | ~$2.4–3k | If early CPA looks healthy |

Allocation at $45/day: ~$35 Non-Brand · ~$5 Brand · ~$5 Seasonal (while live).

**Bidding:** start **Maximize Clicks with a max CPC cap (~$1.50–2.50)** until ~15–30
conversions, then move Non-Brand to **Maximize Conversions** and later **Target CPA**.
Set your tCPA below your per-order contribution margin (you know your make cost — at
$39–69 AOV, a sustainable CPA is likely in the **$12–22** range; validate with real data).

---

## First 2 weeks — what to watch / do

- **Daily (first 3 days):** search-terms report → add negatives aggressively (junk
  queries are the #1 budget leak early).
- **Quality Score:** if low, tighten ad-group→keyword→landing-page match.
- **CTR < 3–4%** on a group → new headlines/angle. **High CTR, low CVR** → landing
  page or offer (see /page-cro).
- **~Day 10–14:** pause keywords with spend > 2× target CPA and 0 conversions;
  shift budget to winners; once ≥15–30 conversions, switch to conversion bidding.
- **Then:** add a **Performance Max** campaign (great for this visual product) fed by
  the conversion data + your look images, and a **retargeting** PMax/Display audience
  for `/build` visitors who didn't buy (cart/`begin_checkout` abandoners are gold).

---

## Honest expectations

- New account + new domain = a 1–2 week learning period; early CPCs in auto/niche
  terms can run **$1–3**. First conversions may be pricey before bidding learns.
- The 4th-of-July spike is essentially over for "in-time" shipping; **America's 250th
  + custom patriotic gift** is the angle that sustains spend through the summer.
- Biggest lever on ROAS is post-click: the builder must feel fast and obvious (we just
  did the perf + UX work — good). Keep an eye on `/build` → add-to-cart → purchase rate.
