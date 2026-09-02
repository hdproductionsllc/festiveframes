# Flush-top frame — parts note for Bill (2026-09-02)

The fitment data (31 measured cars, memo of 2026-08-24) says the TOP edge is the
choke point: backup cameras and garnish strips leave 0.26–0.4" above the plate on a
third of the fleet (Camry 0.26, Explorer 0.28, Equinox 0.34, Pilot 0.40). Every frame
we have drawn so far hangs 0.47–0.96" above the plate. Below the plate, clearances
cluster at 1.0–1.6", so 0.75" is the ceiling there.

Henry's call: one new candidate at **15" wide × 6.75" tall, flush on top**, on the
1.000" grid. Builder to look at: `/lab/flush?school=sluh-jr-bills`. Bench preset:
`/lab/fit` → "Flush 15 (fork)".

## The three parts (flat inches, 1.000" grid)

| Part | Size | Where it sits on the 12 × 6 plate |
|---|---|---|
| Top runner | **11 × 0.75** | Flush: top edge AT the plate's top edge. All 0.75" is over the plate face. |
| Side columns (×2) | **2 × 6.75** | 0.5" over the plate face (unchanged), 1.5" outboard. Were 8" tall. |
| Bottom runner | **11 × 1** (+ keystone) | 0.25" over the plate face, 0.75" below the plate edge. |

Assembled: 15 × 6.75. Window 11 × 5. Stack: 0.75 + 5 + 1 = 6.75.

## What is new

1. **The top runner is 0.75" tall, not a tile.** That is the only height at which a
   flush top closes on a 1" grid. It is a text banner only (it always was), so the
   builder treats that row as frame body everywhere, wings included: the side columns
   carry three 2 × 2 badges on the six rows under it and a 0.75" strip of body above.
2. **Two screw slots in the top runner.** The plate's top bolt holes are 0.625" down
   from its top edge and 7" apart, so a flush 0.75" bar covers them. The builder draws
   a 0.34 × 0.5" slot centred on each hole: 2.5" in from each plate side, which on the
   11" runner (it starts 0.5" in from the plate's edge) is **2.0" and 9.0" from the
   runner's left end**, centred vertically at 0.375". The print file has no ink where
   the slots go. Slot shape and any counterbore are yours to design.

## The print files, as exported (300 DPI, no bleed)

Pinned by `src/lib/utils/flush-export.test.ts`. Side columns export rotated to
landscape, which is how they go on the bed.

| File | Pixels | Inches |
|---|---|---|
| Assembled sheet | 4500 × 2025 | 15 × 6.75 (fits the 16.5 × 13 bed unrotated) |
| Top runner | 3300 × 225 | 11 × 0.75, two slot holes transparent |
| Bottom runner | 3300 × 465 | 11 × 1.55 = 1.00 bar + 0.55 keystone, shoulders transparent |
| Side column (each) | 2025 × 600 | 6.75 × 2 (rotated; the part stands 2 wide × 6.75 tall) |
3. **Keystone unchanged** (rise 0.55, base 6, top 5). On this frame the bar top is only
   0.25" up the plate, so the keystone reaches 0.80" — under Missouri's 1.08" date line.

## Pilot, taped 2026-09-02: recess 6.625" tall × 21.5" wide

The plate is 6" tall, so the recess leaves **0.625" total** above and below. The
6.75" frame above does not fit it: 0.125" over even if the plate sits hard against
the recess top. The 7" candidate does not fit either. The width is a non-issue.
One more number decides the fix: **plate bottom edge → recess floor**, in inches.
That is how much may hang below the plate on the Pilot. If it is 0.5" or more, a
**15 × 6.5** version fits (0.5" top runner, 1" bottom runner at 0.5" over / 0.5"
below, screw slots in both runners); if it is less, the bottom bar has to move up
over the plate face and take the bottom slots with it.

## One more thing to settle before material

- **State name.** 0.75" of top cover reaches the state-name band on most plates. Some
  states prohibit covering it. Missouri's rule is unchecked. This is a legal question,
  not a fitment one, and it is the one thing that could sink a flush top.

Standing rule unchanged: nothing gets stretched in eufyMake. A file that does not fit
is wrong and comes back to the code.
