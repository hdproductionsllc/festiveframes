# MySchoolFrame: how an order works, end to end

Written 2026-10-24 for launch. Plain-language map of what a parent does, what they
receive, what we receive, where it is stored, and how staff test it live. The
code-level detail lives in CLAUDE.md ("Saved school designs", "One order record").

---

## 1. How a parent gets to their school

| What the school is handed | Where it goes | What it does |
|---|---|---|
| **Link** `www.myschoolframe.com/s/<school>` | the school's builder | for newsletters, texts, websites |
| **QR code** `www.myschoolframe.com/q/<school>/<placement>` | counts the scan, then opens the builder | for printed things; "placement" names where it was printed (card, bleachers, newsletter) so each one is counted separately |

**Getting them:** staff dashboard → **Schools**. Every school row shows its link, what
its QR code carries, and **SVG** (for a printer or designer) / **PNG** (for email or a
quick flyer) downloads. Type a placement in the box ("bleachers") and press
*Make codes* to get codes for that placement. The designed, branded cards are still made by
`node scripts/pilot-qr.mjs` (writes to `MySchoolFrame Pilot Kit\qr-tracked`).

QR codes always carry the real `www.myschoolframe.com` address, even when made on a
laptop (a test proves the PNG scans to it). Scans show on **Funnel**.

## 2. What the parent does

1. Opens their school's builder (no sign-up, no password).
2. Designs the frame. It is kept in **their browser** as they work.
3. Either:
   - **Send my design.** Saves it on our server with a code (`MSF-XXXX-XXXX`) and a
     private link. Bill gets it, and the parent can tick "Email me a link".
   - **Buy** (once checkout is open). Saves it → **proof sheet** (the exact print
     picture and every word of lettering) → parent approves → optional gift to the
     school → Stripe checkout.

## 3. Do customers have accounts?

**No, on purpose.** There is no login for parents. They get back to a design with:
- the **private link** (in the "Email me a link" email, or remembered by their browser), or
- **staff** reissuing a link: dashboard → Sent designs → the design → *Issue a new link*
  (the old link stops working; send the new one by hand).

Behind the scenes we keep a **customer** record (created only once someone has paid,
keyed by the email Stripe proved) and a **student** record (name, school, class year,
from the builder). A "My Students" page with email sign-in is a planned later step.

## 4. Every email, who gets it

Rendered from the real code, nothing sent:
`MySchoolFrame Pilot Kit\email-previews\marquette\index.html` (and `\ladue\`).

| When | Parent gets | We get (bill@myschoolframe.com) |
|---|---|---|
| Parent taps **Send** | "Your MySchoolFrame design (MSF-…)": link + code (only if they ticked the box) | the design, the print files, their contact, the code + version |
| **Paid order** | "Your MySchoolFrame order is confirmed": frame picture, total, ship-to, gift thank-you, warranty | **PRODUCTION** email: paid banner with the school's $5 + gift, proof-approval record, parts list, lettering, address, print files |
| **$0 coupon order** | the same receipt, $0.00 | **PRODUCTION ($0 COUPON)**, and the school is credited **nothing** |
| Something is wrong (unapproved proof, altered file, refunded before production) | nothing | "ORDER PAID but fulfillment FAILED", and the order is **HELD** in the dashboard |
| Parent asks for a school we don't have | nothing | "SCHOOL REQUESTED" |
| Staff sign-in | n/a | a one-time sign-in link |

Rules the tests enforce: a parent only ever sees @myschoolframe.com addresses; the team
gets a **blind** copy of every email a parent gets; a parent's typed address is never
a recipient of anything except their own link email.

To re-render after an email change:
```
EMAIL_PREVIEW_OUT=<folder> EMAIL_PREVIEW_SCHOOL=marquette-mustangs EMAIL_PREVIEW_PROOF=<frame.png> \
  npx vitest run src/lib/email-previews.preview.test.ts
```
(the frame picture comes from `KIT_SAMPLE_OUT=<frame.png> KIT_SAMPLE_SLUG=<school> npx vitest run src/lib/utils/kit-sample.test.ts`).

## 5. Where things are stored (Postgres on Railway)

| Table | What it holds |
|---|---|
| `school_designs` | one row per sent design: school, code, the link's lock (only a scrambled copy of the key) |
| `school_design_revisions` | every saved version, **never changed after saving**; the proof approval is written once |
| `school_artifacts` | the print files and uploaded photos, stored once each |
| `school_orders` | every order, **and** the fundraiser ledger: price, the school's $5, the gift, paid/refunded/held/sent |
| `customers` / `students` | who paid / who the frame celebrates |
| `events` | the funnel: scans, opens, sends, checkouts, paid |
| `school_requests`, `school_brand_cache`, `admin_tokens` | requests, scanned colours, staff sessions |

Stripe holds the payment and the shipping address; the order row ties to it by the
Checkout session.

## 6. Live testing: staff-only Buy

While `SCHOOL_CHECKOUT_OPEN` is off, **Buy appears only for someone signed in to
/admin**, and says **"(staff test)"**. Parents still see only *Send my design*, and the
server refuses their checkout. It is real, live Stripe. One function
(`lib/school-checkout-access.ts`) decides this for both the button and the server.

**To run the test:** sign in at `www.myschoolframe.com/admin` → open
`www.myschoolframe.com/s/marquette-mustangs` in the same browser → design → *Buy (staff
test)* → approve the proof → **No thanks** on the gift → enter the internal code at
Stripe. Then follow `tasks/checkout-launch-checklist.md` section D.

## 7. The internal $0 code, and why it can't leak to Still Beside Me

The Stripe account is shared with Still Beside Me. So MySchoolFrame sells the frame and
shipping as two **fixed Stripe products** with our own ids, `msf_frame` and
`msf_shipping` (`schoolStripeProducts` in `src/config/offers.ts`). Every MySchoolFrame
coupon is limited to those two products, which means:
- it zeroes a MySchoolFrame frame + shipping and **does nothing anywhere else** on the account;
- it never touches a parent's **gift** line, so the school always gets the gift.

**Rule for any future code:** in Stripe → Coupons, always choose *Apply to specific
products* → `msf_frame` (+ `msf_shipping` if it should cover shipping).

The two products must exist in Stripe **live** before the code that uses them goes
live (and in test mode too if checkout is ever tried locally on a test key).

Internal code: see `tasks/checkout-launch-checklist.md` → "Internal test code".
