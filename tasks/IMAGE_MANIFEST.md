# Festive Frames — Image Manifest (Missouri-aware, credit-efficient)

Brand look: vintage American summer, roadside Americana meets modern product brand.
Palette: deep navy, warm cream, signal red, a little gold. Clean, not clip-art.
LOCAL LAUNCH: St. Louis, July 4. Lean Missouri / Midwest where it reads naturally.
TRADEMARK: no pro team names/logos/slogans, team-neutral only.

## READ FIRST — don't waste Ideogram credits
- **Ideogram is BAD at license plates** (garbled text, wrong state design). Never ask it for an
  accurate "Missouri plate." For any lifestyle shot, tell it the plate is **blank, blurred, or out
  of focus** so it doesn't try.
- **Plate-accurate or product-accurate shots = REAL photos.** You have the real frame and a real
  Missouri plate in St. Louis. One good phone photo on a clean background beats 20 AI tries.
- The `/build` designer already shows a real **Missouri** plate, so local buyers see Missouri there.

## Priority — make ONLY these to launch (everything else is post-launch)
- **MUST-HAVE:** 6 kit-card photos (real) + 1 hero. That's a launchable site.
- **NICE-TO-HAVE:** 1-2 gallery lifestyle shots, logo wordmark.
- **POST-LAUNCH (don't make now):** booth shot, event/trust-strip photos (real, after July 4).

## I (Claude) generate in code — you do NOT need Ideogram for these
QR codes, the 1200x630 social/OG image, textures, favicon/wordmark fallback.

## MUST-HAVE 1 — Kit cards (6 images, 800x1000 = 4:5 portrait)
The card shows each kit's NAME + tagline as text already, so the image only needs the right
THEME + COLORS (don't rely on legible tile words; Ideogram garbles small text). Keep all 6 in the
SAME framing as the hero so they read as a family. Save to public/kits/<id>-thumb.jpg.

SHARED STYLE (paste at the end of every kit prompt):
"Tight vertical 4:5 crop centered on the license plate and its snap-on decorative tile frame; the
dark car body fills the soft out-of-focus background. The tile border is uniform SQUARE tiles with
sharp 90-degree corners around a white Missouri Bicentennial plate reading 'FESTIVE' in bold blue.
Golden-hour St. Louis light, VINTAGE PRINT color grade with warm film grain and slightly faded tones,
deep navy / warm cream / signal red / a little gold, premium product photography, no car-brand
emblems, no team logos."

PER-KIT THEME (prepend before the shared style):
- american-classic-thumb.jpg: "The tile border is classic red, white and blue: five-point stars, stripes, and firework rosettes."
- merica-mode-thumb.jpg:      "The tile border is bold, fun, weathered patriotism: distressed American flags, eagles, and stars in red, white and blue."
- stl-pride-thumb.jpg:        "The tile border is red and navy with hometown-pride motifs: stars and a subtle Gateway-Arch shape (no team logos)."
- game-day-thumb.jpg:         "The tile border is a bold sporty pattern in red, navy and white: stars and chevrons, team-neutral, no logos."
- family-ride-thumb.jpg:      "The tile border is playful and warm: red, white and blue stars and stripes, friendly family feel."
- july-4-limited-thumb.jpg:   "The tile border is firework-heavy red, white and blue with gold accents and a small '2026' detail, premium limited-edition feel."
(Optional larger 1200x1500 of american-classic -> public/kits/american-classic-hero.jpg)

ALTERNATIVE (max accuracy, no credits): build each kit in the /build designer and use its PNG
export — pixel-accurate to the real product. More manual, but the truest representation.

## MUST-HAVE 2 — Homepage + /buy hero
public/season/july4-2026-hero.jpg — 2400x1350 (16:9). Current draft (KIzRXUo6VT...@2k.webp) is
APPROVED for vibe; regenerate with these two fixes:
  1. The license plate reads "FESTIVE" in bold BLUE vanity-plate letters on a white plate.
  2. The four CORNER tiles are square with sharp 90-degree corners (NOT rounded); the rest of
     the border tiles stay as uniform squares.
IDEOGRAM PROMPT:
"Rear three-quarter view of a clean black SUV in warm late-afternoon Midwest summer light, suburban
St. Louis street, focus on the license plate area where a decorative snap-on plate frame is
installed with red, white and blue star and firework tiles around the border. The border tiles are
uniform squares and the FOUR CORNER tiles have sharp square 90-degree corners (not rounded). The
white license plate clearly reads 'FESTIVE' in bold blue vanity-plate letters. Vintage Americana
color grade, deep navy and warm cream tones, signal red accents, soft film grain, premium
product-brand photography, shallow depth of field, no team logos."

## NICE-TO-HAVE — Gallery lifestyle (~1200x900, public/gallery/)
Ideogram OK for these (mood, plate kept blank/blurred):
1. gallery/tile-swap.jpg — "Hands swapping a small square tile on a car's plate frame outdoors,
   Midwest summer daylight, casual lifestyle, warm Americana tones, plate blank/out of focus,
   no text, no team logos."
2. gallery/on-car.jpg — "Decorated license plate frame on the back of a parked car at a St. Louis
   summer cookout, bokeh string lights, red white and blue tiles, nostalgic American summer mood,
   plate blank/blurred, no team logos."
Better as REAL macro photo (Ideogram struggles with the snap detail):
3. gallery/snap-macro.jpg — close-up of a tile clicking onto the frame rail (shoot real).

## Logo wordmark (plate-integrated, vintage) -> public/brand/wordmark.png (transparent, ~1200x400)
IDEOGRAM PROMPT:
"Vintage American roadside badge logo for FESTIVE FRAMES with an integrated license plate. The word
'FESTIVE' is embossed as the large plate number across a cream US license plate; 'FRAMES' runs along
the plate's top state-name strip. Mid-century 1950s-60s diner and route-sign style, thick rounded
license-plate border with two bolt-hole dots, deep navy lettering, warm aged-cream plate face,
signal-red pinstripe accents, a single gold star, distressed worn-ink texture with subtle halftone,
clean flat vector, transparent background, no extra words."
Variation to try: same but the whole logo IS a vintage license plate (badge-only, no separate banner).

## After you drop files
Tell me and I'll swap the placeholder slots for next/image with correct dimensions and alt text.
