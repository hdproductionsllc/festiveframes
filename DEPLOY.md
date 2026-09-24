# Deploy Runbook — Festive Frames

How Festive Frames ships to production, and what must be true before taking real orders.

## Hosting

- **Platform:** [Railway](https://railway.app). The app **auto-deploys from the `master` branch** — every push to `master` triggers a new build and release. There is no manual deploy step.
- **Domain:** `www.festiveframes.co`, fronted by **Cloudflare**. The apex (`festiveframes.co`) **301-redirects to `www`** via a Cloudflare rule. Always link to the `www` host.
- **Build gate:** GitHub Actions (`.github/workflows/ci.yml`) runs `npm run lint` + `npm run build` on every push/PR. Railway does **not** run CI — green CI is a discipline, not an enforced gate, so don't merge red.

## Branch flow

```
feature branch                 master                 Railway
(e.g. launch/order-       →  (CI must pass)  →   auto-deploys to
 production-pipeline)         then merge           www.festiveframes.co
```

1. Do all work on a feature branch (e.g. `launch/order-production-pipeline`).
2. Open a PR into `master`. **CI must pass** (lint + build) before merging.
3. Merge to `master`. Railway picks up the push and deploys automatically.
4. Verify the live site after the Railway build goes green.

## Environment variables (set these in Railway → Variables)

Production needs the following. **Never commit real secret values** — set them only in Railway.

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret key — **use the live key** (`sk_live_…`) in production. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret (`whsec_…`) for the **live** webhook endpoint, taken from the Stripe Dashboard webhook pointed at `/api/stripe/webhook` and listening to `checkout.session.completed`. |
| `RESEND_API_KEY` | Resend API key used to send the customer confirmation and production emails. |
| `EMAIL_FROM` | Sender identity. Set to `Festive Frames <orders@festiveframes.co>` (domain must be verified in Resend). |
| `ADMIN_ORDER_EMAIL` | Inbox that receives the order-details / admin copy of each order. |
| `PRODUCTION_EMAILS` | Comma-separated list of founder inboxes that receive the production/fulfillment email. |
| `MSF_ORDER_EMAIL` | MySchoolFrame's inbox (comma-separated). Receives every school email: paid school orders, "send it to us" designs, "we don't have my school" requests, school failure alerts, and the bcc on a parent's confirmation. Defaults to `bill@myschoolframe.com` when unset. Replaces the retired `SCHOOL_ORDERS_EMAIL` / `SCHOOL_REQUEST_EMAIL` (delete those if set). |
| `MSF_EMAIL_FROM` | MySchoolFrame sender, e.g. `MySchoolFrame <orders@myschoolframe.com>`. **Leave unset until `myschoolframe.com` is verified in Resend**: unset, school mail is sent from `EMAIL_FROM`'s mailbox under the name "MySchoolFrame"; set before verification, every school email fails. |
| `SITE_URL` | Canonical base URL. Set to `https://www.festiveframes.co` (used for metadata, canonical URLs, and links in emails). |

### Future / optional

When we start hosting print-ready files ourselves, add Cloudflare R2 storage credentials: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`. Not required today.

## Go-live checklist

Complete every item **before** taking real orders:

- [ ] **Resend domain verified** — `festiveframes.co` shows verified in Resend so `orders@festiveframes.co` can send.
- [ ] **Stripe live mode** — `STRIPE_SECRET_KEY` is the live key, and a live webhook endpoint exists at `/api/stripe/webhook` listening to `checkout.session.completed`, with its signing secret in `STRIPE_WEBHOOK_SECRET`.
- [ ] **100%-off test coupon** — create a Stripe coupon/promotion code that zeroes the total. The custom-frame checkout already has `allow_promotion_codes: true`, so the code field appears at checkout.
- [ ] **End-to-end $0 order** — run a full order using the 100%-off coupon and confirm **both** emails arrive:
  - the **production email** to the founders (`PRODUCTION_EMAILS`), and
  - the **customer proof / confirmation email**.
- [ ] Only after the above pass cleanly, remove/disable the test coupon and open for real orders.

### MySchoolFrame, before any school mail goes out or `SCHOOL_CHECKOUT_OPEN` flips

- [ ] **`myschoolframe.com` verified in Resend, then `MSF_EMAIL_FROM` set** (e.g. `MySchoolFrame <orders@myschoolframe.com>`). Until then every school email, the parent's confirmation included, goes out From `MySchoolFrame <orders@festiveframes.co>` — the holiday domain in a header parents and Bill both see. Source tests cannot catch this; it is an env value.
- [ ] **Counsel reads `/school/terms`, `/school/privacy` and `/school/warranty`** (plain-language starting points, see `src/content/msf-pages.ts` and `upload-rights.ts`).
- [ ] **Decide the parent's receipt**: a paid school order emails a confirmation TO the parent (Bill on bcc). If the rule is "school mail never goes to a parent", that branch needs `skipCustomer` for brand `myschoolframe` and Stripe's own receipt does the job.
- [ ] School checkouts return to `/school/thanks` (MySchoolFrame chrome), not `/thanks`.

## Order → production fulfillment

Fulfillment (production + customer emails) fires from **two independent paths**, by design:

1. **Primary:** the thank-you page relay (`/thanks`, or `/school/thanks` for a MySchoolFrame order), triggered when the customer lands on the post-checkout thank-you page.
2. **Backup:** the Stripe webhook on `checkout.session.completed`, in case the customer never reaches `/thanks`.

Both paths are **idempotent** — a given order is only fulfilled once even if both fire. This redundancy is intentional: do not remove one assuming the other is enough.
