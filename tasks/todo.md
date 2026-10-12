# Chicagoland expansion: 30 authored school builders (2026-10-11)

Henry: "start the expansion to chicago area starting with north shore" → "do the custom
builder buildouts for the top 30 schools in chicagoland" → "have adversarial agents check
your work and do a polish pass".

Ground rules (from CLAUDE.md): kits carry appearance + identity only; every welcome fact
sourced; colours honest in `colorSource`; `status: "demo"`; NOT added to the pilot list
(going live is Henry's call); no marks in public/ without written permission; no email.

## The 30 (North Shore first, then the strongest-identity Chicagoland schools)
North Shore / north: New Trier, Evanston Township, Glenbrook North, Glenbrook South,
Highland Park, Deerfield, Lake Forest, Loyola Academy, Stevenson, Libertyville,
Carmel Catholic, Notre Dame College Prep
Northwest / near west: Barrington, Prospect, Saint Viator, Maine South, Fenwick, Oak Park
and River Forest
West / DuPage: Hinsdale Central, Lyons Township, York, Glenbard West, Wheaton Warrenville
South, Naperville Central, Naperville North, Neuqua Valley, Benet Academy
City Catholic: Saint Ignatius College Prep, Mount Carmel, Marist

## Steps
- [x] Research: 5 agents, sourced facts per school + logo URLs + published hex
- [x] Illinois plate law / sticker / plate design check (affects the product, not kits)
- [x] Colours: measure each school's own logo with scripts/sample-brand-colors.mjs
- [x] Write 30 kits in src/data/school-kits.ts (rosterId joins; Loyola/Carmel have none)
- [x] Tests: geometry, chips, phrases, no-festive, resolve, kit-sample — all green
- [x] Render every kit (print path) → contact sheet; browser check of 2+ on a phone width
- [x] Check the IL preview plate: it is a DRAWN plate, not a photo — IL stock photo is a follow-up
- [x] Adversarial pass: fact-check welcome copy vs sources; visual/legibility review; code review
- [x] Polish pass on findings; re-render
- [x] Outreach catalog: tasks/chicagoland-outreach.md (ranking + best first door per school)
- [ ] Commit + ONE push together with the St. Louis session — waiting on Henry's go

---

# St. Louis push: bring the other 21 schools up to pilot standard (2026-10-11)

Henry: "complete the ST LOUIS push today… download the mascots, make sure each page
is appropriately customized." Pilot standard = what Marquette/Eureka/Lafayette/
West/Central/Ladue have: colours MEASURED from the school's own logo, the school's
mascot on its builder (marks, Bill's demo call 2026-09-24), sourced welcome copy in
the pilot voice, its own vanity plate, a QR card, and an OPEN builder.

Schools (21): kirkwood, micds, cbc, de-smet, chaminade, vianney, sja, nerinx,
cor-jesu, iwa, webster, clayton, lindbergh, burroughs, priory, whitfield, fzw,
mehlville, oakville, pattonville, francis-howell. SLUH already has measured
colours + marks; it only needs opening.

- [x] scripts/make-kit-mascot.ts: logo -> 1024 square transparent mascot (app keyer)
- [x] Research (4 helpers): download each logo to Pilot Kit/school-brand/<slug>/,
      sources.md, measured colours, thread-checked rim, sourced welcome + chips
- [x] Review every mascot on its own field by eye (one-inch test) — MICDS edge line
      fixed; CBC, FZ West, Cor Jesu carded; Francis Howell HELD (NFL Vikings
      lookalike); Incarnate Word has no usable art
- [x] Apply to kits: colours, colorSource, welcome, marks, signature
- [x] Open builders: all 28 St. Louis kits (finder + /s pages); the finder is a
      search when the list does not fit
- [x] QR cards: pilot-qr.mjs kit copy synced, 28 cards in Pilot Kit/qr-tracked
- [ ] Vanity plates: BLOCKED on a Gemini key (Henry: save it to C:/Users/david/.gkey).
      Words (<=7 chars, MO): CADETS SPARTAN DEVILS GRIFFIN ANGELS MARKERS CHARGER
      KNIGHTS WEBSTER HOUNDS FLYERS BOMBERS RAVENS WARRIOR JAGUARS PANTHER TIGERS
      PIRATES VIKINGS — 19 x 3 tries x $0.039 (gemini-2.5-flash-image) = ~$2.25
- [x] Verify: full test suite, kit-sample renders, phone browser check, finder
- [x] Adversarial review (code, facts x2, visual) -> polish pass
- [x] One push to master (f93bcfa, with Chicagoland's 874642c); live 2026-10-12;
      CLAUDE.md + memory updated

---

# Student profiles (invisible) + scan-to-sale funnel (2026-09-27) — plan approved

Plan: ~/.claude/plans/thinking-wiggly-sunrise.md. Henry: opt-in checkbox YES (unticked); tracking in our own DB, no Google.

## Part A — student profiles
- [x] customers + students tables; designs.student_id, orders.customer_id
- [x] Builder sends the intake as `student`; server coerces; save upserts + links
- [x] Browser remembers its student (link-memory); a new name = a new student
- [x] Payment links student + order to a customer by Stripe email (never by typed email)
- [x] Unticked "tell me about future products" checkbox on Send; stored with date
- [x] Dashboard: student card on design; students per school

## Part B — funnel
- [x] /q/<school>/<placement> records a scan, forwards to /s/<school>
- [x] events table; anonymous browser id; open/engage beacons; send/checkout/paid server-side
- [x] Dashboard Funnel page (school x placement, 7/30/90 days)
- [x] Pilot QR cards use /q links
- [x] Privacy page: tracking, saved students, opt-in

---

# One order record + the admin dashboard (2026-09-26) — Henry: "lets go"

Found first: TWO tables named `school_orders` (the fundraiser ledger's, live, 0 rows;
and the new order record's). Whichever is created first wins and the other breaks.
Live state checked read-only: ledger table exists (0 rows); saved-design tables not
created yet (no send since the deploy). Nothing broken for anyone; checkout is off.

## 1. One order record, which IS the fundraiser ledger
- [x] `school_orders` = the order record (design, revision, status, payment,
      donation, refund). Fundraiser totals are SUMMED from it — no second table
- [x] Migration: the legacy ledger table (0 rows live) is renamed aside, never dropped
- [x] Refunds mark the order (it exists from checkout, before any Stripe event), so
      event order no longer matters (review #7 dissolves); a refunded order is never sent
- [x] Webhook / thanks relay stop writing a separate ledger; /raised reads the orders

## 2. Admin dashboard at /admin (staff only)
- [x] Sign-in by emailed link to an allowlist (`ADMIN_EMAILS`: Henry, Bill) — no
      passwords, no accounts; signed, expiring cookie; noindex; rate limited
- [x] Overview: orders needing action (HELD), paid-not-sent, sends this week
- [x] Orders, Schools (frames + raised per school), Sent designs (code, school,
      contact, versions, proof image), School requests
- [x] Read-only v1, plus ONE action: issue a parent a fresh link (review #8)

## Railway (Henry, or Claude on his go)
- SITE_URL -> https://www.myschoolframe.com ; MSF_EMAIL_FROM ; ADMIN_EMAILS

---

# Saved-design + school-order hardening (2026-09-25) — Henry's go: "fix 1-3 elegantly"

Festive Frames is DEFUNCT (Henry, 2026-09-25): school orders only; the holiday paid
path is not hardened. School checkout stays PARKED throughout. One push at the end.

## 1. Photos survive on another device
- [x] Send/Buy includes each upload's full-res ORIGINAL (every `fullResId` in the
      design, found by walking it — not a hand list of where uploads live)
- [x] Stored in `school_artifacts`; the revision maps fullResId -> sha256
- [x] Opening a link re-fills this device's IndexedDB under the SAME fullResId
      (token-checked artifact route), so print reads the original as before
- [x] Verified in Edge: 420,021-byte original on device A is in device B's IndexedDB under the same id after opening the link

## 2. A failed send still shows the saved link, and "Try again" reuses the version
- [x] Unchanged content = same revision (fingerprint), so a retry or double tap never
      makes version 2 of nothing
- [x] Send sheet on failure: "Saved as MSF-… — we couldn't reach our team" + link + retry

## 3. School orders: locked version, recorded approval, crash-safe sending
- [x] `school_orders` table: order -> (design, revision) — files come from the
      immutable revision, so there is nothing to replace (review #3) and nothing
      a 24h sweep can delete (review #4); revisions with orders are never swept
- [x] Proof sheet before pay: the PRINT render + every line of lettering as text;
      "Approve and pay" records approval on the revision (versioned wording)
- [x] Checkout requires an approved revision + the design's token; server makes
      the order id; Stripe metadata carries order + revision + proof hash
- [x] Fulfilment: record payment -> expiring processing claim -> verify approval and
      re-hash files -> send with Resend idempotency keys -> mark sent. A killed
      process's claim expires and Stripe's redelivery finishes it (review #2).
      No approval / hash mismatch -> HELD + alert, never printed
- [x] School orders stop using order_drafts entirely
- [x] Memory storage refused in production (review #6) for designs and orders

## Not in this batch (named so they are not forgotten)
- Fundraiser ledger refund-before-purchase ordering (review #7) — now in tasks/checkout-launch-checklist.md
- Lost-link recovery for parents (review #8) — now in tasks/checkout-launch-checklist.md
- Holiday checkout still accepts payment for a defunct shop — ask Henry to switch off

---

# MySchoolFrame pilot launch — the six-school batch (2026-09-23)

**Owner's rule for this phase:** the goal is not a more complete product, it is getting
MySchoolFrame in front of real PTOs and booster clubs. Everything below serves the pilot;
nothing expands it.

**Pilot schools (six):** Marquette (Chesterfield), Eureka (Eureka), Lafayette (Wildwood),
Parkway West (Ballwin), Parkway Central (Chesterfield), Ladue Horton Watkins (St. Louis).

**Owner decisions made 2026-09-23:** price $24.95, $5 per frame to the school; reduce the
"every school" claim; warranty 1 year.

## Part A — site changes (SHIPPED in commit 6f1a8b2, one push)

- [x] Pricing $24.95 / $5 (checkout parked until one test payment)
- [x] Pilot scope: finder = six schools; other schools get a "not ready yet" page + request form
- [x] Eureka kit (researched, fact-checked)
- [x] Warranty 1 year (/school/warranty)
- [x] Names de-emphasised in copy AND product (name optional; one-tap CLASS OF / SENIOR / #12 / PROUD PARENT)
- [x] Non-sports lead (arts & academics first in tray and menu)
- [x] Every badge square, uploads included (canPlace rule; saved designs repaired)
- [x] Print = screen colours (badge background = banner colour)
- [x] Banner swap: school on top, HOME OF THE / MASCOT on the bottom
- [x] Themed presets/chips rebuild existing designs (one undo step)
- [x] Send sheet with required parent email; school mail to bill@myschoolframe.com; no festiveframes.co on MSF
- [x] Keystone 6.25 / 5.25, 0.375" corners (note for Bill in tasks/flush-frame-for-bill.md)
- [x] New MSF logos, measured colours, school plates (STANGS/WLDCTS/LANCER/HORNS/COLTS/RAMS), new orchestra + torch
- [x] Mobile polish, voice pass
- [x] 2374 tests, tsc, build green

## Part B — deliverables

- [x] QR codes + 4x6 cards: MySchoolFrame Pilot Kit/qr (all decode-verified)
- [x] Sample sets, six designs per school in Bill's pitch order: MySchoolFrame Pilot Kit/samples
- [x] Tracking sheet (Google Drive: "MySchoolFrame Pilot Tracker")
- [x] Bill's playbook page: https://claude.ai/artifact/1CkRPXhidKDDuoUwy1niYw
- [x] Student photo mockups: MySchoolFrame Pilot Kit/gemini/photos

## Part C — owner steps

- [x] DNS for bill@myschoolframe.com (MX, SPF, DKIM, DMARC verified)
- [ ] Two-email test from/to bill@ (check SPF/DKIM/DMARC PASS in Gmail "Show original")
- [ ] Resend: add myschoolframe.com, paste records → set MSF_EMAIL_FROM on Railway
- [ ] Test payment end to end, then flip SCHOOL_CHECKOUT_OPEN
- [ ] Real iPhone pass on each of the six builders
- [ ] School permission for logos (Parkway West: district / Kelly Sports licensing)
- [ ] Read the 1-year warranty wording once
- [ ] Physical sample per school (new keystone size); real on-car photograph
- [ ] Decide: MISSOURI half-covered by the top runner (RSMo 301.130.5 "plainly visible")

---

# Badge library round (2026-09-27) — Henry: "yes go, make sure you're really happy"

Research: tasks/badge-library-gaps.md. Clipped-art fix pushed (0f0da0d).

- [x] Right-size the 4 redrawn PNGs to ~1000 px (library norm; were 1.2–1.65k, up to 3.4 MB); re-run light-enamel + art:fit
- [x] Free wins into the activity menu (art exists, looked at): Jazz Band, Color Guard, Film, Ceramics, Culinary, Agriculture, Weightlifting, Crew, Sailing, Skiing
- [x] Generate Tier 1 (gemini-3-pro-image 2K, ≥3 each): flag football, pom team, health sciences (stethoscope heart, no red cross), business (briefcase + arrow), proud family (heart + grad cap)
- [x] Process (edge refusal, keyEnclosed), one-inch test on navy + light field, reject anything that reads as another badge
- [x] Register winners in sets/high-school.ts + activities.ts; ivory twins; art:fit
- [x] Verify: print render + browser on dark & light school; full tests, tsc, lint, build
- [x] One push; update CLAUDE.md + gaps doc
- Skipped on purpose: Captain/State (needs words — better as a banner line); see review below

# Badge library Tier 2 (2026-09-27) — Henry: "go ahead for the second tier"
- [x] Generate: stage crew (spotlight), math (compass + set square, no pi), coding (laptop + brackets), bass fishing, inclusive sports (Unified — Special Olympics' name stays a keyword)
- [x] Key Club / volunteer: no new art (Service covers it) — keywords instead; also show choir→Choir, speech→Debate, beach→Volleyball
- [x] Process, one-inch test on 4 fields, ivory twins, art:fit, register + menu + keywords
- [x] Print + browser check; tests, tsc, lint, build; one push; docs
- [x] Found + fixed: magenta hairline on every Gemini badge (despill + badge-spill.test.ts); all 14 of today's badges re-cut

# Production + sales readiness polish (2026-09-28) — Henry: "make sure we are ready when we flip the switch"
- [x] Crawl the LIVE site: every internal link resolves, no console errors, no holiday brand residue, titles/OG sane
- [x] Phone walkthrough of the parent path (landing → finder → builder → send sheet) on live, funnel beacons blocked
- [x] Page weight / speed of the builder on a phone
- [x] Checkout path LOCALLY with the switch on in-memory (proof sheet → approve), no Stripe call
- [x] Admin dashboard pages load (live, signed out = login page only)
- [x] Fix what's small; list what's Henry's; update checkout-launch-checklist.md
- [x] Full tests, tsc, lint, build; ONE push
