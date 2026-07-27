# School Tile Art — Ideogram Prompt Library (photoreal / 3D)

A ready-to-run prompt list for the `/lab/school` tile library. Every prompt here is
built against the numbers the builder and the print path actually use, so output
drops in **without a repair pass**.

This supersedes nothing — `school-spirit-ideogram-brief.md` covers the flat collegiate
vector set and its free-sourcing path. This file is the **photoreal, dimensional,
trophy-grade** tier: art that reads as a machined object sitting in the frame rather
than a sticker printed on it.

Two footprints, because the builder has two and they break differently:

| Name | Cells | Inches | Pixels @300 DPI | Ideogram aspect |
|---|---|---|---|---|
| **Square badge** | 2 × 2 | 1.982 × 1.982 | 595 × 595 | `1:1` |
| **Portrait badge** | 1 wide × 2 tall | 0.991 × 1.982 | 297 × 595 | `1:2` |

---

## 1. The hard spec — these are not preferences

Numbers are from the code, not from taste. File references so they can be rechecked
when the code moves.

**Resolution.** Generate at the largest size Ideogram offers and downsample; never
upscale. Minimum useful is 595 px on the long edge, but generate **2048 px** square /
**1024 × 2048** portrait so there is headroom for cropping and so the QC gate reports
300 DPI rather than "prints, but softer". `MIN_DPI = 150`, `TARGET_DPI = 300`
(`src/lib/utils/artwork-qc.ts:75`).

**Background: generate ON the field colour. Do not generate on white and key it out.**
This is the single most important line in this document. The most common defect in the
current library is a **matte fringe** — art composited against white, then cut out,
leaving edge pixels that ramp toward the matte instead of the art. Our own QC detects
it (`MATTE_DISTANCE = 45`, `artwork-qc.ts:81`) and can sometimes repair it, but it
declines on multi-colour art and then the halo ships.

Generating directly on the field colour removes the keying step, so there is no edge
to fringe. Use the exact hex (`src/lib/utils/tile-theme.ts:17`):

| Field | Hex | Use for |
|---|---|---|
| **Navy** (default) | `#1B2A4A` | almost everything — light, bright, metallic art |
| White | `#FFFFFF` | art that is itself dark: black ink, navy type, dark silhouettes |
| Blue | `#2C5AA0` | variety within the scheme, sparingly |
| Crimson | `#9E1B32` | accent, rarely |

Put the hex **in the prompt** and repeat it at the end. Models drift; saying it twice
holds it.

> The QC gate will flag these as `background-opaque`. That warning exists to catch a
> customer uploading a JPEG with a white box around it. Library art authored to the
> field is the intended exception — approve it and move on.

**Safe area: keep everything inside the central 82%.** The badge draws a brass rim, a
bevel and a breath of air over the top of the art. `chromeInset` reserves
`0.032 + 0.028 + 0.055 + 0.035 = 0.15` of **one cell**
(`tile-theme.ts:364`) — about 7.5% per side on a 2 × 2 badge. Art that runs to the
edge gets its edge eaten by chrome. Ask for "generous even margin, subject fully
inside frame, nothing cropped by the edge".

**Light from the upper left.** The frame's own bevel and brass both run their gradient
along an upper-left axis (`bevelAxis`, `tile-theme.ts`). Art lit from the right fights
the frame and the whole tile reads as a composite. Every prompt below says **"key light
from upper left, soft fill lower right"**. Keep it.

**No text, ever.** The banners carry the words. Ideogram will volunteer lettering into
almost any sports prompt unless told not to — the negative block in §3 is not optional.

**Readable at two inches.** The badge is smaller than a credit card. One subject, bold
silhouette, high contrast against the field, no fine linework, no busy backgrounds. If
you squint and it turns to mush, it is wrong regardless of how good it looks at 100%.

---

## 2. House style block — prefix every prompt with this

```
Professional 3D product render of {SUBJECT}, single hero object centered on a solid
#1B2A4A deep navy background. Photorealistic studio lighting, key light from upper
left with soft fill from lower right, subtle contact shadow beneath the object.
Materials read as premium physical goods: polished gold and brushed silver metal,
deep enamel, fine pebbled leather, clean matte plastic. Slight rim light along the
top-left edge to separate the object from the field. Bold simple silhouette that
stays readable at two inches. Generous even margin, subject fully inside frame,
nothing touching or cropped by the edge. Rich saturated color, crisp micro-detail,
shallow specular highlights, no motion blur. Solid flat #1B2A4A background, no
gradient, no vignette, no scenery.
```

Swap `#1B2A4A` for `#FFFFFF` on the white-field pieces (marked ⬜ below) and change
"deep navy" to "clean white".

## 3. Negative block — append to every prompt

```
--no text, letters, words, numbers, typography, watermark, signature, logo,
trademark, brand name, jersey number, scoreboard, human faces, hands, crowd,
background scenery, floor, table, horizon line, gradient background, vignette,
drop shadow on background, border, frame, picture frame, rounded corner card,
sticker outline, white halo, glow outline, multiple objects, collage, grid,
duplicate subject, tilt-shift, heavy bokeh, lens flare, grain, noise
```

Three of those earn their place specifically:
- **`border, frame, picture frame, rounded corner card, sticker outline`** — the model
  loves drawing a badge *around* the subject. We already draw the badge. Two badges
  nested is the single most common unusable output.
- **`white halo, glow outline`** — a painted-on halo survives every de-matte routine we
  have, because it is real art, not a compositing artifact.
- **`multiple objects, collage, grid`** — at two inches, two objects is zero objects.

---

## 4. Square badges — `1:1`, 2048 × 2048

Round, radial and compact subjects. These fill a square and die in a tall crop.

| # | Piece | Subject clause |
|---|---|---|
| 1 | Basketball | `a single basketball, deep pebbled orange leather with crisp black seams, angled three-quarter view` |
| 2 | Football | `an American football, rich brown pebbled leather, white laces and stripes, angled three-quarter view` |
| 3 | Soccer | `a soccer ball, clean white and black panels with soft stitched seams, angled three-quarter view` |
| 4 | Volleyball | `a volleyball, white and navy panels with visible stitched channels, angled three-quarter view` |
| 5 | Baseball | `a baseball, bright white leather with deep red raised stitching, angled three-quarter view` |
| 6 | Softball | `a softball, optic yellow leather with red raised stitching, angled three-quarter view` |
| 7 | Tennis | `a tennis ball resting against the head of a modern racquet, fluorescent yellow felt, taut white strings` |
| 8 | Golf | `a golf ball on a wooden tee beside a polished chrome driver head, dimpled white surface` |
| 9 | Wrestling | `a pair of crossed polished gold wrestling headgear straps over a laurel disc` |
| 10 | Swimming | `a chrome swim goggle pair and a single stylized water droplet, glass lenses catching the key light` |
| 11 | Track | `a polished gold running spike shoe in three-quarter view, sculpted sole plate` |
| 12 | Cheer | `a pair of crossed cheer pom-poms, metallic navy and gold strands, dense and voluminous` |
| 13 | Robotics | `a friendly compact robot head, brushed aluminium shell with glowing cyan optic, front three-quarter view` |
| 14 | Chess | `a single chess knight piece, carved polished black stone with a soft specular sheen` ⬜ |
| 15 | Drama | `a pair of overlapping comedy and tragedy theatre masks, glazed gold ceramic` |
| 16 | Photography | `a classic camera body, black leather wrap and chrome trim, lens facing the viewer` ⬜ |
| 17 | Science | `a laboratory flask with a faceted crystal stopper, clear glass with a teal liquid` |
| 18 | Art club | `a painter's palette with three thick dabs of oil paint and two crossed brushes` |
| 19 | Music | `a polished brass trumpet bell facing the viewer at a three-quarter angle` |
| 20 | Honor society | `a gold laurel wreath ring enclosing a faceted star, high polish` |
| 21 | Medal | `a circular gold medal on a short navy ribbon, milled edge, blank face` |
| 22 | Star | `a single faceted five-pointed star in polished gold, dimensional bevelled faces` |
| 23 | Crest | `a heraldic shield in deep enamel and gold, smooth blank face, no device` |
| 24 | Rosette | `a pleated award rosette in navy and gold satin with a gold center boss` |

## 5. Portrait badges — `1:2`, 1024 × 2048

**Different subjects, not the same subjects letterboxed.** The renderer uses
`objectFit: contain`, so a square image dropped in a 1 × 2 tile keeps its aspect and
leaves dead bands top and bottom. Portrait art must be natively tall: things that
stand, hang, rise or pour.

| # | Piece | Subject clause |
|---|---|---|
| 25 | Championship trophy | `a tall two-handled championship trophy on a stepped base, polished gold with a brushed silver cup, standing upright and filling the tall frame` |
| 26 | Torch | `a lit ceremonial torch standing upright, polished gold handle with a warm sculpted flame` |
| 27 | Pennant | `a long tapered felt school pennant hanging vertically from a wooden dowel, deep navy felt with gold trim` |
| 28 | Varsity letter | `a chenille varsity letter patch hanging vertically, thick navy wool with a gold felt border and a hanging cord` |
| 29 | Bowling pin trophy | `a tall slender award column with a faceted crystal top on a gold base, standing upright` |
| 30 | Megaphone | `a cheer megaphone standing on its end, glossy navy enamel body with a polished gold rim` |
| 31 | Baseball bat | `a single wooden baseball bat standing upright, warm maple grain with a lacquered barrel` |
| 32 | Hockey stick | `a single field hockey stick standing upright, laminated wood with a taped grip` |
| 33 | Marching band | `a marching band shako hat standing upright with a tall gold plume, navy felt and a polished chin strap` |
| 34 | Graduation | `a rolled diploma tied with a navy ribbon, standing upright, cream parchment` ⬜ |
| 35 | Cross country | `a tall course marker flag on a slim pole, navy pennant with gold trim` |
| 36 | Swim | `a tall thin trophy column topped with a sculpted gold wave crest` |
| 37 | Debate | `a polished wooden gavel standing upright on its sound block, warm walnut with a brass band` ⬜ |
| 38 | Yearbook | `a hardbound book standing upright on its spine, deep navy cloth cover with gold foil edging` ⬜ |
| 39 | Robotics arm | `a slim articulated robotic arm standing upright, brushed aluminium segments with cyan accents` |
| 40 | Laurel column | `a tall fluted stone column wrapped in a gold laurel vine, standing upright` |

⬜ = generate on **white** `#FFFFFF`, not navy — the subject is itself dark and would
disappear into the navy field.

---

## 6. Assembling one prompt

Concatenate: **§2 house block** (with `{SUBJECT}` replaced) + **§3 negative block**.
Worked example, piece #25:

```
Professional 3D product render of a tall two-handled championship trophy on a
stepped base, polished gold with a brushed silver cup, standing upright and filling
the tall frame, single hero object centered on a solid #1B2A4A deep navy background.
Photorealistic studio lighting, key light from upper left with soft fill from lower
right, subtle contact shadow beneath the object. Materials read as premium physical
goods: polished gold and brushed silver metal, deep enamel, fine pebbled leather,
clean matte plastic. Slight rim light along the top-left edge to separate the object
from the field. Bold simple silhouette that stays readable at two inches. Generous
even margin, subject fully inside frame, nothing touching or cropped by the edge.
Rich saturated color, crisp micro-detail, shallow specular highlights, no motion
blur. Solid flat #1B2A4A background, no gradient, no vignette, no scenery.

--no text, letters, words, numbers, typography, watermark, signature, logo,
trademark, brand name, jersey number, scoreboard, human faces, hands, crowd,
background scenery, floor, table, horizon line, gradient background, vignette,
drop shadow on background, border, frame, picture frame, rounded corner card,
sticker outline, white halo, glow outline, multiple objects, collage, grid,
duplicate subject, tilt-shift, heavy bokeh, lens flare, grain, noise
```

Settings: aspect `1:2`, highest quality/render tier available, magic prompt **off**
(it rewrites the background and lighting clauses, which are the two doing the work).

---

## 7. Accept / reject, before anything reaches the builder

Reject and regenerate rather than repair — a regeneration is a minute, a bad tile is
forever. In order of how often each one bites:

1. **A second badge.** The model drew a rounded card, ring or border around the
   subject. Unusable — we draw the badge.
2. **Text.** Any lettering at all, including on a jersey or a scoreboard.
3. **Background is not flat.** Sample three corners; if they are not all the exact
   field hex, the model added a gradient or vignette and it will band on the print.
4. **Subject touches an edge.** Anything in the outer ~8% gets eaten by the rim.
5. **Lit from the right.** Check the highlight is on the upper-left face.
6. **Mush at size.** View it at 2 inches on screen (roughly 190 px on a laptop). If
   the subject stops reading, it is too detailed.

Then run the existing gate. `analyzeArtwork` (`src/lib/utils/artwork-qc.ts`) reports:

| Code | What it means here |
|---|---|
| `resolution-low` / `resolution-marginal` | you generated too small, or cropped too hard — regenerate |
| `background-opaque` | **expected** for this tier; it is authored to the field |
| `matte-fringe` | you keyed something out. Go back and generate on the field colour |
| `palette-quantized` | the file went through a lossy step; re-export from source |
| `near-empty` | the crop lost the subject |

## 8. Trademark

Every prompt above is a **generic object** on purpose — a trophy, a ball, a laurel.
None of them names or resembles a school, a league, a brand or an organisation.

Keep it that way. Real club and organisation marks — DECA, FBLA, NHS, Mu Alpha Theta,
FCA and the rest — belong to those organisations, and generating a look-alike is worse
than using the real one, not better. Those pieces stay a licensing question, not a
prompt.
