# Flush-top frame — parts note for Bill (2026-09-02, revised same day for the Pilot tape)

The fitment data (31 measured cars, memo of 2026-08-24) says the TOP edge is the
choke point: backup cameras and garnish strips leave 0.26–0.4" above the plate on a
third of the fleet (Camry 0.26, Explorer 0.28, Equinox 0.34, Pilot 0.40). Every frame
we have drawn so far hangs 0.47–0.96" above the plate.

Your Pilot tape (recess 6.625" tall × 21.5" wide) then set the bottom: a 6" plate
leaves 0.625" of height in total, so a frame that spends nothing above the plate may
hang at most ~0.6" below it. We are using the 0.5" the July ring already proved.

Henry's call: **15" wide × 6.5" tall, flush on top**, on the 1.000" grid.
Builder to look at: `/lab/flush?school=sluh-jr-bills`. Bench preset: `/lab/fit` →
"Flush 15 (fork)". The bench reads it clean on every rule.

## The three parts (flat inches, 1.000" grid)

| Part | Size | Where it sits on the 12 × 6 plate |
|---|---|---|
| Top runner | **11 × 0.50** | Flush: top edge AT the plate's top edge. All 0.5" is over the plate face. |
| Side columns (×2) | **2 × 6.50** | 0.5" over the plate face (unchanged), 1.5" outboard. Were 8" tall. |
| Bottom runner | **11 × 1.00** (+ keystone) | 0.5" over the plate face, 0.5" below the plate edge. |

Assembled: 15 × 6.5. Window 11 × 5. Stack: 0.5 + 5 + 1 = 6.5.
This is the 7" candidate with its half inch of air moved from above the plate to below it.

## What is new

1. **The top runner is 0.5" tall, not a tile.** That is the only height at which a
   flush top closes on a 1" grid with a 0.5" drop. It is a text banner only (it always
   was), so the builder treats that row as frame body everywhere, wings included: the
   side columns carry three 2 × 2 badges on the six rows under it and a 0.5" strip of
   body above.
2. **Screw notches in BOTH runners.** The plate's bolt holes are 0.625" in from its top
   and bottom edges, 7" apart. A screw head is about 0.6" across, so a runner reaching
   0.5" over the face overlaps each head by ~0.175". The builder cuts a notch 0.7" wide
   and ~0.28" deep in each runner's plate-side edge over each hole: **2.0" and 9.0" from
   the runner's left end** (2.5" in from each plate side; the 11" runner starts 0.5" in
   from the plate's edge). The print file has no ink where the notches are. Notch shape,
   depth and any counterbore are yours to design; the builder's numbers are a placeholder
   for the drawing.
3. **Keystone unchanged** (rise 0.55, base 6, top 5). The bar top is 0.5" up the plate,
   so the keystone reaches 1.05", under Missouri's 1.08" date line.

## The print files, as exported (300 DPI, no bleed)

Pinned by `src/lib/utils/flush-export.test.ts`. Side columns export rotated to
landscape, which is how they go on the bed.

| File | Pixels | Inches |
|---|---|---|
| Assembled sheet | 4500 × 1950 | 15 × 6.5 (fits the 16.5 × 13 bed unrotated) |
| Top runner | 3300 × 150 | 11 × 0.5, two notches open on its lower edge |
| Bottom runner | 3300 × 465 | 11 × 1.55 = 1.00 bar + 0.55 keystone, shoulders transparent, two notches open on the bar's upper edge |
| Side column (each) | 1950 × 600 | 6.5 × 2 (rotated; the part stands 2 wide × 6.5 tall) |

## Two things to settle before material

- **Plate bottom edge → recess floor on the Pilot**, in inches. The 6.5" frame needs
  0.5" there. If the plate sits centred in the recess there is only ~0.31", and the
  bottom bar would have to move up over the plate face instead.
- **State name.** 0.5" of top cover reaches the state-name band on some plates. Some
  states prohibit covering it. Missouri's rule is unchecked. This is a legal question,
  not a fitment one.

Standing rule unchanged: nothing gets stretched in eufyMake. A file that does not fit
is wrong and comes back to the code.
