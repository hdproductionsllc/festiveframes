# Flush-top fork: 15 × 6.5" school frame at /lab/flush  (2026-09-02) — DONE

Plan: `~/.claude/plans/imperative-splashing-scroll.md`. Owner decisions: ONE new fork,
15" wide, flush top, on Bill's 1.000" grid; first cut 6.75" tall (0.75" below), revised
the same day to **6.5" (0.5" below)** after Bill taped the Pilot (recess 6.625" × 21.5").
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
