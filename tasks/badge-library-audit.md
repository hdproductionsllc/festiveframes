# Badge library audit — where the 48 enamel pins fall short

Written after the owner flagged: gaps in the set, some pieces "quite sloppily
done", the art palette showing "colours that are more like patterns that's not
real", and a wish to keep some of the withdrawn fabric artwork.

Everything below is measured, not eyeballed. Nothing was regenerated to produce
it — no API spend.

---

## 1. The biggest defect is one nobody has named yet: five badges are half see-through

Measured across all 48, the share of inked pixels sitting at partial alpha
(60–200 of 255) — a normal antialiased edge runs 0.3–1.5%:

| badge | translucent art |
|---|---|
| honor-star | **58.2%** |
| volleyball | **19.5%** |
| water-polo | **15.0%** |
| swim-dive | **8.9%** |
| racquetball | **3.9%** |
| *(the other 43)* | 0.3–1.5% |

The translucent pixels are not an outer halo. Mapping them shows they trace
**every interior gold line**, and their mean colour is gold (volleyball
146,130,108). The navy field shows through the metal, so the gold reads as
tarnished grey-brown instead of polished gold. That is the single largest reason
the set looks uneven.

### Root cause: the source backdrops are unkeyable

The keyer separates art from backdrop. Measuring "magenta-ness" — `min(r,b) − g`,
which is 255 for a pure magenta field and about −40 for pure gold — on each
source's corners:

| source | backdrop RGB | magenta-ness |
|---|---|---|
| a clean generation | 252,3,249 | **246** |
| volleyball 1K | 198,62,145 | **82** |
| Ideogram pin-4 | 172,26,94 | **68** |
| Ideogram pin-1 / pin-3 | 196,0,92 / 186,2,94 | **92 / 93** |

Polished gold reflecting the sweep measures around **110**. When the backdrop
itself only reaches 68–93, the gold is *more magenta than the background* — no
threshold can separate them, and no keyer fix can recover those files. The model
lit the backdrop instead of rendering it as a flat field on those generations.

Rugby came from the one good Ideogram source (208) and measures a clean 0.5%,
which is the control that confirms the diagnosis.

### Two real keyer bugs, found on the way, fixable for free

1. **The key metric is wrong.** `cut-enamel-pins.mjs` keys on RGB distance from
   the backdrop with a 62→132 feather. Gold reflecting the sweep lands at ~108,
   inside that band, so it is rendered partly transparent. Keying on magenta-ness
   instead puts contaminated gold ~90 clear of the threshold.
2. **The erode is a global min-filter, not a silhouette erode.** It runs over
   every pixel, so wherever bug 1 produced a thin translucent line, three passes
   smear it into a wide band. It must skip pixels whose neighbours are all opaque.

Proven on the identical 1K volleyball source: **19.5% → 0%** translucent, and the
gold visibly changes from grey to gold. See `vb-ab.png`.

The threshold must be derived from the sampled backdrop, not hardcoded — my first
attempt hardcoded it and left volleyball's dim backdrop unkeyed.

### What that means per badge — RESOLVED, all five

- **volleyball** — re-cut from its 2K sibling, which has a clean backdrop (197).
  19.5% → 0.2%.
- **honor-star, racquetball, swim-dive, water-polo** — no keyable source exists, but
  they did not need one. `scripts/repair-cut-alpha.mjs` promotes *interior* partial
  alpha back to opaque: a pixel that cannot be reached from the image border by
  walking through near-transparent pixels is enclosed by art, so its transparency is
  contamination rather than a hole. Real holes stay holes because the walk crosses
  them. honor-star 58.2% → 2.7%, water-polo 15% → 1%, swim-dive 8.9% → 0.4%,
  racquetball 3.9% → 0.9%.

The whole library now sits at or under 2.7%, with one piece above 1.5%.

---

## 2. The art palette, the owner's own example

Confirmed sloppy in both versions (`palette-zoom.png`):

- The shipped 1K has a **red-and-black two-tone dab** where a paint well should be
  one colour — read as a pattern, which is exactly the complaint — and the thumb
  hole is drawn as a set of **gold slats**, which is not a thing that exists.
- The 2K fixes the thumb hole but **merges two yellow dabs into a peanut**.

Neither is shippable as-is.

---

## 3. Other pieces that break the one-make rule

Measured by the colour of the outer rim band (the set's defining feature is a
polished gold border):

- **robotics** — rim luminance 60, warmth 4: a charcoal outline, not gold. The
  head is grey plastic. Off-style.
- **orchestra** — a photoreal wooden violin, no metal border.
- **rotc** — silver sabres with a gradient, not enamel.
- **rugby** — royal/purple blue, visibly off the navy every other piece uses.

**Correction.** honor-star was on this list as "silver/pewter, no gold border, the
worst piece in the library". That was wrong, and wrong in an instructive way: the
piece is a GOLD laurel wreath. It only looked like pewter because 58% of it was
transparent and the navy field was showing through the metal. Repairing the alpha
turned it gold. A rendering defect read as a style defect, which is the argument
for measuring before concluding — and the reason the fabric `laurel` swap proposed
below is no longer needed.

Weak concepts rather than bad renders:

- **cross-country** — a pine tree and a path reads as camping.
- **track** — a single shoe, ambiguous against the wrestling boots.
- **gymnastics** — two solid gold discs; rings are hoops, these read as medals.
- **quiz-bowl** — a red buzzer with a badly-drawn cable and a speckled dome.
- **choir** — an open book; collides with diploma and yearbook.

Note: **magenta residue measured at 0% across all 48.** The pink cast I thought I
saw on dance, rotc and tennis is those pieces' own warm rim, not spill. The
"backdrop is a flat graphic field" prompt fix held.

---

## 4. Gaps in coverage

Against the tier list in `enamel-pin-ideogram-prompts.md` §5, still missing:

- **Tier 1**: jazz band, Model UN, campus ministry, speech (debate is standing in)
- **Tier 2**: crew/rowing, sailing, ski, weightlifting, colour guard, film,
  ceramics, culinary, FFA, scouts
- **Also worth having**: math club, environmental club, language club, drumline,
  unified/special olympics, fishing, archery

No badge is *broken* in wiring — all 48 library pieces resolve to a file, all 48
files are referenced, and no kit chip points at a missing piece. The gaps are
coverage, not fallbacks.

---

## 5. The withdrawn fabric artwork

31 pieces are recoverable from `1c1ed73^` (see `fabric-sheet.png`). The wholesale
withdrawal was too broad: the set was never one make either — roughly 13 were true
embroidered patches with a merrow border, and the other 18 were flat or photoreal
pieces that had the same incoherence problem the enamel rebuild was meant to fix.

The genuinely good patches, and in several cases better *concepts* than their
enamel replacements:

- **cheer** — crossed pom-poms. A far better cheer symbol than the enamel megaphone.
- **robotics** — the patch robot head beats the grey enamel one.
- **science, drama, crest, chess** — clean patch art.
- **baseball / basketball / football / soccer / softball / volleyball patches** —
  cohesive as a group.

Caveat: `baseball-patch` carries a visible magenta fringe along its bottom edge
from the old keyer.

The open question is a product one, not a technical one: a palette mixing thread
and metal reads as two products. If some fabric comes back it should be a
deliberate, self-consistent group, not a scatter.

---

## 6. On the 2K set

43 files sit uncut in the scratchpad. It is **not** uniformly better than the 1K —
per-piece backdrop keyability varies and three regressed:

| piece | 1K | 2K |
|---|---|---|
| marching-band | 247 | **80** |
| lacrosse | 244 | **107** |
| science | 244 | **189** |
| volleyball | **82** | 197 |

So any move to 2K has to be per-piece on measured keyability, never wholesale.

---

## 7. Every badge was square, and portrait tiles could not exist

Raised by the owner separately: "we don't have any portrait 2x1 tiles anymore".
Two independent causes, both now fixed.

**The data.** The enamel rebuild declared all 48 pieces `PREFERRED` (2x2) and left
`TALL` defined but referenced nowhere. Meanwhile the intake had stopped padding art
out to a square, so the files carry real aspect ratios from 0.50 to 3.07. A 3:1
torch in a square tile is fitted to its height by `contain` and leaves two thirds of
the tile empty — the same defect that made the racquetball look undersized, wearing
a different hat. Footprints are now derived from the measured art: 8 portrait, 5
landscape, 35 square.

**The mechanism, which is the more important half.** Even before the rebuild, a
`TALL` declaration could never take effect. `minSpanFor` floored every art piece at
a SQUARE `MIN_ART_SPAN` with a per-axis `Math.max`, and `max({1,2},{2,2})` is
`{2,2}`. Nine pieces carried a portrait span and not one of them could seat at it,
so this was already broken at commit 47fa883 and the rebuild only removed the last
evidence of the intent.

The readability rule that floor was protecting never actually required a square.
Both renderers fit art with `contain`, which scales to the LONG axis — so a 1:2
badge in a 2x2 tile is drawn at exactly the same size as in a 1x2 tile. The extra
column is empty field, not extra artwork. The floor now applies to the long axis and
the piece keeps its own shape.

This matters more on this frame than it sounds: the plate-hole region has no slots
at all, so the tile area is the top strip, the bottom pair of rows, and four
single-column wings and rails. A portrait 1x2 is the only badge footprint that fits
a one-column wing without spilling into the rail beside it.

`high-school.spans.test.ts` re-measures every PNG and fails if a declaration drifts
from its artwork, so a future re-cut cannot silently undo this again.

Verified in both renderers: the print path through `@napi-rs/canvas`, and the
builder in Chromium.
