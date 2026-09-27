# Die-struck enamel pin — Ideogram test prompts

**VERDICT: enamel wins, and the library moves to it.** The first five came back
(the four SLUH gaps plus the honour-roll A/B twin) and went onto the frame beside
their embroidered neighbours at actual size. It is not close: at an inch the
embroidered trumpet reads as a brown blur and the robot as a grey mass, while the
enamel pins hold their shape because the polished metal border gives every one a
hard, high-contrast edge. That is the principle to carry forward — at this size
the product cannot sell on detail, so it has to sell on shine and contrast, which
is the same reason the bevel and the brass rim work.

The rest of this file stands as the method. Everything below was written as a
test plan; treat §3 as history and §5 as the work queue — **§5 is now complete.**

---

## 0. What the last batch taught, which is worth more than the prompts

The library went 48 → 61 in one pass: 13 activities that had no badge, plus 11
existing badges redone. 24 subjects, 31 generations, $4.16. The three lessons:

**When it fails the same way twice, change the SUBJECT, not the wording.** Three
badges failed three times each while the instruction grew longer and more emphatic
every round, which achieved nothing — the model has a prior and prose does not move
it. What moved it was removing the thing the prior attaches to:

| failure | attempts 1–3 | what actually worked |
|---|---|---|
| the red paint well rendered near-black | "flat", "one solid colour", "no dark area" | made it **vermilion** — a shadow in vermilion is still orange |
| the red buzzer dome rendered black | "bright scarlet", "no speckles", "uniformly red" | made it a **gold desk bell** — no red to darken |
| the violin came back photoreal wood | "not a photograph", "thick gold linework" | made the body **navy enamel** — nothing left to be photoreal *about* |

Each had been asked correctly. The subject was carrying a prior stronger than the
instruction, so the fix was to pick a subject that cannot express the failure.

**The keyability gate pays for itself.** One of 24 came back on a backdrop
measuring 81 magenta-ness where a clean one is 245 — the model had lit the
backdrop. Gold reflecting the sweep reaches ~110, so at 81 the metal is *more*
magenta than the field behind it and no keyer can separate them. `cut-enamel-pins`
now refuses that source outright. One regeneration, $0.13, and it never reached the
library. This is exactly the failure that silently wrecked five badges before.

**Say the outline explicitly.** `CUT` — "cut to the silhouette of the subject, NOT
inside a circle, disc, medallion or border" — is now part of every prompt. Without
it cross-country came back as a round medallion twice while every neighbouring
badge was a cut silhouette, which reads as a different product.

---

A style TEST, not a commitment. The current badge library is embroidered patches
(gold merrow border, thread texture). The question is whether die-struck hard
enamel reads better at the size these are actually seen: roughly one inch, on the
back of a car, in a parking lot.

The case for testing it: every embroidered badge carries the same thread texture,
so at 1" they blur toward each other and the sport is hard to read at a glance.
Enamel keeps the dimensional, premium feel — arguably more so — while giving each
badge hard, high-contrast edges. Polished metal also matches the frame's brass rim
more closely than thread does.

**Decide it on renders, not on prompts.** Generate the three A/B pieces in §3
first, put them on the frame beside their embroidered twins at actual size, and
look. See CLAUDE.md, "Verifying visual work".

---

## 1. The two hard rules (unchanged, they apply to every set)

1. **Trademark-safe — generic elements only.** No real school mascots, logos,
   crests, or wordmarks. Stars, pennants, trophies, laurels, blank shields,
   generic sport equipment. Never name a real team.
2. **Bake the colours into the generation.** These print via UV; recolouring a
   raster afterwards is painful.

---

## 2. The style block — paste this after every subject line

Keep it byte-identical across the set. Cohesion is the entire point of generating
a family in one hand, and a reworded style block is how a set drifts.

```
die-struck hard enamel pin, cloisonné style, polished gold metal borders and
raised metal linework separating every colour area, recessed enamel colour fill
polished flush with the metal, glossy enamel with a single soft specular
highlight, crisp hard edges, no gradients inside the enamel, no texture, no
fabric, no embroidery, no stitching, bold simple shapes readable at one inch,
symmetrical centred composition with a clear empty margin on every side, no part
of the object touching or crossing the edge of the image, straight-on top-down view,
flat lay product photograph, isolated on a solid pure magenta #FF00FF background,
no drop shadow, no reflection, no text, no lettering, no words, 1:1 square
```

**Changed 2026-09-27 (composition only):** "filling the frame" became "a clear empty
margin on every side…". The old phrase made the model run art off the canvas: the
palette's brush tips, the flask neck, the rings' straps and the medal ribbon were
sliced flat at the image edge IN THE SOURCE, and read on the frame as clipped by the
badge. The rendering words are untouched, so the set's look does not drift.

**Why magenta:** the in-house pipeline keys the backdrop out by chroma plane and
un-multiplies it from every partial-alpha pixel, so edges carry no matte. Magenta
is the furthest hue from anything in the palette, so nothing in the art keys away
with it. Never generate these on white — white is in the art.

**Why "no text":** Ideogram will happily letter a badge, and it will be subtly
wrong. Lettering, when we want it, is placed by the builder where it can be
spell-checked.

**Settings:** 1:1, highest resolution available, 4 variants per prompt. Keep the
seed of anything you like — the same seed with a new subject line is the cheapest
way to hold a set together.

---

## 3. A/B pieces — generate these FIRST

Direct twins of three badges that already exist as embroidered patches, so the
comparison is like-for-like rather than a new subject in a new style.

**Soccer**
```
a soccer ball, classic black and white pentagon panel pattern, navy blue and
white enamel, [STYLE BLOCK]
```

**Band**
```
a marching band trumpet seen from the side, gold enamel body with navy blue
enamel accents, [STYLE BLOCK]
```

**Honour roll**
```
a laurel wreath open at the top with a five-pointed star at its centre, gold
enamel wreath, navy blue enamel star, [STYLE BLOCK]
```

If these three do not clearly beat the embroidered versions on the frame at
actual size, stop here and keep embroidery.

---

## 4. The four SLUH pilot gaps

These chips are live on the SLUH page today and fall back to a generic crest.
Whichever style wins, these four have to be made.

**Racquetball**
```
a racquetball racquet crossed with a single ball, teardrop-shaped racquet head
with a strung face, navy blue enamel racquet, light blue enamel ball, gold metal
strings and frame, [STYLE BLOCK]
```

**Water polo**
```
a water polo ball resting in a curl of stylised water, ball with a simple
segmented panel pattern, yellow and navy blue enamel ball, light blue enamel
water, [STYLE BLOCK]
```

**Rugby**
```
a rugby ball standing upright on its point, visible lacing and seam, navy blue
enamel ball with white enamel lacing, gold metal seam lines, [STYLE BLOCK]
```

**Swim and dive**
```
a pair of swim goggles above three stylised water ripple lines, navy blue enamel
goggle strap, light blue translucent enamel lenses, gold metal frame, [STYLE
BLOCK]
```

---

## 5. If enamel wins — the wider list to regenerate

Tier 1, the activities common enough that most schools hit at least one:
cross country, wrestling, lacrosse, ice hockey, dance/drill team, gymnastics,
bowling, competitive cheer, esports, orchestra/strings, choir, jazz band,
journalism/newspaper, speech, quiz bowl, Model UN, ROTC, campus ministry.

Tier 2: crew/rowing, sailing, ski, weightlifting, colour guard, film, ceramics,
culinary, FFA, scouts.

Note the generic-only rule bites hardest here: DECA, FBLA, NHS and Mu Alpha Theta
are other organisations' registered marks and were withdrawn from the library for
that reason. Their generic stand-ins are the gavel (student government), the
laurel (honours) and the diploma (academics).

---

## 6. Print spec — the intake gate, unchanged

- **2000×2000 px** source, square.
- Clears **300 DPI at a 2×2 tile**: 1.982" × 300 = 595 px minimum after trimming
  to content. A 2000 px source trims comfortably clear.
- Cut to transparency through the chroma keyer, then trimmed to its own bounds so
  the art fills the tile rather than floating in padding.
- **The 1-inch test:** shrink it to 100 px and look. If the sport is not
  identifiable, the art is too detailed — regenerate simpler, do not sharpen.

---

## 7. Two badges the owner could not read — QUEUED, blocked on network egress

Both were spotted on the frame, not in the library, which is the only place this
kind of defect shows: a badge can be a perfectly good drawing of its subject and
still fail, because the test is not "is this accurate" but "does a parent in a
car park know what it is".

`api.ideogram.ai` is **not in this environment's egress allowlist** (403 from the
proxy), so neither could be regenerated here. Add the host in the environment's
network settings and these two prompts run as-is.

### volleyball — reads as a beach ball

The current art is a blue-and-white **pinwheel**. That is a fair drawing of a
modern rotary-panel ball, and it is unreadable: beside the soccer and basketball
badges, which are instantly what they are, it reads as an abstract logo. The
swirl is the model's prior for "volleyball", and §0's rule applies — do not argue
with a prior, remove what it attaches to. Two colours in a spiral is what makes a
beach ball, so the ball loses its second colour entirely and the only contrast
left is the gold seam.

```
a classic indoor volleyball, all-white enamel ball, three groups of three
straight parallel panel bands, gold metal seam lines separating the panels,
[STYLE BLOCK]
```

### color-guard — reads as a national flag

A rectangular flag flying horizontally from an upright pole is the shape of a
country's flag, and that is what it reads as. Colour guard's actual visual
language is a **swallowtail silk on a long pole held at a steep diagonal,
mid-spin**, and the spin is the part that carries the meaning — it is what makes
the object a performance prop rather than a national symbol. So the subject
changes from "a flag" to "a silk being spun".

```
a swallowtail silk flag on a long pole held at a steep diagonal, mid-spin, a
sweeping gold motion arc curving behind it, navy blue and light blue enamel silk,
gold metal pole and arc, [STYLE BLOCK]
```

Both must clear §6's one-inch test before they go in: shrink to 100 px and look.
That is the test the current pair fails.

### §7 resolution — 2026-08-02

Both regenerated and SHIPPED, via **Google Gemini image** (`gemini-2.5-flash-image`)
— the library's generator since the Ideogram egress block; see CLAUDE.md "Badge
art generation". The §7 prompts ran as written against the §2 style block.

Gemini note for the record: it lights the magenta sweep (backdrop magenta-ness
66–91 across six generations; prose instructions to flatten it changed nothing),
so the batch chroma keyer refuses its output BY DESIGN. The shipped cut-outs went
through the app's adaptive keyer instead: flatness 1.000, partial-alpha 0.85% /
3.68% with gold-ramping edges, 702px / 661px after trim. Both cleared the
one-inch test on navy.

---

## 8. Redraws — art cut off in the source (2026-09-27)

Found by Henry on the frame ("the artwork still sometimes gets clipped — the paint
brushes with palette"): the palette's brush tips were sliced flat at the image edge
in the SOURCE file (111 px of ink in column 0). The corner-fitting fix could not help,
because the missing paint is not in the file. A scan of every badge (a straight run of
40+ px of ink along an edge) flagged 23; by eye four are genuinely cut, the rest are
natural flat edges or tangent curves. Generator: Gemini (`scripts/gen-badge.mjs`), then
`npx vite-node scripts/process-badge.ts <name>`, which REFUSES art that touches the
image edge before trimming. Colours match the current badges.

**art** (Art Club)
```
an artist's painting palette with two slim paintbrushes crossed behind it, a
kidney-shaped palette with a thumb hole and five round paint wells in vermilion,
golden yellow, sky blue, green and white, brown enamel palette, both paintbrushes
complete with their bristle tips and handle ends fully inside the image, cut to the
silhouette of the subject, NOT inside a circle, disc, medallion or border
```

**science**
```
a chemistry Erlenmeyer flask with a rounded lip at the top of its neck, white enamel
glass with a teal enamel liquid and three small bubbles, the whole flask including
the lip of its neck fully inside the image, cut to the silhouette of the subject,
NOT inside a circle, disc, medallion or border
```

**gymnastics**
```
a pair of gold gymnastics rings hanging from two short navy blue enamel straps with
small gold buckles, the top of each strap finishing in a neat rounded end fully
inside the image, cut to the silhouette of the subject, NOT inside a circle, disc,
medallion or border
```

**medal**
```
a round gold medal with a navy blue enamel star at its centre, hanging from a short
V-shaped navy blue enamel ribbon whose top finishes in a neat straight end fully
inside the image with empty space above it, cut to the silhouette of the subject,
NOT inside a circle, disc, medallion or border
```

After picking winners: copy to `public/tiles/high-school/<name>.png`, run
`node scripts/light-enamel.mjs` (science, gymnastics and medal have ivory twins),
`npm run art:fit`, the test suite, and look at each on a light AND a dark school's
frame before shipping.


## 9. Library additions (2026-09-27) — winners in brackets

Run as `GEN_MODEL=gemini-3-pro-image GEN_SIZE=2K node scripts/gen-badge.mjs <name> 3 "<subject>"`,
every subject ending "the whole object fully inside the image, cut to the silhouette
of the subject, NOT inside a circle, disc, medallion or border".

- **flag-football** [#2]: an American football in brown enamel with white laces lying
  horizontally across a flag-football belt, two long bright gold enamel flags hanging
  down from the navy blue enamel belt on either side of the ball, the flags clearly
  visible and as prominent as the ball
- **pom** — first try read as gold FANS (rejected). Second [pomb #3]: two fluffy shaggy
  cheer pom-poms crossed at their handles, each pom-pom a big round ball of hundreds of
  thin wavy crinkled streamers in alternating white and navy blue enamel with gold
  metal outlines, the streamers fanning out in every direction so each pom-pom looks
  soft and bushy, short gold handles
- **health** [#1]: a doctor's stethoscope in navy blue enamel with gold metal fittings,
  its tubing curved into the shape of a heart, the round chest piece at the bottom of
  the heart, NO cross, NO red cross, NO medical symbol
- **business** [#1; #3 had a pink smear]: a navy blue enamel business briefcase with a
  gold handle and gold clasps, a bold gold upward-trending arrow rising diagonally in
  front of it
- **proud-family** [#1]: a big glossy red enamel heart with a small navy blue
  graduation mortarboard cap with a gold tassel sitting tilted on its top
