# Sticker Redesign — Live Homepage + Builder Reskin

**Goal:** Bring the "cartoon-sticker" design language (cream canvas, thick ink outlines, hard offset shadows, Fredoka + Nunito, pink/blue/yellow/purple) to the site.
1. **Phase 1 — Homepage:** replace the live homepage (`/`) with the sticker redesign from the handoff. Preserve the old Americana homepage (recoverable + viewable at `/classic` + git tag). Wire CTAs to the real `/buy` → Stripe flow.
2. **Phase 2 — Builder reskin:** restyle `/build` to match the fun vibe — **skin only. Functionality and production output (composed frame, print files, parts list) stay byte-for-byte identical.**

---

## PHASE 1 — Homepage  ✅ BUILT + VERIFIED (commit local, push pending)

### Preserve the old design
- [x] Git tag current `master` as `pre-redesign-classic`
- [x] Move old `(site)/page.tsx` → `(site)/classic/page.tsx` (renders at `/classic`, navy chrome intact)
- [x] `/classic` → `robots: noindex` so it doesn't compete with the new home

### Scaffold
- [x] Copy handoff assets → `public/redesign/` (logo, 6 look photos, 11 tiles)
- [x] `(home)/layout.tsx` — Fredoka + Nunito via `next/font/google`, sticker theme wrapper
- [x] `(home)/sticker.css` — palette tokens, hard-shadow primitives, keyframes (marquee/float/wiggle)
- [x] `(home)/page.tsx` — new `/`; ported SEO metadata + JSON-LD from old page

### Sections (pixel-faithful)
- [x] Header (sticky announce + nav, scarcity live from `FOUNDING`)
- [x] Hero ("Park with personality.", CTAs, stats, tilted photo + popsicle)
- [x] Marquee (infinite pink strip)
- [x] Looks (filter pills client island + 6 look cards + Tile Library)
- [x] How It Works (3 numbered cards)
- [x] Why Us (purple band, 4 features)
- [x] The Kit (live scarcity, "what's inside" + 2 pricing cards → `/buy`)
- [x] Custom Orders (blue panel, mailto)
- [x] Reviews (3 real testimonials)
- [x] Footer (ink, 4 cols, working email capture → `/api/subscribe`)

### Polish + verify
- [x] Hover "press" states; responsive collapse; reduced-motion (global)
- [x] `npm run build` clean (`/` static, `/classic` preserved, all other routes intact)
- [x] Smoke test: `/` + `/classic` → 200; hero/marquee/scarcity/CTAs/prices all present; screenshot looks great
- [ ] Check in before `git push` (auto-deploys to production)  ← HOLDING for go-ahead

---

## PHASE 2 — Builder reskin (skin only, output frozen)  ✅ DONE + PUSHED (27c8a48)
- [x] Audit `/build` chrome vs. the frame/canvas (output) — mapped via Explore agent
- [x] Old builder preserved at git tag `pre-build-reskin`
- [x] Apply sticker language to chrome ONLY via scoped `.build-skin` stylesheet
      (utility overrides, since globals.css uses `@theme inline`): cream stage +
      confetti, ink-outline panels w/ hard shadows, Fredoka+Nunito, sticker accents
- [x] DO NOT TOUCH verified: git shows only `build/page.tsx` + new `build-skin.css`
      changed; ZERO output-pipeline files (compose-frame, eufy-print, FrameCanvas,
      RailSlot, PlacedTileView, LicensePlateArea, BottomTextBar, TileArtwork,
      ExportPartsList, design-store, data/) touched
- [x] Output identity guaranteed by construction (no render/compose/print code changed;
      plate uses inline styles + /40,/60,/30 variants not in the override set)
- [x] `npm run build` clean; screenshot verified frame preview renders identically

## Notes
- Old design recoverable: `/classic` route + `pre-redesign-classic` git tag.
- Scarcity + pricing from `config/founding.ts` + `config/offers.ts` — never hardcoded.

---

# Builder UX overhaul — July 4th launch (mobile tiles + tutorial + streamline)

## 1. July-4th-only streamline
- [x] Add `SURFACED_SET_IDS` + `surfacedSets` to `src/data/sets/index.ts` (only july4th)
- [x] SetTabs: render only surfaced sets, drop the "More tile sets" expander + style filter

## 2. Mobile tile discovery (always-visible tray)
- [x] TileGrid: add `variant` ("grid" | "row") + surfaced-set fallback
- [x] PaletteTile: `size` prop for bigger thumb-friendly tiles; tap-to-place into next empty slot on mobile
- [x] TilePalette: desktop left column kept; mobile = persistent bottom tray (safe-area inset), no floating button / bottom-sheet; body padding reserves tray height
- [x] data-tour="tiles" on tray + desktop palette (canvas/text resolved by anchor, not editable)

## 3. Foolproof tutorial (spotlight + arrows)
- [x] New CoachmarkTour component under src/components/build/
- [x] Steps: tiles -> canvas -> text -> order; SVG-mask dim + ring + arrow + caption, Next/Back/Skip, arrow keys
- [x] First-visit gated (localStorage), Escape to close, focus mgmt
- [x] DesignerHeader: added data-tour="order" to Order button (attr only)
- [x] OnboardingPopup rewritten into the tour; mounted via existing BuildChrome

## 4. Verify
- [x] npx tsc --noEmit passes (exit 0)
