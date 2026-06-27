# Direct-Print Frame — Ideogram Prompt Pack (Top 6 predicted sellers)

Internal V2 concept art. Generate, drop into `/public/lab/direct-print/<id>.png`,
review in `/lab/direct-print`.

## Ideogram settings (use for every prompt)
- **Style type:** Design (flat graphic). **Magic Prompt:** OFF (keep control).
- **Aspect ratio — BASE:** 16:9 (or custom **1856×1000** ≈ 1.85:1 frame).
- **Aspect ratio — WINGED:** custom **~2064×800** (≈ 2.58:1) or 21:9. Wider = the wings.
- **Center rule (critical):** leave a clean, empty, centered ~2:1 rectangle for the
  license plate. Art lives in the BORDER RING + the wider BOTTOM. Side panels = wings.

## STYLE suffix — append to EVERY prompt
> `Bold flat-vector cartoon sticker art, thick uniform black outlines, vibrant saturated colors, simple cel shading, high contrast, die-cut sticker look, plain solid white background, symmetrical, reads clearly from 15 feet away.`

## NEGATIVE / Exclude field (every prompt)
> `text, letters, numbers, words, watermark, signature, realistic photo, 3d render, cluttered or filled center, anything covering the center rectangle, busy background`

---

### 1. CHOMP — goofy monster (flagship gag)
*Why it sells: instant haha, pareidolia, broad, evergreen-moldable.*

**Base:** A friendly goofy cartoon MONSTER face as a rectangular license-plate frame: a thick chunky border around a large empty centered rectangle (~2:1, kept completely plain — it's for a license plate). Two big round googly eyes with tiny pupils in the top corners. A row of white triangular teeth lining the inside top and bottom edges of the center hole like a wide grin. A pink tongue across the wider bottom border. Bright lime-green skin with darker spots.

**Winged:** Same goofy green monster frame, EXTRA WIDE, with two curved monster HORNS extending out on the far-left and far-right side panels.

---

### 2. YOU, FRAMED — caricature head (personalized, per-order print)
*Why it sells: "that's literally my face on my car" — the share-magnet. Note: production cartoonizes the buyer's uploaded selfie into this scaffold; this generates a sample.*

**Base:** A friendly cartoon CARICATURE of a person's head as a rectangular license-plate frame: thick border around a large empty centered ~2:1 rectangle (kept plain — for a license plate). Two big expressive eyes with raised eyebrows in the top corners; the center hole framed by an open smiling mouth with teeth along its top and bottom edges; a rounded chin on the wider bottom border; simple hair along the top edge; single flat skin tone, exaggerated and likeable.

**Winged:** Same caricature-head frame, EXTRA WIDE, with two cartoon HANDS coming in from the far-left and far-right side panels throwing peace signs beside the face.

---

### 3. CO-PILOT — dog face (identity; huge market; many ear-SKUs)
*Why it sells: dog people + car owners overlap massively; ear/fur color = endless SKUs.*

**Base:** A cute cartoon DOG face as a rectangular license-plate frame: thick border around a large empty centered ~2:1 rectangle (kept plain — for a license plate). Two big friendly dog eyes in the top corners, a black dog nose at top center above the hole, an open panting mouth framing the hole with a pink tongue draping over the wider bottom border, paws resting on the bottom corners. Golden-tan fur.

**Winged:** Same cartoon dog-face frame, EXTRA WIDE, with two big floppy DOG EARS hanging down the far-left and far-right side panels.
*(SKU variants: swap ear shape + fur color → lab, husky, dachshund, frenchie, etc.)*

---

### 4. T-REX — tiny arms (gag; the wings ARE the joke)
*Why it sells: the comically tiny arms on a wide frame is a guaranteed laugh.*

**Base:** A cartoon green T-REX dinosaur head as a rectangular license-plate frame: thick border around a large empty centered ~2:1 rectangle (kept plain — for a license plate). Two fierce cartoon dino eyes in the top corners, rows of big white teeth lining the inside top and bottom edges of the hole like roaring jaws, green scaly skin, nostrils at top center.

**Winged:** Same cartoon T-rex frame, EXTRA WIDE, with two comically TINY little T-rex arms sticking out of the far-left and far-right side panels (exaggeratedly small for humor).

---

### 5. ANGEL vs DEVIL — split (your left-vs-right; literal wings)
*Why it sells: universally relatable, bold from a distance, the wings pay off perfectly.*

**Base:** A split cartoon design as a rectangular license-plate frame: thick border around a large empty centered ~2:1 rectangle (kept plain — for a license plate). LEFT half heavenly — white and gold, a glowing halo arcing over the top-left, soft clouds. RIGHT half devilish — red and black, two horns over the top-right, flames. The halves meet at top center and across the wider bottom border. Bold symmetrical contrast.

**Winged:** Same angel-vs-devil frame, EXTRA WIDE, with a white feathered ANGEL WING on the far-left side panel and a red BAT WING on the far-right side panel.

---

### 6. TURBO SNAIL — JDM car culture (identity; perfect audience match)
*Why it sells: the buyer is literally a car owner; car-culture in-jokes convert hard.*

**Base:** A cartoon JDM "turbo snail" car-culture design as a rectangular license-plate frame: thick border around a large empty centered ~2:1 rectangle (kept plain — for a license plate). A cute determined cartoon snail mascot in the top-left corner with a turbocharger on its shell, speed/wind lines wrapping the top border, a checkered-flag pattern along the wider bottom border, bright racing colors.

**Winged:** Same turbo-snail frame, EXTRA WIDE, with two chrome EXHAUST PIPES popping little flames out of the far-left and far-right side panels.

---

## Workflow
1. Generate base + winged for each (12 images). Pick the best of ~4 variations each.
2. Name exports `chomp.png`, `you.png`, `copilot.png`, `trex.png`, `angeldevil.png`,
   `turbosnail.png` (+ `-wings` suffix for winged) and drop in
   `/public/lab/direct-print/`.
3. I wire the asset-driven loader → team reviews REAL art in `/lab/direct-print`.
