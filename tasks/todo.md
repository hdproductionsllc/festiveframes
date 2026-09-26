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
