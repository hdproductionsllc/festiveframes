# Start Gate for /build — DONE (branch master, no commit)

## Tasks
- [x] Create `StartGate.tsx` sticker modal (name input + StateSelector + CTA)
- [x] Gating: show only for fresh visitor (no persisted design + no `ff:started`)
- [x] Returning user (restored design) -> skip entirely
- [x] `?look=` arrival -> pre-fill name (added `name` to LookPreset), allow proceed
- [x] On submit: set `ff:started`, persist name+state, close, reveal builder
- [x] Sequence with onboarding: gate first, OnboardingPopup mounts only after gate done
- [x] Seed runs behind modal (z-[70] gate over z-[60] onboarding); picked state applies to plate
- [x] Mount in BuildChrome, OnboardingPopup suppressed until gateDone
- [x] Race-proof: persisted-design snapshot captured at module-eval (before seed effect)

## Verify
- [x] npx next build — exit 0
- [x] npm run lint — 0 errors, 18 pre-existing warnings (none in changed files)
