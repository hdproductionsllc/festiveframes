# Flush-top fork: 15 × 6.75" school frame at /lab/flush  (2026-09-02) — DONE

Plan: `~/.claude/plans/imperative-splashing-scroll.md`. Owner decision: ONE new fork,
15" wide × 6.75" tall, 0.75" flush top bar, on Bill's 1.000" grid. `/s/sluh-jr-bills`
untouched; the fork wears any kit via `?school=<slug>` like `/lab/slim`.
Note for Bill: `tasks/flush-frame-for-bill.md`.

## Steps
- [x] 1. `FrameConfig` gains `topBarHeightInches?` + `plateTopCoverInches?`; `SCHOOL_FLUSH_FRAME_CONFIG`
- [x] 2. `src/lib/utils/rows.ts` row-geometry helper + tests (defaults reproduce today's numbers)
- [x] 3. Grid: `slot-generator.ts` rows via helper, `FrameGrid.isBannerOnly`; `panels.ts` part sizes; `layout.ts` plate/wing y
- [x] 4. Placement: `canPlace` refuses banner-only rows (`"banner"`); `snappetRect` stays pure geometry
- [x] 5. Print: `schoolBannerRect` + `panelBleedBox` on the helper (`panelRowsPx`); crop-vs-sectionBounds test; screw slots punched out
- [x] 6. Screen: `FrameCanvas.tsx` shares `bannerRowBox`, grooves/aspect via helper; screw slots drawn; banner-only cells not rendered as pockets
- [x] 7. Presets: `sideAnchors` skips banner rows; `FLUSH_STACK [2,2,2]`; `FLUSH_PRESETS`
- [x] 8. Variant registry `src/data/school-variants.ts`; `SchoolBuilder`/`SchoolKitPage`/`SchoolDesigner` take `variant`/`presets`; `bottomTab` sniff removed
- [x] 9. Route `/lab/flush` + fork bar
- [x] 10. Fit bench: `topRailHeightInches` (+ dial, URL key `th`), `FLUSH_SPEC` preset, `registrationOf`, bridge round-trip
- [x] 11. Tests: updated pins; new `rows.test.ts`, `flush-frame.test.ts`; 58 files green
- [x] 12. Verify: tsc 0, lint 0 errors, vitest green; print render 3000×1350 = 15×6.75; browser shots of /lab/flush (aspect 2.217 vs 2.222); /lab/fit readout 15 × 6.75 / above 0 / below 0.75
- [x] 13. Docs: CLAUDE.md flush section; `tasks/flush-frame-for-bill.md`

## Found in the renders (fixed)
- Wing cells on the 0.75" row rendered as white empty pockets (two notches in the top
  corners). Now filtered out of the canvas's cell list: frame body, no drop target.

## Pilot TAPED (2026-09-02, Bill): recess 6.625" tall x 21.5" wide
- 0.625" total to share above/below a 6" plate. The 6.75" flush frame does NOT fit
  (over by >= 0.125"); the 7" candidate and the 6.937" July ring do not either.
- Bench: `PILOT_HEIGHT_CEILING_INCHES` 7 -> 6.625 (+ width 21.5); July/candidate/flush
  tests now assert the Pilot flag. Geometry NOT changed yet: owner's call.
- Still needed: plate bottom edge -> recess floor, in inches (decides the fix).
- Owner options: (A) 15 x 6.5 flush: 0.5" top runner, 1" bottom at 0.5 over / 0.5
  below, slots in both runners (clears the July line AND the state-name rule);
  (B) keep 6.75 and accept the Pilot does not fit.

## Open questions carried (not blockers)
- Missouri rule on covering the state name (0.75" top cover)
- Fitment engine needs a `standard-15` preset AND the Pilot tape record (sibling repo)

## v2 ideas
- Top-banner text keep-out around the two screw slots (centred text clears them today)
- `frameCorners`: treat the topmost PLACEABLE row as the corner on frames with a short row 0
- Keystone rise 0.55 → 0.80 on the flush frame (reaches 1.05, still under MO's 1.08)
