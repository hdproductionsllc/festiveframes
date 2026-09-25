# Saved school designs + recorded proof approval — architecture

Status: PROPOSED (2026-09-25). Nothing built yet. Both open decisions settled by Henry 2026-09-25.

## The problem, in one paragraph

A MySchoolFrame design lives in exactly one place: the parent's browser
(`localStorage`, key `festive-frames-school-v1:<variant>:<slug>`). "Send design"
(`/api/school/submit`) emails Bill a PNG and a parts list and **keeps nothing**, so
neither the parent nor Bill can reopen the design they're discussing. "Buy"
(`handleBuy` → `/api/order/draft` → `/api/checkout` → webhook → `fulfillOrder`)
stores the rendered files in `order_drafts`, which is **swept after 24 hours** if
unpaid, and sends production files the moment payment clears. The parent never
approves a proof, and nothing records one. Yet the site already promises both:

- `NOTHING_PRINTS_UNTIL_YES`: "Nothing prints until you've seen it and said yes."
- Terms: a warranty remake if the frame "isn't the design you approved".

Without a record of what was approved, we can't show that we kept either promise.

## The redesign: one object, the Submission, with frozen revisions

If "saved, reopenable, approvable" had been in place from the start, Send and Buy
wouldn't be two different pipelines. They'd be two actions on the same thing:

```
school_designs      one row per design: the thing a link points at
  id               uuid — the short code (MSF-7K3Q) is DERIVED from it, never stored
  edit_token_hash  sha256 of the secret in the parent's link (raw token never stored)
  school_slug      attribution — the same tag Stripe metadata carries today
  contact          email / phone / who it's for (from the send sheet)
  created_at, updated_at

school_design_revisions   IMMUTABLE. A new revision on every Send or Buy.
  id, design_id, n  (1, 2, 3 …)
  design           jsonb — the full editable builder state (schoolDesignOf)
  parts            jsonb — coerced parts list (same coercion submit does today)
  proof_sha256     hash of the assembled print-path render
  panel_sha256s    hashes of each print panel
  artwork_rights   the attestation + UPLOAD_RIGHTS_VERSION at the time
  variant          SCHOOL_SHIPPING_VARIANT at the time (geometry the files were drawn on)
  created_by       'parent' | 'team'
  created_at
  -- the "yes". Null until approved; set ONCE, never cleared (the only write
  -- a revision ever takes). An approval belongs to exactly one revision, so it
  -- is columns on that revision, not a table of its own.
  approved_at, approval_wording_version, approver_ip, approver_user_agent

school_artifacts    content-addressed image store
  sha256 PK, mime, bytes (bytea), created_at
```

Three tables. An earlier draft had a separate `proof_approvals` table and a stored
`code` column; both were removed. An approval can't exist without its revision, and
a code derived from the id can never disagree with it.

Why each piece is shaped this way:

- **Revisions are never edited.** Bill's email says "revision 3" and always means
  the same pixels. An edit creates revision 4. That's what makes an approval
  mean something: it points at something that can't change afterward.
- **The approval binds to a hash, not an id.** Fulfillment re-hashes the files it's
  about to send and refuses on mismatch. "What was approved is what printed" is
  then enforced by the system, not assumed.
- **Images live in their own content-addressed table** (bytea, keyed by sha256),
  not as base64 inside jsonb like `order_drafts` does. Identical panels across
  revisions are stored once, and moving to object storage later changes one module
  (`lib/school-designs/artifact-store.ts`) and nothing else.
- **The link carries a secret; the database holds only its hash.** A leaked database
  row can't be turned into a working link. The short `code` is for people to say
  aloud. It never unlocks anything alone.
- **No 24-hour sweep.** These rows back a one-year warranty. Retention = 18 months
  after the last revision, stated on the privacy page (Henry, 2026-09-25).

## Alternatives weighed (no accounts in any of them)

- **Put the whole design in the URL, store nothing.** Rejected: uploaded photos
  make links megabytes long, and an approval has to be recorded somewhere we hold.
- **Store only the design; have the server re-render the print files.** Looks more
  elegant (files are "derived"), but it is the wrong model for an approval. The
  renderers change often, and a re-render after a code change would print pixels
  the parent never saw. The approved pixels ARE the record, so we keep them.
- **One unguessable id as both name and key** (how the holiday `saved_designs`
  works). Rejected: the id travels to Bill's inbox, Stripe metadata and logs. Keeping
  the name (id/code) separate from the key (token) means seeing an order never
  grants the power to edit it.
- **Reuse the holiday `saved_designs` table.** Rejected: it has no versions and no
  approval, and it mixes the two brands' customer records.

## The three flows

### 1. Send (no payment) — "save it and get a person to look"

1. The parent taps Send. The sheet collects contact (same as today).
2. The client renders the proof and panels (same composers as today) and POSTs to
   `POST /api/school/designs` (new design) or `…/designs/:id/revisions` (a
   design reopened from its link). The server coerces, hashes, stores and
   **then** emails Bill: code, revision number, proof, panels, and a team link.
3. The parent sees a "Your design is saved" screen showing the code and the link
   (copy, share, "text it to me" via the phone's share sheet). The link is
   `/s/<slug>?d=<token>`.
4. **Store first, email second.** If email fails, the design is still saved and the
   response says so honestly. That's the same rule as commit 2e895d3 ("orders can
   no longer be lost to a silent email failure"), applied to sends.

**Decided (Henry, 2026-09-25):** the link is always shown on screen with
copy/share. Henry reports Resend is now set up for myschoolframe.com, so Phase 1
also adds an **"Email me a link to this design"** checkbox on the send sheet
(ticked by default; the parent already typed the address for this purpose). Rules:
- A SEPARATE email from Bill's production email: link + code + thumbnail only, no
  print files. The production email's rule (a parent's address is never a
  recipient) is unchanged and its field-by-field test stays.
- Sent only to the address typed in that request, only when ticked, behind the
  proxy rate limit. Never re-sent, never used for marketing.
- Precondition: `MSF_EMAIL_FROM` set on Railway (e.g.
  `MySchoolFrame <orders@myschoolframe.com>`). While unset, the box is hidden. The
  local key is send-only, so domain status can't be checked from here; confirm
  "Verified" in the Resend dashboard, because a sender on an unverified domain fails every
  school email.

### 2. Reopen — "the link works on any phone"

- `/s/<slug>?d=<token>` → `GET /api/school/designs/by-token` → latest revision →
  `loadDesign`. This is the same hydrate path as a restore, so `merge` repairs
  (`squareUpSlots`, `dropRelocatedSlots`) still apply to old revisions.
- If this browser already has a *different* local design, ask: "Open the saved
  design (your current one will be replaced)?" Never overwrite silently.
- The artwork attestation does NOT come with it (`LoadableDesign` already excludes
  it, deliberately). The existing `artworkRightsSettled` second door re-asks the
  person holding the phone. That's correct and needs no change.
- If the revision's `variant` ≠ the current shipping variant, the builder shows
  it on the current frame and says so. The old revision's files are untouched.

### 3. Buy — proof approval becomes a real step

```
Buy ─► save revision ─► PROOF SHEET ─► approve ─► checkout ─► webhook ─► fulfill
                         (print-path     (POST        (Stripe      (loads revision,
                          render, not    approval)     metadata:    verifies approval
                          the screen)                  revisionId,  + hashes, THEN
                                                       proofSha)    sends files)
```

- **The proof sheet shows the PRINT render** (`composeSchoolFrame` output, which
  is the same image Bill gets), not the on-screen builder. CLAUDE.md is blunt
  that the two renderers drift; approval has to be of the file that prints.
- Under the image: every piece of **lettering listed as plain text** ("Top: LADUE
  RAMS / Bottom: CLASS OF 2027 · EMMA MILLER") with "Check every letter —
  names print exactly as typed." Spelling is the most expensive mistake on a
  printed part, and plain text is easier to proofread than lettering on a frame.
- One button: "Approve and pay." It records the approval, then starts checkout.
  The wording is versioned like `UPLOAD_RIGHTS_VERSION`, so we know what words
  were agreed to.
- **Fulfillment refuses without it.** In `fulfillOrder`'s school branch: load the
  revision by `metadata.revisionId`, require an approval row, re-hash the panels,
  and require `proof_sha256` to match. On any failure, **hold the order**: payment
  is kept, no production files are sent, and the MSF inbox gets the failure alert
  ("Paid, proof not approved — do not print"). The production email gains a line:
  "Proof approved 2026-10-02 14:31 by e…@… (rev 3, sha 9f2c…)."
- `order_drafts` is no longer used for school orders. The holiday builder stays
  unchanged.

### Bonus that falls out for free: team edits

Because Bill's email links to the same design, Bill can fix a typo, which saves
revision N+1 (`created_by: team`). The parent gets the link, sees the proof sheet,
and approves. That is "nothing prints until you've said yes" as a flow the system
enforces. It needs a staff check on the team link (a signed staff token in Bill's
email is enough for the pilot; no login system). **Phase 3, not required first.**

## Trust and abuse (same boundaries as today, plus)

- All new POST routes go in `src/proxy.ts` (rate limit + body cap), like `submit`.
- The client still renders the PNGs, so a hostile client can upload any image. The
  approval binds to *that* image's hash, so the worst case is someone approving
  their own junk. The server-side square rule and parts-list coercion stay.
- Token: 32 random bytes, base64url. Lookup by `sha256(token)`. Tokens never
  appear in logs, Stripe metadata or analytics.
- Memory fallback when `DATABASE_URL` is unset, with the `__mem…ForTest` seam, the
  same pattern as `school-ledger.ts`.

## Build order (each phase ships alone, one push per phase)

**Phase 1 — Saved, reopenable sends** — DONE 2026-09-25
- [x] `lib/school-designs/` store: tables, artifact store, memory fallback, tests
- [x] Saving lives in `/api/school/submit` itself (changed from the plan: a second
      route would have duplicated its validation for no gain; it now saves, then emails)
- [x] Link is `/s/<slug>#d=<token>` (fragment, not `?d=`: never reaches a server
      log) → POST `/api/school/designs/open`; overwrite prompt on a device with a design
- [x] "Saved" banner: code, link, Copy/Share; Bill's email gains code + revision
- [x] "Email me a link" checkbox + link email (hidden while `MSF_EMAIL_FROM` unset)
- [x] Privacy page: what's stored and for how long
- [x] Verified in Edge: desktop send → fresh phone-sized profile opens the same
      frame (name included) → resend from phone = same code, version 2; a device
      holding a design is asked first; a made-up link fails politely
- Found on the way: production `SITE_URL` is still the holiday domain, so parent
  links are built on MySchoolFrame's own origin instead (tested).

**Phase 2 — Recorded proof approval** (fixes the payment gap). Must land BEFORE
`SCHOOL_CHECKOUT_OPEN` flips; it's harmless to build now since checkout is parked.
- [ ] Proof sheet (print render + lettering read-back), versioned wording
- [ ] approval columns + approve route; checkout requires an approved revision
- [ ] `fulfillOrder` school gate: approval + hash match or hold + alert
- [ ] Tests: paid+approved → sends; paid+unapproved → held; tampered panel → held;
      100%-off (`no_payment_required`) path behaves the same
- [ ] Owner's end-to-end test payment (100%-off coupon, live) exercises it

**Phase 3 — Team edits + parent re-approval** (optional, after the pilot talks)

## What this deliberately does NOT do

- No accounts or passwords. A link is the right weight for a $24.95 purchase
  made from the bleachers.
- No server-side re-rendering. Node rendering works (the test harness proves it),
  but moving production rendering to the server is a separate, bigger decision.
  Hash-binding gets the same guarantee today.
- No change to the holiday builder's `saved_designs` / `order_drafts`.
