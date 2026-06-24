# Festive Frames — Expansion Investment & Go-To-Market Report

Prepared 2026-06-11. Companion to `tasks/expansion-ideas.md` (idea bank + best-seller
ranking) and `reports/portfolio-audit-2026-06-09.md`.

Answers three questions: (1) where to put development money, (2) who exactly to
talk to, (3) how to get the product out in the world.

---

## 1. WHERE TO PUT THE MONEY

### Rule zero: free fixes before funded bets
These cost $0 and gate everything below — do them before spending a dollar:
- Wire SUBSCRIBE_ENDPOINT (every email signup is currently dropped)
- Attach analytics (Plausible/GTM — the framework is already in the code)
- Verify live Stripe mode + order-email env vars in Railway

### The allocation (first ~$5,000 of expansion capital)

| % | Investment | Why this order |
|---|-----------|----------------|
| 40% (~$2,000) | **Production capacity** — printer #2, filament stock, assembly jigs, packaging supplies; get 2 outsource quotes (local print farm + contract manufacturer) as the scale plan | The audit's hard ceiling: manual fulfillment caps ~10–20 units/week. EVERY channel below dies at that ceiling. Capacity is the only investment that multiplies all others. |
| 25% (~$1,250) | **Content** — one pro product-photo day (every kit on real cars) + 20–30 short vertical videos (the tile SNAP is inherently satisfying — ASMR-adjacent, made for Reels/TikTok) | Content is the asset every channel reuses: site, ads, Etsy, wholesale pitches, influencer briefs. One spend, six uses. |
| 20% (~$1,000) | **Seeding & samples** — ~50 frames given away strategically: 25 to micro-influencers (car, dog-mom, trunk-or-treat creators), 25 as physical samples for B2B prospects (dealers, youth pastors, PTO presidents) | The TRMNL lesson: one free unit to the right creator can outperform months of ads. A $12-COGS sample that lands a 50-unit church order is the best ROI in this plan. |
| 15% (~$750) | **Paid ads — seasonal windows only** — $25/day Meta/IG bursts: 2 wks pre-July-4 (now), Sept (Game Day), early Oct (trunk-or-treat), Black Friday window | Ads amplify proven windows; they don't create demand. Never run them outside a deadline season until repeat-purchase data justifies it. |

### Development (code) money: almost none needed
The only build worth funding (and Claude builds it, so the cost is time not cash):
1. **Group-order / bulk flow** — one feature unlocks ALL THREE B2B channels
   (school fundraiser pages, church youth-group pages, dealer bulk pricing).
   A shareable per-organization order page with a group code is the MVP.
2. **Kit activation** — Game Day/Halloween/Christmas are `active: false` flips
   plus Stripe price IDs plus photography. Near-zero dev.
3. NOT YET: subscriptions, the public designer, custom-logo tooling. All real,
   all premature until 2–3 drops prove repeat purchase.

### What NOT to fund yet
- Licensing (NASCAR/colleges/pro sports) — capital-heavy, slow; earn the volume first
- Inventory for >2 unproven kits at once — activate sequentially, read sell-through
- A retail storefront / trade-show booths — wholesale via Faire reaches shops cheaper

---

## 2. WHO TO TALK TO (names of roles, not vague "partners")

### Churches (David emphasis — identity + channel in one)
- **Youth pastor / youth director** — owns fundraisers AND trunk-or-treat. The
  single highest-leverage contact on this list: one yes = a fundraiser (bulk
  faith kits) + an October event (Halloween kits) + a congregation newsletter.
- **Church administrator / bookstore manager** — consignment or wholesale for
  faith kits at larger churches.
- **Where:** start with the 10 largest congregations in the STL metro + David's
  own network. Mega-churches have actual gift shops.
- **Pitch:** "Made-in-St-Louis fundraiser your families keep on their cars —
  the school sells candy bars; you sell something people see every day."

### Schools
- **PTO/PTA president** and **booster club treasurer** — they pick fundraisers
  (decision window: late summer for fall fundraising season — contact in JULY/AUG).
- **Athletic director** — spirit-wear angle for fall sports season.
- **Pitch:** school keeps $10–15/unit, product is durable (not consumable), and
  every sold frame is a rolling ad in the school pickup line.

### Car dealerships
- **Used-car independents first** (owner is the decision-maker, one meeting),
  **then franchise stores** via the **parts & accessories manager** or **F&I
  manager** (NOT the GM cold — accessories upsells are their P&L).
- **Pitch:** "You already bolt a branded frame on every car you sell. This one
  the customer keeps, plays with, and shows off — with your name on the rail."
- Pilot: 5 STL dealerships, free 10-frame sample program, $10–14/frame at volume.

### Local distribution & press (the made-in-STL story)
- **STL boutique gift shops** — buyers respond to local + giftable; also reachable
  at scale via **Faire** (wholesale marketplace — set up a seller profile, this
  is how indie shops nationwide discover products).
- **St. Louis Post-Dispatch business desk, KSDK / Fox2 lifestyle segments,
  STL Magazine gift guides** — "St. Louis crew launches snap-on frame for
  America's 250th" is a real local-news story; the Founding Edition 250 cap is
  the hook. Pitch gift guides in SEPTEMBER for holiday inclusion.
- **Cars & Coffee organizers, Cardinals tailgate lots** — hand out frames, film it.

### Creators (borrowed channels — seed, don't sponsor)
- **Car TikTok/IG micro-creators (10–100K followers)** — the snap/swap demo IS
  the content. Send free kits, no strings.
- **Dog-mom / pet lifestyle creators** — primes the Pet kit before it exists;
  gauge demand from comments.
- **Trunk-or-treat / mom-content creators** — September seeding for October buzz.
- **Catalog placements** — Uncommon Goods + The Grommet submission portals;
  apply NOW for holiday consideration (lead times run 3–6 months).

---

## 3. HOW TO GET OUT IN THE WORLD (ORB structure)

### Owned (the asset you compound)
- **Email list is the business.** Fix the endpoint, then: every kit drop goes to
  the list first ("Founding members get 48 hours early"). Target: 1,000 emails
  by Labor Day via QR loop + giveaways at every event.
- **QR viral loop** — every frame on the road links back to the designer. Add a
  referral hook later ("10 scans = $5 off your next set").
- **The site** — already strong on SEO infrastructure; add one landing page per
  kit drop, plus a /fundraisers page and /dealers page (the B2B front doors).

### Rented (where attention lives)
- **TikTok + IG Reels** — the one rented channel to take seriously. The product
  is visual, tactile, and transforms — algorithm food. 3–5 posts/week from the
  content-day footage. Every post funnels to email/site.
- **Etsy** — list immediately: "custom license plate frame" has standing search
  demand; Etsy buyers actively seek made-in-USA gifts. Low effort, real volume.
- **Amazon FBA** — LATER (Q4 at earliest). Margin hit ~45%; only after organic
  proof and capacity headroom.

### Borrowed (the cheap growth)
- **The B2B channels ARE borrowed audiences**: a church's congregation, a
  school's parent list, a dealership's customer flow — each comes with built-in
  trust that no ad buys. The group-order build is what converts them.
- **Creator seeding** per section 2.
- **Local press** per section 2.
- Convert ALL borrowed attention to owned: every fundraiser page, every video,
  every article ends in the email capture.

---

## THE 90-DAY SEQUENCE

**Now–July 4 (launch window):** $0 fixes; July 4 push; collect every email and
review; film everything for content library.

**July (read the data):** Repeat-purchase + geography read from launch. Contact
PTO/booster/youth-pastor lists (schools decide fall fundraisers NOW). Activate
Game Day kit. Submit Uncommon Goods/Grommet. Set up Etsy + Faire.

**August (build the machine):** Printer #2 + outsource quotes. Group-order flow
built. Dealer pilot: 5 sample drops. Content day #2 (Halloween/Christmas kits
on cars). Seed trunk-or-treat creators.

**September (fall season opens):** School/church fundraiser pilots live (target:
2 orgs). Halloween kit drop to email list + $25/day ads. Gift-guide press
pitches out. Game Day weekly content through football season.

**Success gates:** if July repeat-purchase <15%, pause kit expansion and fix the
core offer before scaling channels. If a fundraiser pilot moves 30+ units, the
2027 plan is fundraiser-led. If dealer pilot converts 2/5, hire the first
part-time assembler.
