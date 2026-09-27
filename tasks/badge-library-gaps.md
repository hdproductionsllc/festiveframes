# Badge library gaps — research 2026-09-27

## SHIPPED 2026-09-27
- New art (gemini-3-pro-image 2K, 3-4 candidates each, one-inch test on navy,
  maroon, light blue and white; print + browser on Ladue / Parkway Central / West):
  **Flag Football, Pom Squad, Health Sciences, Business, Proud Family**. Prompts:
  tasks/enamel-pin-ideogram-prompts.md §9.
- Into the activity menu (art already existed, looked at): Jazz Band, Color Guard,
  Film, Ceramics, Culinary, Agriculture, Weightlifting, Crew, Sailing, Skiing.
- Tray search reads `keywords` (deca/fbla -> Business, hosa/nursing -> Health,
  grandma/mom -> Proud Family).
- **Tier 2, same day**: Stage Crew (spotlight), Math Team (compass + set square —
  checked against the Masonic square-and-compasses: theirs is an L-square,
  interlocked), Coding (white screen so the ivory twin keeps its brackets), Bass
  Fishing, Inclusive Sports (Unified = Special Olympics' name, a search word only).
  Inclusive is the weakest at an inch ("hands holding a ball") — owner's keep/cut.
  Key Club, show choir, speech, beach volleyball: search words on Service, Choir,
  Debate, Volleyball rather than near-duplicate art.
- Every badge made today was re-cut after the pink-rim find (see CLAUDE.md).
- NOT made: Captain / State — without the letters it only says "honour", which Star,
  Honor Roll, Medal and Trophy already say. Better as a banner line (CAPTAIN, STATE
  QUALIFIER) — an owner call.
- The "weak / duplicate" list below was from NAMES only; looked at, Robotics vs
  Engineering, Star vs Honor Roll and Racquetball vs Tennis are all distinct at an
  inch. The five graduation pieces are the one real overlap.


What parents and students will look for that the library does not have, ranked by
evidence (NFHS participation, club membership, what letter-pin catalogs and car-decal
sellers stock as standard). Every new badge still goes through the pipeline in
CLAUDE.md ("Badge art generation") and the one-inch test.

## Free wins — art already exists, just not in the activity picker

`src/data/activities.ts` / `ACTIVITY_GROUPS` leave out badges we already have:
Jazz Band, Color Guard, Film, Ceramics, Crew, Sailing, Ski, Weightlifting, Culinary,
**Agriculture (FFA, 700k+ members)**, Scouting, Campus Ministry. Adding FFA,
Weightlifting, Color Guard and Jazz Band to the picker costs no art.

## Evidence

- NFHS 2024-25 boys: football 1.03M, track 644k, basketball 541k, soccer 485k,
  baseball 473k, wrestling 300k, XC 239k, golf 162k, tennis 159k, swim 119k.
- Girls: track 514k, volleyball 493k, soccer 393k, basketball 356k, softball 331k,
  competitive spirit 206k, tennis 205k, XC 189k, swim 138k, lacrosse 99k.
  https://nfhs.org/stories/participation-in-high-school-sports-hits-record-high-with-sizable-increase-in-2024-25
- Fastest growing (2025-26): girls flag football 102,360 (15.7k in 2021-22); girls
  wrestling 88,771 (+20%).
  https://www.maxpreps.com/news/BknFe_85NU66j9fWnKW0nQ/high-school-sports-nfhs-survey-indicates-participation-is-up-for-the-fifth-year-in-a-row-spurred-by-girls-flag-football,-wrestling.htm
- Smaller: Unified Sports 70k, esports 30k, bass fishing 10.6k (7 states), beach
  volleyball 6.5k.
- Clubs: NHS 1.4M, FFA 700k+, JROTC 314k, HOSA 260k, Key Club 230-270k, FBLA 187k (HS).
- Letter-pin catalogs stock every sport + lyre, choir, drama masks, "pom", and
  captain / MVP / state bars (hrtrophies.com, mountolympusawards.com, decadeawards.com).
- Car decals: sport icon + number + class year, and "Proud Mom of a 2026 Senior"
  — the banner line already covers the words.

## Gap list (subject = the OBJECT to draw; badges carry no lettering)

| Tier | Item | Subject | Trap |
|---|---|---|---|
| 1 | Flag football | a football with two flag belts crossed under it, flags streaming | without bold flags it is our Football badge |
| 1 | Pom / dance team | two metallic pom-poms crossed | keep Cheer = megaphone so they stay distinct |
| 1 | Captain / state honour | a laurel-wrapped star over a small ribbon rosette | "C"/"STATE" need text; wordless it only says "honour" |
| 1 | Medical / HOSA | a stethoscope curled into a heart | NO red cross (protected emblem) |
| 1 | Business (DECA / FBLA stand-in) | a briefcase with a rising bar-chart arrow | never their marks |
| 1 | Proud family | a heart holding a small grad cap | relation words stay on the banner |
| 2 | Stage crew / theatre tech | a stage spotlight on a truss clamp | not camera-like (Film) |
| 2 | Math team | a compass and protractor | pi reads as text |
| 2 | Coding / CS | a laptop with angle brackets on screen | Esports also a screen |
| 2 | Key Club / volunteer | two hands shaping a heart | must differ from Service |
| 2 | Bass fishing | a leaping largemouth bass with a lure | strong silhouette — good |
| 2 | Unified Sports | two joined hands holding a ball | not charity-logo |
| 2 | Show choir, speech | alias to Choir / Debate first | near-duplicates |
| 3 | Equestrian, trap shooting (clay disc only, no firearm), archery, fencing, mountain bike, climbing | one piece of kit each | fencing mask vs lacrosse helmet |

## Weak or duplicate existing badges (from names — needs the one-inch test)

- Graduation: 5 near-identical pieces (two diplomas, cap & diploma, cap, tassel) → keep 2.
- Star vs Honor Roll star vs Medal vs Trophy vs Torch overlap; Star/Honor Roll likely identical at an inch.
- Robotics vs Engineering (robotic arm) near-duplicates.
- Racquetball is not an NFHS sport and reads as Tennis — low-value slot.
- Swim & Dive is one badge; catalogs sell a diver separately (Tier 3 split).
