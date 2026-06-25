# Builder design-loss bug fixes

- [x] #1 Fix off-by-one history model (design-store.ts): withHistory snapshots resulting state, history[index]==live, undo/redo +/-1, canUndo/canRedo, reconcile selectedBarId
- [x] #2 Run fillAll/randomFill/alternateSlots (and fillEmpty/mirror) through clearCoveredTiles
- [x] #3 applyPreset: clear textBars + selectedBarId (full-canvas replace); ?look= path verified OK (uses clearAll)
- [x] #4 BottomBarEditor: inline "covers N tiles" warning before first keystroke buries a row
- [x] Verify undo/redo trace: A, B, undo, undo, redo, redo -> {A,B} (PASS)
- [x] npx next build (exit 0) + npm run lint (exit 0, 18 pre-existing warnings, none in edited files)
