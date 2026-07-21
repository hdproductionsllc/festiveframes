# School Builder — Review Pass & Renewed Plan (2026-07-20)

Review after autonomously completing the buildable stages. Full plan history in
`school-multicell-todo.md`.

## Health check (whole system)

| Check | Result |
|---|---|
| Test suite | **179 pass** (0 fail) across 11 files — was 24 at Stage 0 |
| `tsc --noEmit` | clean |
| `eslint src` | **0 errors**, 18 warnings (16 pre-existing in /build components; the FrameCanvas `bottomBar` one predates this work) |
| `/build` regression | **pixel-intact** — verified by screenshot after all 8 stages |
| School builder | renders; panels, crop modal, resize logic, phrases, fonts all verified |

The one hard invariant — `/build` byte-identical — held through 8 stages of deep
changes to shared code (FrameCanvas, DndProvider, RailSlot, design-store, snappet,
parts-list). That is the headline result.

## What's DONE (the builder, verified)

- **0** grid coordinate layer + gapless width fix
- **1** wing trim to 1 col + store v7 migration (+ caught a returning-user data-loss bug)
- **2** span data model + `snappet.ts` expander
- **3** multi-cell rendering (+ overhang containment, suppressed-zone coverage fix)
- **4** multi-cell drag/drop + preview
- **4.5** panels as grid rectangles (fixed the half-filled-panel mislabel)
- **5** span-aware parts list (a 2×4 is one physical part; jig planner guards multi-cell)
- **8** resize handles + `suggestSnappetSize` algorithm
- **9** templated current-year phrase library + collegiate font curation (killed stale 2026)
- **7** print-res upload: crop/reposition/zoom UI + resolution gate (BLOCKS on red) +
  IndexedDB split storage (fixed the localStorage-overflow root cause)

## Areas for improvement found in the review

### Cleanup (safe, small, do anytime)
1. **`alternateSlots` is still span-blind** (`design-store.ts:746`) — checkerboards via
   `i % 2` over a flat cross-zone id list; never produced a real checkerboard even before
   this work. A `(row+col)%2` over the grid fixes it. Latent, low-stakes, never assigned
   a stage.
2. **Dead code: `computePricing` + `PricingBreakdown`** — imported only by each other,
   mounted nowhere. Leftover from a per-tile-set pricing model the flat per-frame model
   replaced. Delete candidate (confirm it isn't staged for something).
3. **1 lint warning in a touched file** — `FrameCanvas` `bottomBar` destructured-but-unused;
   pre-existing (present before Stage 4.5). Trivial.

### Real gaps (need a decision or a service — NOT autonomously buildable)
4. **Snappet vs section-image fork.** Uploaded art currently flows to the whole-panel
   `setSectionImage` path; the content-first flow (suggestion → placed sized snappet)
   assumes the snappet path. These two systems need reconciling — a design decision. The
   `suggestSnappetSize` algorithm is built and tested but deliberately NOT wired to upload
   until this is settled.
5. **School identity input fields.** Phrases template `[MASCOT]`/`{year}` as editable
   placeholders today. Foundry's cleaner model is school-name/mascot/year FIELDS that fill
   phrases automatically. Deferred from Stage 9 as a v2 UX.

## The remaining layer: PRODUCTION / COMMERCE (deliberately not autonomously built)

Stage 6 and the server halves of Stage 7 were NOT built autonomously, on purpose. Reasons,
stated plainly:

- **They touch the money flow you parked.** Stage 6's core is making `compose-frame.ts`
  params-in + span-aware — but that function renders the **live /build checkout proof**.
  Refactoring live-revenue code autonomously, while you've parked the money flow, is the
  wrong call. It wants your go-ahead + careful checkout-adjacent review.
- **They need services you haven't wired.** Full-res server upload + CDN; content
  moderation (a vision API). Stage 7 left an HONEST integration point
  (`image-moderation.ts` returns `unmoderated`, never fakes an approval) rather than a
  stub — that's the seam, not the feature.
- **They need the school order path, which doesn't exist.** `buildPartsList` is called only
  from /build; the school builder has no export/order flow. Panel-grouped parts + the
  full-frame eufy print file only matter once school can take an order.

### Remaining work, honestly scoped

| Item | Needs |
|---|---|
| `compose-frame` params-in + span-aware + text-bar wing/bottom-row bug | your go-ahead (touches live checkout); careful review |
| Full-frame eufyMake print renderer (assembled frame, 1 pass, rotated to bed) | the above + the parked print/fulfillment path |
| Panel-grouped parts list | the school order path to exist first |
| School export/order flow | money flow unparked |
| Full-res server upload + CDN | a storage service |
| Content moderation | a vision moderation API (integration point ready) |
| Snappet-vs-section-image reconciliation (gap #4) | your design decision |
| School identity input fields (gap #5) | product decision (v2 UX) |
| Spirit-art library | art sourced/drawn to `school-spirit-ideogram-brief.md` |

## Recommended next decisions (in order)

1. **Snappet vs section-image** (gap #4) — unblocks wiring the suggestion algorithm and
   settles how customer art is placed. Cheapest high-leverage decision.
2. **Unpark the money flow?** — gates the entire Stage 6 / order / export chain. Until then
   the builder is a complete design tool that can't take an order.
3. **Art sourcing** — free CC0 vector (recolors to exact school colors) per the brief; this
   can proceed in parallel with everything, by a human.
