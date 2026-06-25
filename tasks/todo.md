# Builder mobile usability + clarity pass

## Goal
Make tile placement SUPER OBVIOUS. Tap-to-arm + tap-frame-to-place, drag still works.

## Tasks
- [x] palette-store: add a one-time "armed hint seen" flag (for finger hint)
- [x] PaletteTile: tile-tap ARMS (selects) only. Removed placeInNextEmpty/tapToPlace. Loud armed state + "PLACING" badge. Tap-again disarms.
- [x] TileGrid: dropped tapToPlace prop (keep size lg for mobile); pt-3 so badge isn't clipped.
- [x] RailSlot: persistent armed cue on EVERY cell (ff-armed-cue gold dashed + slow pulse) without hover, removed when nothing armed.
- [x] New ArmedBanner component: bold banner shown when a tile is armed. Near frame + palette.
- [x] One-time finger hint pointing at frame first time armed.
- [x] TilePalette: moved mobile callout + Tools button BELOW TileGrid. Armed banner shown.
- [x] DndProvider: tuned TouchSensor to {delay:180, tolerance:8}.
- [x] globals.css: armed-cell cue + armed-pulse + finger hint keyframes, reduced-motion safe.
- [x] Build green (exit 0) + lint 0 errors (warnings all pre-existing).
