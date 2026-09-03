# Flush-top frame — parts note for Bill (2026-09-03)

The fitment data (31 measured cars, memo of 2026-08-24) says the TOP edge is the
choke point: backup cameras and garnish strips leave 0.26–0.4" above the plate on a
third of the fleet (Camry 0.26, Explorer 0.28, Equinox 0.34, Pilot 0.40). Every frame
we have drawn so far hangs 0.47–0.96" above the plate.

Henry's call: **15" wide × 6.75" tall, flush on top**, on the 1.000" grid, your part
split (full-height side columns, runners between them). A 6.5" version (0.5" top
runner) was tried and fits your taped Pilot recess (6.625"), but the 0.5" bar read as
a sliver; Henry chose the 0.75" bar and accepts that the Pilot is out.
Builder: `/lab/flush?school=sluh-jr-bills`. Bench preset: `/lab/fit` → "Flush 15 (fork)".

## The three parts (flat inches, 1.000" grid)

| Part | Size | Where it sits on the 12 × 6 plate |
|---|---|---|
| Side columns (×2) | **2 × 6.75** | The full frame height. 0.5" over the plate face, 1.5" outboard. Were 8" tall. |
| Top runner | **11 × 0.75** | Between the side columns. Flush: top edge AT the plate's top edge, all 0.75" over the plate face. |
| Bottom runner | **11 × 1.00** (+ keystone) | Between the side columns. 0.25" over the plate face, 0.75" below the plate edge. |

Assembled: 15 × 6.75. Window 11 × 5. Stack: 0.75 + 5 + 1 = 6.75.

## What is new

1. **The top runner is 0.75" tall, not a tile.** It is a text banner only. Each side
   column is **three equal badges, 2 × 2.25 each**, edge to edge with no bare strip.
   The sides are on their own row spacing; the runners and the plate window stay on
   the 1" grid.
2. **Screw notches in the top runner.** The plate's top bolt holes are 0.625" down from
   its top edge, 7" apart; a screw head is about 0.6" across, so the 0.75" runner sits
   over the heads. The builder cuts a notch 0.7" wide and ~0.525" deep into the runner's
   lower edge over each hole: **2.0" and 9.0" from the runner's left end** (2.5" in from
   each plate side; the 11" runner starts 0.5" in from the plate's edge). The print file
   has no ink where the notches are. Notch shape and depth are yours to design; these
   numbers are a placeholder for the drawing. The bottom runner covers only 0.25" and
   needs no notch.
3. **Keystone deeper: rise 0.8** (base 6, top 5; was 0.55). The bar top is only 0.25"
   up the plate, so the keystone reaches 1.05", still under Missouri's 1.08" date line,
   and the class-year line gets air above it. Bottom part is 11 × 1.80 all in.

## The print files, as exported (300 DPI, no bleed)

Pinned by `src/lib/utils/flush-export.test.ts`. Side columns export rotated to
landscape, which is how they go on the bed.

| File | Pixels | Inches |
|---|---|---|
| Assembled sheet | 4500 × 2025 | 15 × 6.75 (fits the 16.5 × 13 bed unrotated) |
| Side column (each) | 2025 × 600 | 6.75 × 2 (rotated; the part stands 2 wide × 6.75 tall) |
| Top runner | 3300 × 225 | 11 × 0.75, two notches open on its lower edge |
| Bottom runner | 3300 × 540 | 11 × 1.80 = 1.00 bar + 0.80 keystone, shoulders transparent |

## Known and accepted

- **Does not fit the Pilot** (6.75 into a 6.625" recess). Henry's call.
- **0.75" below the plate** is past the 0.5" the July ring proved. The fleet data
  (Camry XV70 at 1.01" below) supports it for non-trucks.

## Still to settle

- **State name.** 0.75" of top cover reaches the state-name band on most plates. Some
  states prohibit covering it. Missouri's rule is unchecked. Legal question, not fitment.

Standing rule unchanged: nothing gets stretched in eufyMake. A file that does not fit
is wrong and comes back to the code.
