# School-Spirit Snappet Art — Sourcing & Ideogram Brief

Art for the SCHOOL builder (`/lab/school`). These are the premade "spirit
elements" a customer places on the left/right panels and resizes. Style leans
COLLEGIATE / VARSITY (moving toward the Project Foundry look), not the cartoon-
sticker seasonal sets — but built to the same die-cut print spec.

Two ways to get the art. Both must hit the same spec (§6), palettes (§3),
trademark rule, and piece list (§5) — only the SOURCE differs.

---

## 0. Two paths — and why FREE VECTOR is the smart default

**Option A — Free-sourced CC0 vector (RECOMMENDED for most pieces).**
If you source **SVG (vector)** art under a CC0 / public-domain license, one big
problem disappears: **recoloring becomes trivial.** Swap two fill colors and the
same star serves every school in its exact colors — which is precisely Foundry's
"derive from the school's two colors" goal, for free, with zero AI inconsistency
and no per-order cost. A vector star recolors to all 8 palettes (and any exact
school color) from ONE source file. This is better than generating 8 raster
variants. Prefer vector wherever the element is a clean shape (Groups A, B, D).

- **Where (verify the license on each file — licenses vary per asset):**
  SVG Repo (CC0 filter) · Openclipart (public domain) · Public Domain Vectors ·
  Reshot (free commercial, no attribution) · Wikimedia Commons (filter to PD/CC0).
- **Per-asset checklist before you use one:**
  - [ ] License is **CC0 or public domain** (not CC-BY — attribution is awkward on
        a physical frame; not "free for personal use")
  - [ ] It's a **generic element** — no real mascot/logo/trademark (§ rule 1)
  - [ ] **Vector (SVG)** if possible; if raster, ≥ 1000 px and clean
  - [ ] Flat, bold, thick shapes — passes the 1-inch readability test (§6)
  - [ ] Recolors cleanly to the palette (flat fills, not baked gradients/shadows)

**Option B — Generate with Ideogram.** Use for pieces free-sourcing can't cover
cohesively: the varsity-letter template, custom compositions, or when you want the
whole set in ONE hand so it reads as a system. Follows §§1–4 below.

**Quality bar is the same either way:** if a free asset doesn't clearly beat what
Ideogram would produce, generate it instead. "Free" never overrides "good."

> **Two hard rules, read first.**
> 1. **Trademark-safe — GENERIC ELEMENTS ONLY.** No real school mascots, logos,
>    crests, or wordmarks. We draw stars, pennants, trophies, laurels, blank
>    shields, generic varsity letters, sport balls. A blank shield in a school's
>    colors *reads as* that school without ever touching their trademark. Never
>    prompt "the Tigers" or any real team identity.
> 2. **Recolor by GENERATION, not post-hoc.** These print via UV — recoloring a
>    raster after the fact is painful. So bake the target colors into the prompt
>    and generate each element in the school-palette variants listed in §3.

---

## 1. Ideogram settings (use for every prompt)

- **Style type:** Design (flat graphic). **Magic Prompt:** OFF (keep control).
- **Aspect ratio by piece type:**
  - **Square icon** (places as 1×1 or 2×2): **1:1**, export **1200 × 1200**.
  - **Portrait hero** (places as 2×3 / 2×4 — mascot-scale trophy, pennant, letter):
    **2:3**, export **1024 × 1536**.
  - **Pattern/background tile** (fills empty snappets): **1:1**, export **1200 × 1200**
    (flat geometry, can be simpler).
- **Center rule:** N/A here — unlike the direct-print frame pack, these are
  ISOLATED snappet elements, not whole frames. Each fills its own square/rect.

## 2. STYLE suffix — append to EVERY prompt

> `Bold collegiate varsity spirit emblem, clean flat-vector style, thick confident
> outlines, two or three flat colors only, crisp geometric shapes, subtle 3D bevel
> or foil sheen on the main shape, high contrast, athletic/team aesthetic, die-cut
> sticker construction, centered, full-bleed, reads clearly from 15 feet, plain
> solid white background.`

Notes to hold the look consistent:
- **Flat + one accent of shine** — a single top gloss or bevel, never a busy
  gradient. (This mirrors Foundry's "one-catch discipline" on its metal type.)
- **Thick shapes, strong silhouette, NO thin lines or fine detail** — printed at
  ~1 inch on a car, fine detail vanishes.

## 3. Color handling (the recolor strategy)

Generate each element **once per common HS palette**. These eight cover the large
majority of American high schools:

| Palette | Primary | Accent |
|---|---|---|
| Navy / Gold | `#0B1F3A` | `#C8A951` |
| Cardinal / White | `#A41C28` | `#FFFFFF` |
| Royal Blue / White | `#1D4ED8` | `#FFFFFF` |
| Forest Green / Gold | `#14532D` | `#E0B84C` |
| Purple / Gold | `#5B2A86` | `#E0B84C` |
| Maroon / Gold | `#6B2131` | `#CFB53B` |
| Black / Vegas Gold | `#151515` | `#C5B358` |
| Orange / Navy | `#E36414` | `#0B1F3A` |

In each prompt, replace `[PRIMARY]` / `[ACCENT]` with a palette's two hexes (or
their plain-English names — Ideogram reads "navy blue and metallic gold" well).
Exact per-school color matching is a later engine job (Foundry derives it from two
colors); this library gets us "close enough" instantly.

## 4. NEGATIVE / Exclude field (every prompt)

> `text, letters, words, real school name, real team logo, trademark, mascot
> likeness of a real team, watermark, signature, realistic photo, 3d render,
> cluttered background, busy background, drop shadow on background, gradient
> background`

*(Exception: the "varsity letter" and "pennant" pieces below DO want a single
generic letter — remove `letters` from their exclude field for those only.)*

---

## 5. The pieces

### Group A — Core spirit icons (square 1:1) · the workhorses

1. **STAR** — A bold five-point star, [ACCENT] with a [PRIMARY] outline and a
   single top gloss. Clean, symmetrical, iconic.
2. **PENNANT** — A classic triangular felt school pennant on a short pole, [PRIMARY]
   flag with an [ACCENT] stripe along the top edge, gentle wave.
3. **MEGAPHONE** — A cheerleader megaphone pointing up-right, [PRIMARY] body with
   [ACCENT] bands, small motion lines.
4. **TROPHY** — A two-handled championship trophy, [ACCENT] gold cup on a [PRIMARY]
   base, subtle shine on the bowl.
5. **LAUREL WREATH** — Two symmetric laurel branches meeting at the bottom forming an
   open circle, [ACCENT], simple leaves (thick, not fine).
6. **SHIELD (blank)** — A clean heraldic crest shield, [PRIMARY] field split by an
   [ACCENT] chevron, empty center (schools read their own identity into it).
7. **RIBBON ROSETTE** — A prize rosette: pleated round [ACCENT] medallion with two
   [PRIMARY] ribbon tails hanging below.
8. **LIGHTNING BOLT** — A single bold athletic lightning bolt, [ACCENT] with a
   [PRIMARY] keyline, energetic angle.
9. **FLAME** — A stylized single flame/torch, [ACCENT] over [PRIMARY], bold simple
   tongues (spirit/energy motif).
10. **CROWN** — A simple five-point crown, [ACCENT] gold with [PRIMARY] jewels,
    homecoming/royalty motif.
11. **WREATH BURST / FIREWORK** — A symmetric starburst, [ACCENT] rays on a [PRIMARY]
    core, celebratory.
12. **PAW PRINT (generic)** — A generic animal paw print (NOT any specific mascot),
    [PRIMARY] with an [ACCENT] outline. Covers the huge "we're the [animal]" market
    generically.

### Group B — Sport balls (square 1:1) · one flat style, recolored trim

13. **FOOTBALL** — A classic football, brown leather with white laces, small [ACCENT]
    accent stripe. (Balls keep their real colors; add a school-color accent band.)
14. **BASKETBALL** — Orange basketball, black seams, [ACCENT] accent ring.
15. **SOCCER BALL** — Classic black-and-white soccer ball, [ACCENT] accent ring.
16. **BASEBALL** — White baseball, red stitching, [ACCENT] accent ring.
17. **VOLLEYBALL** — White/[ACCENT] volleyball, clean panel lines.

### Group C — Varsity typographic (portrait 2:3) · remove `letters` from exclude

18. **VARSITY LETTER** — A single bold blank collegiate varsity block letter tile
    (chenille-patch look), [PRIMARY] letter with an [ACCENT] felt border and a small
    [ACCENT] service stripe. Generate as a template the customer picks their letter
    for — supply A, and note the set repeats for common initials.
19. **CHEVRON STRIPES** — Stacked athletic service chevrons (like sergeant stripes),
    [ACCENT] on [PRIMARY], tall portrait format for the side panel.

### Group D — Pattern / background tiles (square 1:1) · fill empties

20. **DIAGONAL STRIPES** — 45° [PRIMARY]/[ACCENT] diagonal stripes, even, edge-to-edge.
21. **CHEVRON PATTERN** — Repeating [PRIMARY]/[ACCENT] chevrons.
22. **HALFTONE FADE** — [ACCENT] halftone dots fading over a [PRIMARY] field.
23. **STAR FIELD** — Scattered small [ACCENT] stars on [PRIMARY], even spacing.
24. **PINSTRIPE** — Fine [ACCENT] pinstripes on [PRIMARY] (varsity-jersey feel).

---

## 6. Art spec (matches the tile brief — non-negotiable for print)

| Spec | Value |
|---|---|
| **Format** | PNG-24 **with transparency** (alpha) |
| **Full bleed** | Fill the whole tile face edge-to-edge |
| **Safe zone** | Keep critical detail ~8% (≈95 px on 1200²) in from the edges — the press can clip the outer edge |
| **Readability** | Seen at ~1–3 inch on a moving car — thick shapes, strong silhouette, no thin lines |
| **Background** | Bake the element's field color IN. Where the PNG is transparent, the printer lays NO ink and the white snappet shows through — use transparency intentionally (a die-cut shape), not as a default backdrop |

## 7. Filenames & folders

Lowercase, hyphenated, palette suffix. Folder `/public/tiles/school/`:

```
star--navy-gold.png   star--cardinal-white.png   ...(8 palettes)
pennant--navy-gold.png   ...
trophy--navy-gold.png   ...
paw--navy-gold.png   ...
football--navy-gold.png   ...
varsity-letter-a--navy-gold.png   ...
pattern-stripes--navy-gold.png   ...
```

Portrait pieces get a `-2x3` note in review but keep the same naming. Exact set-id
wiring (a new `school` set in `src/data/sets/`) is a ~10-min code change once art lands.

## 8. Done = for the set

- [ ] Groups A–D drawn to spec (≈24 elements × chosen palettes)
- [ ] At least the 3 highest-traffic palettes done first (Navy/Gold, Cardinal/White,
      Royal/White) so we can demo end-to-end
- [ ] Transparent PNG, full-bleed, named exactly, in `/public/tiles/school/`
- [ ] Quick check at 1 inch and on a mock panel in `/lab/school`

## 9. Priority (generate these first for a working demo)

STAR · PENNANT · TROPHY · PAW · SHIELD · FOOTBALL · VARSITY-LETTER · STRIPES —
in Navy/Gold and Cardinal/White. Eight elements × two palettes = 16 images gets a
believable side panel on screen for the first school demo (Parkway West = cardinal +
Columbia blue, which maps to the Cardinal/White palette closely).
