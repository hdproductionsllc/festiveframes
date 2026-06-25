# Builder intuitiveness redesign — text bar + layout

## Goal
Direct manipulation for text bars. Kill the invisible "draft" surface.
Keep drag-to-place as a clearly-labeled secondary path.

## Text bar
- [ ] Empty state: big inviting "+ Add a text bar" primary action when no bars.
- [ ] Auto-create+select when user types/styles/picks slogan with no bar selected.
- [ ] Selected bar -> all controls edit it live; panel says which bar.
- [ ] Strengthen selected-bar highlight on canvas.
- [ ] Consolidate add affordances (drop "+ New bar" header link; one add path).
- [ ] Keep drag-to-place, secondary + labeled.
- [ ] Per-bar list: text + row, big tap targets, icon Remove, selected state, friendly empty.
- [ ] Controls order: text -> font -> colors -> size. Slogans = quick-fill.

## Layout
- [ ] Tighten flow, mobile ergonomics, safe-area, sticker theme.

## Quick wins
- [ ] Disabled Order -> helper "Add at least one tile to order".
- [ ] Fill All -> gracefully use active set's first tile when none selected.

## Constraints
- DO NOT touch order/checkout, api, lib/order, lib/email, thanks, text-bar.ts,
  defaults.ts, QR rule, no-overlap helpers, (home).
- Preserve all functionality.

## Verify
- [x] npx next build exits 0
- [x] npm run lint no new errors (only pre-existing warnings)
- [x] NO commit/push (left on master, no commits)
