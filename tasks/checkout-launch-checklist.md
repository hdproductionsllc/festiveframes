# MySchoolFrame — checkout launch checklist

Written 2026-09-25. Supersedes the checkout parts of `tasks/launch-sequence.md`
(2026-08-20, which still names a $49 price).

**Where things stand:** the product is still in development (Henry, 2026-09-25).
Nothing below gets switched on or tested live until Henry says go. School checkout is
OFF (`SCHOOL_CHECKOUT_OPEN = false` in `src/config/school-checkout.ts`); parents can
design and **Send**, and every sent design is saved with a code and a link.

Already built and tested (so it is NOT on this list): saved designs and links,
photos surviving on another device, "saved but not delivered" with Try again, the
proof sheet + recorded approval, orders tied to an approved and unchangeable design
version, crash-safe sending with no double emails, and held orders for anything
unapproved or altered. See `CLAUDE.md` → "Saved school designs".

---

## A. Build before launch (Claude does these; each is a normal code change)

- [x] **Fundraiser totals survive refunds in any order.** DONE 2026-09-26: one order
      record is the ledger; refunds mark the order, which exists before Stripe says
      anything. See the staff dashboard's Schools page.
      (Original note:) Today a refund that
      arrives before its purchase record leaves no mark, and the later purchase
      credits the school anyway (Stripe does not promise event order). Record the
      refund regardless, retry failed ledger writes, and add a check that compares
      the ledger with Stripe. (Review 2026-09-25, #7.)
- [x] **A way back for a parent who lost their link.** DONE 2026-09-26: staff
      dashboard → the design → "Issue a new link".
      (Original note:) A staff-only tool: look up
      by design code + the parent's email, issue a fresh link (the old one stops
      working), Bill sends it by hand. A code alone must never open a design.
      (Review #8.)
- [x] **Switch off the old Festive Frames checkout** — DONE 2026-09-26 (`HOLIDAY_SHOP_OPEN`). — the shop is defunct but its
      checkout may still take money for a frame nobody makes. Check first, then
      turn it off.
- [x] **Fix the site address setting on Railway** — DONE 2026-09-26. (`SITE_URL` is still
      `https://www.festiveframes.co`). Parent links already avoid it, but other
      pages (e.g. the post-checkout thank-you page) still use it.

## B. Henry's decisions (nothing to build until these are made)

- [ ] **Price and donation** are confirmed ($24.95, $5 to the school) — re-confirm
      nothing has changed. `src/config/offers.test.ts` fails on purpose when the
      checkout switch flips, so the decision gets written down, not slipped in.
- [ ] **Parent confirmation email**: a paid order currently emails the parent a
      receipt (Bill on bcc). The pilot brief said "never to a parent". Keep the
      receipt, or rely on Stripe's own? (CLAUDE.md → "MySchoolFrame mail
      identity" has the one-line change either way.)
- [ ] **Ten minutes with a lawyer** on the terms, the warranty and the photo-rights
      wording before real money moves (flagged in CLAUDE.md since 2026-09-13).
- [ ] **Which schools are "verified"**: each needs confirmed colours AND written
      permission to use the school's name and marks. All are `demo` today.

## C. Settings on launch day (in this order)

0. [ ] Railway → Variables: `ADMIN_EMAILS = <Henry's address>,bill@myschoolframe.com`
       (who can sign in to /admin — can be set any time, it is not a launch switch).
1. [ ] Railway → Variables: `MSF_EMAIL_FROM = MySchoolFrame <orders@myschoolframe.com>`
       (turns on the "Email me a link" box; moves all school mail to that sender —
       the domain is already verified in Resend).
2. [ ] Stripe dashboard → the webhook endpoint listens for `checkout.session.completed`
       AND `charge.refunded`.
3. [ ] Flip `SCHOOL_CHECKOUT_OPEN` to `true` (one-line code change + push; update
       `offers.test.ts` in the same change).

## D. The launch test (right after C, before telling anyone)

Real, live, with a 100%-off coupon — never Stripe test mode.

1. [ ] **Send** a design to your own email with "Email me a link" ticked → Bill's
       email arrives naming the code and version; your link email arrives from
       orders@myschoolframe.com.
2. [ ] Open that link on a **different phone** → same frame; a photo you uploaded is
       still sharp in the print.
3. [ ] **Buy** → the proof sheet shows every word correctly → Approve and pay →
       Stripe with the coupon.
4. [ ] Bill's production email arrives once, saying "$0 COUPON ORDER" and
       "Proof approved: MSF-… revision N".
5. [ ] The school's fundraiser total does NOT go up (a $0 order credits nothing).
6. [ ] Refund a small real order (or skip until one exists) → it comes off the
       school's total.

If any step surprises you, stop: checkout goes back off with the same one-line change.
