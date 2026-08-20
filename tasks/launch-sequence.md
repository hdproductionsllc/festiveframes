# Launch sequence — MySchoolFrame (2026-08-20)

Written the morning of the Bill working session. Everything here is measured from
source, not transcribed. Two companion docs were published as artifacts:
readiness brief, geometry worksheet, SLUH pilot plan.

## The state, in one paragraph

The software loop closes and is covered by 1,127 passing tests. The physical loop
has never closed for the school product — nothing newer than the July 4 builder has
completed design → physical part. The live school builder exports panels on a
0.991" pitch; Bill's system is a flat 1.000" grid. The corrected configs exist,
tested, and are NOT wired. Checkout is wired, tested, and deliberately parked
pending owner pricing confirmation.

## The measured gap (recomputed 2026-08-20, `panelSizeInches`)

| Part | Bill's real part | LIVE `SCHOOL_FRAME_CONFIG` | `SCHOOL_JULY_FULL_FRAME_CONFIG` |
|---|---|---|---|
| Side ×2 | 2.000 × 8.000 | 1.982 × 8.919 | 2.000 × 8.000 ✅ |
| Top runner | 11.000 × 1.000 | 11.892 × 0.991 | 11.000 × 1.000 ✅ |
| Bottom runner | 11.000 × 2.000 | 11.892 × 1.982 | 11.000 × 2.000 ✅ |
| Overall | 15.000 × 8.000 | 15.856 × 8.919 | 15.000 × 8.000 ✅ |

**Bill's part breakdown already matches our panel model.** Sides run full height and
own the corners; runners fit between (2 + 11 + 2 = 15; 1 + 5 + 2 = 8). The structure
is right — only the pitch is wrong.

## Two things settled today that were open questions

- **Overspray bleed is already ZERO** (`SCHOOL_PANEL_BLEED_INCHES = 0`, with the
  rationale in compose-school-frame.ts). Sheet size == part size. The old 0.04"/side
  landed as a *different percentage on every panel* (7.4% on the top strip's height,
  3.9% across a side, <1% along its length) — an independent second cause of
  hand-correction on import, now gone.
- **The flat inch is pixel-exact at 300 DPI; 0.991" can never be.** Aspect-ratio
  error measured: 0.0000% on the 1.000" grid (top runner = exactly 3300 × 300 px),
  up to 0.1122% on 0.991" (297.3 px/tile always rounds). Not the cause of the
  stretch — ~0.001", inside Bill's ±0.015" — but it is why only the flat inch
  delivers output exactly to geometry in aspect ratio.

## THE ARCHITECTURAL FINDING — clip pitch vs part extent

Owner intuition, confirmed in code: **we are using tiles as the base dimension for
elements that have no reason to be tile multiples.**

`gridInvariantHolds` (slot-generator.ts) requires:

```
widthInches  === tileSizeInches * topSlots
heightInches === tileSizeInches * (leftSlots + 2)
```

So every panel edge is forced to an integer multiple of the pitch. The ONLY escape
hatch is the keystone `riseInches`, which is arbitrary and grows upward into the
plate opening.

Consequence: **a 1.4" bottom bar is inexpressible today.** It would force the side
panels to 1.0 + 5.0 + 1.4 = 7.4" tall — not an integer tile count — and the rails
would drift, making every (row, col) a lie.

The redesign: separate the two numbers that are currently welded together.

- **Clip pitch** — stud centre to stud centre. An *addressing* number. Decides where
  a snappet can clip, nothing else.
- **Part extent** — the outside dimensions of each printed sheet. A *physical*
  number with no reason to be a multiple of the pitch.

A bar can be 1.4" tall and still offer clip positions every 1.000".

**Do NOT start this until Bill's numbers are in hand** — the whole point is to encode
his real extents, not to guess new ones. Touches the geometry spine: `FrameConfig`,
`panelGeometry`/`panelSizeInches` (panels.ts), `gridInvariantHolds`/`generateSlots`
(slot-generator.ts), `panelBleedBox` (compose-school-frame.ts), and every config.
Budget a careful day with the test suite as the harness, not an afternoon.

## Sequence

### 1. Bill session — geometry (TODAY)
- [ ] Fill in the geometry worksheet: finished tile dim excluding overspray, clip
      pitch, tile gap, whether ±0.015" is per-dimension or cumulative
- [ ] Final bottom-bar height, full width — **flag it if it is not a pitch multiple,
      do not round it**
- [ ] Material below the plate's bottom edge (the binding car-fit constraint)
- [ ] Confirm side-panel height = top runner + window + bottom bar
- [ ] All four part extents, outside dimensions
- [ ] Does eufyMake place our 300 DPI PNG at true size, or scale it?
- [ ] Agree out loud: **nothing is ever stretched in eufyMake**
- [ ] Commit to a target frame height (8.0" failed the Pilot; 7.0" July is the only
      height proven on a car; live builder is 8.919")
- [ ] Get cost per 4-panel set — material + machine time

### 2. Test print — the flip gate
- [ ] Bill prints ONE top runner from the corrected geometry (11.000 × 1.000),
      unstretched
- [ ] If it seats: point `SCHOOL_FRAME_CONFIG` / `SCHOOL_SLIM_FRAME_CONFIG` at the
      July configs. Preset stacks become [2,2,2,2] (8-row) and [2,3,2] (7);
      `dropRelocatedSlots` already handles saved designs; `/build`'s
      `DEFAULT_FRAME_CONFIG` stays at 0.991 (its per-tile product is verified as-is)

### 3. Extent/pitch separation — only after step 1
- [ ] Encode Bill's real part extents; decouple extent from clip pitch

### 4. Owner decisions
- [ ] Confirm $49 frame / $10 donation (`src/config/offers.ts`). Checkout is now
      gated by ONE named constant, `SCHOOL_CHECKOUT_OPEN`, which lives next to the
      placeholder prices it locks. Flipping it to `true` is the entire change —
      `SchoolDesigner` derives the header from it (Buy appears, Send steps back to
      secondary). `src/config/offers.test.ts` is a deliberate tripwire that fails
      when it is flipped, so the decision has to be recorded, not slipped in.
      **Owner instruction 2026-08-20: stays parked until the pricing is right.**

### 5. Samples — after the test print, not before
- [ ] One SLUH set, assembled on a real Missouri plate
- [ ] One generic unbranded set (the door-opener for schools 2 and 3)
- [ ] **BLOCKER:** SLUH crest renders at 174 DPI (249px at 1.427" in the bottom
      banner) — under the 300 DPI gate. Need ≥429px, ideally the vector original
      from SLUH communications. The Billiken is fine at 343 DPI.

### 6. Site live and shareable
- [ ] Register the Stripe webhook endpoint in production
- [ ] Verify the sending domain in Resend (without it, live order email lands in spam
      — fails silently, looks exactly like nobody ordering)
- [ ] Build the short-code redeem page (the QR works; the typed code has no page)
- [ ] Written permission + confirmed colours → flip a kit to `status: "verified"`
      (one-line edit; makes the page public and indexable)

### 7. Housekeeping
- [x] **DONE 2026-08-20.** The two failing tests are fixed at the root, not by
      loosening them. Neither failure was the defect it guarded:
      - `banner-tile-shade` built its bar with `text: ""`, which is FALSY, so
        `drawSchoolFrame` substituted **"YOUR TEXT HERE"** and the single sampled
        pixel sat in a placeholder glyph's drop shadow. Font fallback moves those
        glyphs, so it was exact on Linux and a unit out on Windows. The bar now
        carries a space (truthy ⇒ no placeholder, nothing drawn) and the face is
        measured as a MODE over an inset grid, not one pixel.
      - the keystone-join test compared its run to a reference sampled 60px deeper
        into the bar — far enough down the bevel's faint ramp to round a unit low.
        The run itself is perfectly uniform at the declared colour. It now asserts
        uniformity (which IS "nothing crosses the join") and compares to the body
        with a ±1 tolerance.
      Shared helper: `src/lib/utils/__testing__/field-sample.ts`.
      Suite: **1132 passing**, tsc clean, production build clean.

- [ ] **Open question found while doing the above.** The print renderer falls back
      to "YOUR TEXT HERE" for empty banner text
      (`compose-school-frame.ts:432`, and `compose-frame.ts:86` on /build). Clearing
      a design refills the banners (design-store.ts), so the path may be unreachable
      — but a parent who deletes every character in the text field has not been
      driven in a browser. Worth 10 minutes before checkout opens: a printed frame
      reading YOUR TEXT HERE is unrecoverable.

- [ ] Pre-existing lint warning, untouched: unused `g` in a destructure at
      `compose-school-frame.test.ts:599`.

## Decisions made 2026-08-20

- Pilot school: **SLUH** — the only kit whose colours were measured from
  owner-supplied official logo files (`#183B67` sampled from the lockup), not guessed
- Samples: **one branded SLUH set + one generic set**
- Timeline: Bill today; school meeting not yet booked
