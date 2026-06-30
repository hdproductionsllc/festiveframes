# Festive Frames — Tile Artwork Brief (for Becky)

Goal: bring the hidden seasonal/evergreen tile sets up to the **4th of July
quality bar** so we can surface them in the builder. Today every set except
July 4th uses generic emoji as placeholder art — Becky replaces those with
original die-cut "snappet" stickers, matching the July 4th look.

Nothing here is live until the art lands and we flip it on. Take your time —
refined beats fast.

---

## 1. The art spec (applies to every tile)

| Spec | Value |
|---|---|
| **Canvas** | 1200 × 1200 px, perfectly square (matches your July 4th tiles) |
| **Format** | PNG-24 **with transparency** (alpha) |
| **Resolution** | 1200 px square is plenty — the printed tile is ~1 inch |
| **Style** | Bold, flat, high-contrast **die-cut sticker** — same family as the July 4th set |
| **Full bleed** | Fill the whole square edge-to-edge. The sticker = the entire tile face |
| **Safe zone** | Keep critical detail ~8% (≈95 px) in from the edges — the outer edge can clip slightly on press |
| **Readability** | It's seen at ~1 inch on a moving car. Thick shapes, strong silhouette, no thin lines or fine detail (they vanish) |
| **Background** | Bake the tile's background color **into** the art (like the July 4th flags on white). What you draw is exactly what prints |

> Why transparency still matters: where the PNG is transparent, the printer lays
> **no ink** and the white snappet shows through. So a transparent area = white.
> Use it intentionally (e.g. a die-cut shape on a white tile).

**Filenames:** lowercase, hyphenated, **exactly** the names listed below
(they're already wired into the app). Drop finished files into the matching
`/public/tiles/<set>/` folder.

---

## 2. Each set also needs ~8 "pattern" tiles

The July 4th set isn't just icons — it has geometric **pattern/background**
tiles (stripes, chevrons, halftone, bursts) that make a finished frame look
*designed* instead of a row of icons. Every set needs its own ~8, in that
set's palette. These can be simpler/flatter (600 × 600 px is fine — flat
geometry scales cleanly). Examples: diagonal stripes, chevrons, polka dots,
halftone, a seasonal motif repeat.

---

## 3. Definition of "done" for a set

- [ ] All icon tiles below drawn to spec
- [ ] ~8 pattern/background tiles in the set palette
- [ ] **≥ 30 printable tiles total** (icons + patterns); solids are already done in code
- [ ] Files named exactly as listed, placed in `/public/tiles/<set>/`
- [ ] Quick visual check at 1 inch and on a mock plate

(Then we repoint the set from the emoji CDN to the local files and surface it —
a small code change on our side, ~10 min per set.)

---

## 4. Priority order & tile lists

### 🥇 Military & Veteran  (fastest win — partly done)
Strongest year-round seller. You've already drawn 9 of these (1024² — bump new
ones to 1200²). **Folder:** `/public/tiles/military-realistic/`
**Palette:** OD Green `#4B5320` · Navy `#000080` · Desert Tan `#C3B091` ·
Black `#1C1C1C` · Service Gold `#CFB53B` · Dress White `#F5F5F0`

Already drawn: `anchor, eagle, flag, helicopter, medal, purple-heart, shield, star, swords`
Still needed (to reach a full ~16-icon set):
`gold-medal, glowing-star (gold star), airplane (aircraft), ribbon, salute, dove, flexed (strength)`
+ ~8 pattern tiles (camo, chevrons, stripes, star field in the palette)

### 🥈 Halloween  (sells Sept–Oct — have art done by late Aug)
**Folder:** `/public/tiles/halloween/`
**Palette:** Midnight `#1a1a1a` · Pumpkin `#E65100` · Witch Purple `#6A1B9A` ·
Slime `#76FF03` · Blood Red `#8B0000`
Icons: `jack-o-lantern, ghost, bat, spider, web, skull, vampire, moon, candy,
lollipop, devil, cat (black cat), crystal-ball, broom, tombstone, eye`
+ ~8 patterns (cobweb, dripping, polka dots, stripes)

### 🥉 Christmas  (the year's biggest — have art done by October)
**Folder:** `/public/tiles/christmas/`
**Palette:** Holly Red `#B71C1C` · Evergreen `#1B5E20` · Gold `#FFD700` ·
Snow White `#F5F5F5` · Silver `#C0C0C0` · Pine `#2E7D32`
Icons: `tree, santa, snowman, snowflake, deer (reindeer), bell, gift, star,
candle, cookie, candy-cane, scarf, gloves, mrs-claus, sparkles, ribbon`
+ ~8 patterns (knit/fair-isle, candy-cane stripe, snowfall, plaid)

### Later (niche, lower volume — fill in after the big 3)
Valentine's, Lunar New Year, Diwali, Día de Muertos, Hanukkah, Kwanzaa,
New Year's, St. Patrick's, Easter, Sakura. Same spec; tile lists on request.

---

## 5. Handoff

When a set's files are ready, drop them in the folder and tell us — we repoint
the set to the local art, QA it on a plate, and surface it in the builder.
Start with Military: completing those ~7 icons + patterns gets a second product
live fastest.
