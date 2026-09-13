# Uploaded artwork: the rights attestation, the terms clause, the takedown door (2026-09-13)

**The problem.** A parent uploads their school's mascot or logo and we print it. Today
NOTHING anywhere says who holds those rights: no attestation at upload, no user-content
clause in the terms (the terms only claim OUR content is ours), and no address for a
school that objects. Every print-on-demand shop in this market (Zazzle, CustomInk,
CafePress) solves it the same way — the uploader warrants the rights, and the shop keeps
a takedown door open. That is what this builds.

**Owner's framing (2026-09-13):** "encourage students and parents to upload their own
graphics and say I have permission to use these (if they use mascots it's on them)".

**Honest limit, stated to the owner:** an attestation shifts responsibility to the
uploader and matches industry practice; it does not make us bulletproof. A school that
objects still writes to the company that printed the frame. That is why the takedown
path matters as much as the checkbox, and why this is worth ten minutes with a lawyer
before school checkout opens (`SCHOOL_CHECKOUT_OPEN` is still `false`).

## The design, from first principles

One statement of the rule, one place it is made, one record of it on the order.

- **ONE text, versioned** — `src/content/upload-rights.ts`. The gate, the terms page and
  the order record all read it. A version id (`UPLOAD_RIGHTS_VERSION`) rides on the
  record so a stored attestation says WHICH words were agreed to. The recurring defect
  in this codebase is a rule derived on one side and written longhand on the other;
  legal copy duplicated in three places is that defect wearing a suit.
- **ONE chokepoint** — `useSnappetUpload.begin()`. All three upload entry points
  (`UploadPhotoButton`, `SectionEditor` "Add art", `SchoolBrandImport`) already funnel
  through it, so the gate goes there and cannot be bypassed by a fourth caller.
- **The attestation attaches to the DESIGN, not the device.** One design becomes one
  order, so `artworkRights` lives in the design store, is persisted and partialized with
  the rest of the design, and rides into Stripe metadata at checkout. A device-wide
  "once ever" flag would put the acceptance on the wrong object entirely.
- **One extra tap, once per design.** Gate before the crop modal; after acceptance the
  crop modal carries a one-line reminder and no checkbox. This is a mobile-first
  product — a checkbox on every upload is friction we would be paying forever.

## Steps
- [x] 1. `src/content/upload-rights.ts` — canonical attestation text, version, takedown address
- [x] 2. `src/stores/design-store.ts` — `artworkRights` + `acceptArtworkRights()`, partialized, merge-guarded
- [x] 3. `src/components/designer/UploadRightsGate.tsx` — the sheet (portaled, mobile-sized)
- [x] 4. `useSnappetUpload` — gate inside `begin()`; `cropModal` → `uploadOverlays` (the name has to tell the truth)
- [x] 5. Three call sites renamed: `UploadPhotoButton`, `SectionEditor`, `SchoolBrandImport`
- [x] 6. Crop modal: one-line reminder under the confirm
- [x] 7. Checkout: `SchoolDesigner` sends `artworkRights`; `/api/checkout` carries it into Stripe metadata; production email says the customer attested
- [x] 8. Terms: a real "Your artwork and content" section — licence to produce, warranty, indemnity, our right to refuse, takedown
- [x] 9. Tests: gate blocks the first upload and not the second; store persists and survives a hydrate; checkout metadata carries the version; terms and gate read the SAME constant
- [x] 10. Verify: tsc, lint, 1841 tests, and a real browser render of the gate at 390px

## Found in verification (fixed)
- The crop modal's reminder was right-aligned and orphaned its last word onto a line
  of its own at phone width. Seen in the 390px render, not in any test.
- **`loadDesign` did not clear `artworkRights`.** The field's own comment says a
  restore asks again; zustand's `set` is a shallow merge, so the CURRENT visitor's
  acceptance survived onto a design they had never seen, and SchoolDesigner's second
  gate would have waved it through. Dormant today — only /build restores by token and
  /build has no upload path — and live the day the school builder gets the same
  save-design-by-email flow. Exactly the defect shape this repo has a lesson about:
  a comment that describes a guard is not a guard. Test pinned (proved failing first).

## Open for the owner
- **The takedown address.** The only support address in the code is
  `hello@festiveframes.co`, and that domain no longer resolves as a website (the mailbox
  may still work — unverified from here). The school product lives at myschoolframe.com.
  Henry decides whether takedown mail goes to the existing address or a new one; the code
  reads one constant either way.
- **Uploads must never feed the shared brand cache.** A parent's uploaded mascot stays on
  THEIR frame. The moment one parent's upload becomes artwork we serve to the next
  parent, it is our use of the mark and the attestation stops covering it. (Colours are
  different and already shared — a colour is not a mark.)

---

# NEXT, agreed 2026-09-13 — do not lose these

Owner said: "yes just dont forget to do the other steps later."

- [ ] **A. "Tell us your mascot" on thin pages.** The federal roster carries no mascot and
  this environment cannot fetch school sites, so the 29,467 thin kits say nothing. Store a
  parent's answer the way `school_brand_cache` stores a scan, with the same rule: it may
  fill a ROSTER school and may never touch an authored kit. This is the missing half of
  the brand scan — colours have a path, identity does not.
- [ ] **B. Colleges (IPEDS).** ~6,000 institutions in the federal postsecondary dataset,
  public domain, and `data/school-resolve.ts` was built so a second roster slots in beside
  the first. Note the sharper risk: college marks are licensed aggressively through
  agencies (CLC), so the upload-and-attest model above matters MORE there, not less.
- [ ] **C. The indexing decision (owner's, not mine).** Every school page is `noindex`
  today because `status: "verified"` is hand-flipped and needs confirmed colours plus
  written permission. Options put to Henry 2026-09-13: (1) keep the gate and verify as
  schools sign; (2) split "indexable" from "permission" so a page with real colours and a
  mascot can be indexed; (3) index all 29,500 — I argued against it: near-duplicate pages
  at that scale read as doorway pages and can demote the whole domain; (4) **recommended**
  — index STATE and CITY directory pages, which are our own content, and leave the school
  pages noindex until they are enriched. Henry has not chosen yet.

---

# Flush-top fork: 15 × 6.75" school frame at /lab/flush  (2026-09-02/03) — DONE
# (superseded 2026-09-12 by the 15.5 × 6.75 shipping frame — see CLAUDE.md)

Plan: `~/.claude/plans/imperative-splashing-scroll.md`. Owner decisions: ONE new fork,
15" wide, flush top, on Bill's 1.000" grid. History: 6.75 (0.75 below) → Bill taped the
Pilot (6.625" × 21.5") → 6.5 (0.5" bar, fits the Pilot, bench clean) → owner saw the
0.5" bar as a sliver and chose **6.75 with a 0.75" bar over the Pilot** (2026-09-03),
plus **the side columns span the full height** (Bill's split; a full-width top runner was
tried and rejected). Each side column is three EQUAL 2 × 2.25 badges on its own row lattice
(`wingRows: 3`), no bare strip. Keystone rise 0.8 so the class year has air. Parts: sides 2 × 6.75, top 11 × 0.75
(notched), bottom 11 × 1.
`/s/sluh-jr-bills` untouched; the fork wears any kit via `?school=<slug>` like `/lab/slim`.
Note for Bill: `tasks/flush-frame-for-bill.md`.

## Steps
- [x] 1. `FrameConfig` gains `topBarHeightInches?`, `plateTopCoverInches?`, `screwNotches?`; `SCHOOL_FLUSH_FRAME_CONFIG`
- [x] 2. `src/lib/utils/rows.ts` row-geometry helper + tests (defaults reproduce today's numbers)
- [x] 3. Grid: `slot-generator.ts` rows via helper, `FrameGrid.isBannerOnly`; `panels.ts` part sizes; `layout.ts` plate/wing y
- [x] 4. Placement: `canPlace` refuses banner-only rows (`"banner"`); `snappetRect` stays pure geometry
- [x] 5. Print: `schoolBannerRect` + `panelBleedBox` on the helper (`panelRowsPx`); crop-vs-sectionBounds test; screw notches punched out; `clearOutsideTab` fixed to bottom-only
- [x] 6. Screen: `FrameCanvas.tsx` shares `bannerRowBox`, grooves/aspect via helper; notches drawn; banner-only cells not rendered as pockets
- [x] 7. Presets: `sideAnchors` skips banner rows; `FLUSH_STACK [2,2,2]`; `FLUSH_PRESETS`
- [x] 8. Variant registry `src/data/school-variants.ts`; builder/kit page/designer take `variant`/`presets`; `bottomTab` sniff removed
- [x] 9. Route `/lab/flush` + fork bar
- [x] 10. Fit bench: `topRailHeightInches` (+ dial, URL key `th`), `FLUSH_SPEC` preset, `registrationOf`, bridge round-trip; Pilot ceiling 7 → 6.625 (taped) + width 21.5
- [x] 11. Tests: updated pins; new `rows.test.ts`, `flush-frame.test.ts`, `flush-export.test.ts` (cuts panels the way the exporter does and samples pixels); 59 files green
- [x] 12. Verify: tsc 0, lint 0 errors; print render 3000×1300 = 15×6.5; browser shot of /lab/flush; bench readout 15 × 6.5 / above 0 / below 0.5 / zero flags
- [x] 13. Docs: CLAUDE.md flush + Pilot sections; `tasks/flush-frame-for-bill.md`; lessons.md

## Found in verification (fixed)
- Wing cells on the short top row rendered as white empty pockets (two notches in the
  top corners). Now filtered out of the canvas's cell list: frame body, no drop target.
- `clearOutsideTab` ran on EVERY panel of a keystone frame, erasing the top 0.55" of the
  top runner and side columns outside a centred trapezoid. Slim's exports had it too.

## Open questions carried (not blockers)
- Pilot: plate bottom edge → recess floor, in inches. The 6.5" frame needs ≥ 0.5".
- Missouri rule on covering the state name (0.5" top cover reaches the band on some plates)
- Fitment engine needs a `standard-15` preset (L/R 1.5, top 0, bottom 0.5) AND the Pilot
  tape record (sibling repo)
- Screw-notch shape/depth is Bill's to design; the builder's 0.7 × 0.275 is a placeholder

## v2 ideas
- Top-banner text keep-out around the two notches (centred text clears them today)
- `frameCorners`: treat the topmost PLACEABLE row as the corner on frames with a short row 0
