# Flush-top frame — parts note for Bill (rev. 2026-09-23)

The fitment data (31 measured cars, memo of 2026-08-24) says the TOP edge is the
choke point: backup cameras and garnish strips leave 0.26–0.4" above the plate on a
third of the fleet (Camry 0.26, Explorer 0.28, Equinox 0.34, Pilot 0.40). Every frame
we have drawn so far hangs 0.47–0.96" above the plate.

Henry's call: **15.5" wide × 6.75" tall, flush on top**, on the 1.000" grid, your part
split (full-height side columns, runners between them). A 6.5" version (0.5" top
runner) was tried and fits your taped Pilot recess (6.625"), but the 0.5" bar read as
a sliver; Henry chose the 0.75" bar and accepts that the Pilot is out.
Builder: `/lab/flush?school=sluh-jr-bills`. Bench preset: `/lab/fit` → "Flush 15.5 (shipping)". Now served on every school's own page at `/s/<slug>`, not just the lab route.

## The three parts (flat inches, 1.000" grid)

| Part | Size | Where it sits on the 12 × 6 plate |
|---|---|---|
| Side columns (×2) | **2.25 × 6.75** | The full frame height. 0.5" over the plate face, **1.75" outboard**. Were 2 × 6.75. |
| Top runner | **11 × 0.75** | Between the side columns. Flush: top edge AT the plate's top edge, all 0.75" over the plate face. |
| Bottom runner | **11 × 1.00** (+ keystone) | Between the side columns. 0.25" over the plate face, 0.75" below the plate edge. |

Assembled: **15.5 × 6.75**. Window 11 × 5 (unchanged). Stack: 0.75 + 5 + 1 = 6.75.
Width: 2.25 + 11 + 2.25 = 15.5.

## What is new

1. **The top runner is 0.75" tall, not a tile.** It is a text banner only. Each side
   column is **three SQUARE badges, 2.25 × 2.25 each**, edge to edge with no bare
   strip. THIS IS THE CHANGE from the 2026-09-03 note: the columns went 2 → 2.25
   so the badges are square (6.75 / 3 = 2.25), which is why the frame is 15.5 and
   not 15. Four squares per side was priced and rejected — it forces 1.6875"
   badges and a NARROWER 14.375" frame, because square badges lock width to
   height (W = 11 + 2H/N).
   The sides are on their own row spacing; the runners and the plate window stay on
   the 1" grid.
2. **The top runner is a plain rectangle.** Henry's call: no screw cut-outs in the
   print file. The plate's top bolt holes are 0.625" down from its top edge, 7" apart
   (2.5" in from each plate side), and a screw head is about 0.6" across, so the 0.75"
   runner sits over them; how the part clears the screws is yours to solve on the part.
   The bottom runner covers only 0.25" and is clear of the bottom holes.
3. **The bottom runner and keystone are one part with one edge.** The print draws the
   bar and the tab as a single outline with the same rim and bevel the badges wear,
   continuous around the shoulders. No line where the tab meets the bar.
4. **Keystone deeper: rise 0.8** (was 0.55). The bar top is only 0.25" up the plate,
   so the keystone reaches 1.05", still under Missouri's 1.08" date line, and the
   class-year line gets air above it. Bottom part is 11 × 1.80 all in.
5. **Keystone a touch wider, with rounder top corners (Henry, 2026-09-23).** The
   raised centre section of the bottom runner is now **6.25" wide where it meets the
   bar** (was 6") and **5.25" wide across its top** (was 5"). That is 1/8" more on
   each side, 1/4" overall, and the slanted sides keep the same angle as before
   (each one steps in 0.5" over the 0.8" rise). The two top corners are rounded at
   **0.375" radius** (was 0.25"). Nothing else on the part moves: it is still
   11 × 1.80 all in, and the rise is still 0.8". **The two inside corners where
   the slants meet the bar are SHARP on the part**: the export is cut along that
   outline with no rounding there. Only the painted rim looks rounded at those
   corners (the stroke is drawn with round joins). If you want a fillet there,
   add it on the part, or tell us the radius and we'll put it in the file. The
   wider base stands 2.875" in from each side of the plate, so it stays clear of
   the registration-sticker corners, and it clears the bottom screw heads by
   **about 0.2" (0.22")**, down from about 0.3" with the old 6" base. (Screw
   centre 2.5" in and 0.625" up the plate, head about 0.6" across; the nearest
   point of the tab is its slanted edge, 0.517" from the screw centre.)

## The print files, as exported (300 DPI, no bleed)

Pinned by `src/lib/utils/flush-export.test.ts`. Side columns export rotated to
landscape, which is how they go on the bed.

| File | Pixels | Inches |
|---|---|---|
| Assembled sheet | 4650 × 2025 | 15.5 × 6.75 (fits the 16.5 × 13 bed unrotated, 1" to spare) |
| Side column (each) | 2025 × 675 | 6.75 × 2.25 (rotated; the part stands 2.25 wide × 6.75 tall) |
| Top runner | 3300 × 225 | 11 × 0.75, plain rectangle |
| Bottom runner | 3300 × 540 | 11 × 1.80 = 1.00 bar + 0.80 keystone (6.25 base, 5.25 top, 0.375 corners), shoulders transparent |

## Known and accepted

- **Does not fit the Pilot** (6.75 into a 6.625" recess). Henry's call.
- **0.75" below the plate** is past the 0.5" the July ring proved. The fleet data
  (Camry XV70 at 1.01" below) supports it for non-trucks.

## Still to settle

- **State name: Missouri's rule, checked 2026-09-23. It does NOT look allowed as
  built.** The flush top runner covers the top 0.75" of the plate. On a Missouri
  plate that is the lower half of "MISSOURI" and part of the month (FEB) and tab
  corner. RSMo 301.130.5 (effective 2018-08-28) says each plate "shall be securely
  fastened to the motor vehicle or trailer in a manner so that all parts thereof
  shall be plainly visible and reasonably clean so that the reflective qualities
  thereof are not impaired". It also says tabs go "in the designated area of the
  license plate". The statute has no carve-out for frames. The only cover it
  allows is a transparent one, "so long as the plate is plainly visible".
  Source: https://revisor.mo.gov/main/OneSection.aspx?section=301.130
  **One line for Bill:** "Missouri law wants every part of the plate plainly visible.
  Our top runner covers half of MISSOURI and the corner of the month and tab area,
  so as drawn it is a ticketable obstruction risk. Don't tell a PTO it's fine.
  Henry is deciding." This is a reading of the statute text, not legal advice.
  Enforcement varies, and plenty of dealer frames cover the same band. But a
  frame we sell to a school should not rest on that. **Owner decision (Henry):**
  thin the top runner, or move it up so it clears the state name; either way,
  confirm with counsel before outreach. Geometry is unchanged until he decides.

Standing rule unchanged: nothing gets stretched in eufyMake. A file that does not fit
is wrong and comes back to the code.
