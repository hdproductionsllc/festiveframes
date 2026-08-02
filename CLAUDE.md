# Festive Frames — working notes

## MySchoolFrame — product direction (owner-confirmed)

- **End state**: schools get a **code or QR** that opens **their school's mobile
  builder**. The QR points at the per-school route (`/s/[slug]`); a short code is
  the same thing typed into a redeem page. The code is also the missing
  **attribution layer** — orders already carry `school` in Stripe metadata, so
  code-gated entry makes "your club earned $X" a provable number.
- **#31 (builder re-skin) is therefore mobile-first**, not just a visual pass:
  tap-to-place, preset one-tap layouts, school theming pre-applied. A parent
  arrives from a QR in the bleachers, on a phone. Do not start #31 without the
  owner's go — direction for the common builder is his call.
- **Pricing placeholders** in `src/config/offers.ts`: $49/frame, $10/frame
  donation. Not owner-confirmed; must be confirmed before any outreach ships.
- **Never email anyone without the owner's explicit permission.** Outreach email
  drafts (in the metro catalogs) are text deliverables only; the only mail the
  system sends is transactional order email.
- Deploys: push to master; Railway auto-deploys. No PRs unless asked.
- **Scope is national**, not STL-first-forever: prefer solutions that work for
  any school with zero hand-authoring (URL intake, generated kits, the code/QR
  app) over per-school manual steps. Hand-built kits are for pilots only.
- **Team**: Henry + Bill + Claude. The badge artwork's original illustrator is
  no longer on the project — new tile art comes from the in-house pipeline:
  Ideogram prompt library → background keyer → print-quality intake gate.
- Kit `status: "verified"` is flipped manually only — requires confirmed school
  colors AND written permission to use the school's name/marks.

## Badge art generation — READ THIS BEFORE TOUCHING ART

- **The generator is Google's Gemini image API ("nano banana"), NOT Ideogram.**
  `api.ideogram.ai` is blocked by this environment's egress allowlist;
  `generativelanguage.googleapis.com` is open. The key lives at
  `scratchpad/.gkey` (chmod 600, never echoed, never committed) and is a GOOGLE
  key — 53 chars, starts `AQ.`. Model: `gemini-2.5-flash-image`.
  Working generator: `scripts/gen-badge.mjs` (committed; reads GEMINI_API_KEY /
  GEMINI_API_KEY_FILE).
- **This was forgotten once and cost a session.** The Ideogram-era docs in
  `tasks/*.md` describe the METHOD (style block, subject-not-wording rule, the
  one-inch test) — the vendor named in them is stale. When an endpoint 403s,
  TEST THE KEY against the alternatives before reporting blocked.
- **Gemini lights the magenta sweep and prose will not stop it.** Backdrop
  magenta-ness comes back 66–91 where the batch keyer demands 150+, so
  `scripts/cut-enamel-pins.mjs` refuses every Gemini source. Do not fight the
  prior and do not lower that gate: key Gemini output with the app's ADAPTIVE
  keyer (`src/lib/utils/key-background.ts` — measures the backdrop it is given),
  then `trim({threshold: 1})`. Verified path: flatness 1.000, partial-alpha
  edges ramp to gold not magenta, ≥595px after trim (the 300 DPI 2x2 gate).
- Style block and per-badge prompts: `tasks/enamel-pin-ideogram-prompts.md`.
  Every new badge still clears the ONE-INCH TEST (100px on navy, look at it)
  before it ships.

## Per-school PLATE mockups — the pipeline, with its one trap

- `scripts/gen-plate.mjs` makes each school's vanity plate (JRBILLS, PIONEERS,
  RAMS) by feeding the verified SLUH plate photo to Gemini image EDITING and
  changing only the embossed characters — one source photograph per state, so the
  set cannot drift. `--conform` then seats the winner in the exact 924x467
  framing `plate-images.ts` is tuned against; no per-school display entry needed.
- **THE TRAP: embossed lettering is where image models misspell, and it looks
  perfect.** "PIONEERS" came back "PIONERS" one run in three, in flawless
  stamped metal. Always generate ≥3 variants and read every one letter by
  letter before conforming. Spell the word out in the prompt
  ("letter-for-letter P, I, O, ...") — it lowers the rate but does not zero it.
- Prompt shape that works: name what the source says now, demand ONE change,
  spell the new text, then "Do not change anything else about the image."
- **Second trap: letter PITCH.** Models kern like typography; real dies stamp on
  a fixed pitch, and the first shipped RAMS had a final gap HALF its first
  (30% spread) — obvious to the owner at a glance. The prompt now demands
  "fixed pitch, every gap identical, no typographic kerning" (cuts spread to
  8-13%), and `--gaps` measures it: ship nothing over ~15%.

## Per-school research kit (repeat for every school)

The SLUH deep-dive is the template. For each school gather, with a source per
fact and an explicit "unverified" list (a wrong fact costs more trust than the
section earns — facts only, no padding):

1. **Identity** — founded year and any "oldest/first" distinction, affiliation,
   official motto (+ translation), mascot origin story, colors as THEY phrase
   them, and the nickname's formal vs everyday register (Jr. Billikens vs
   Jr. Bills — schools have an insider form; using it right is the tell).
2. **Athletics** — programs with real title history (years, streaks, national
   vs state), conference, rivalries and named trophy games (Jesuit Cup).
3. **Beyond sports** — signature clubs, publications, service programs (lit
   mag, robotics outreach, senior service requirement).
4. **Traditions** — student-section name, marquee annual events (auction/gala
   names), campus milestones/anniversaries.
5. **Parent culture** — mothers/fathers/booster clubs, how parents volunteer,
   spirit store + its manager (often the cleanest door).
6. **Brand language** — phrases the school uses about itself ("Men for
   Others"), store naming, verbal habits ("-bills" compounds).
7. **Doors** (from outreach waves) — AD, booster officers, advancement,
   spirit-shop manager; best single door + why.
8. **Usually needs manual grab by the owner** — exact hex values (school CMSes
   block bots), mascot/crest image files, formal nickname preference.

Working sources: Wikipedia, local news, MaxPreps/state-association pages, the
school's own news archive and store site. School CMS fetches usually 403 —
search snippets still work. Feed results into the kit's `welcome` block and
the outreach catalogs.

## Verifying visual work

Visual changes must be **looked at before they are handed over**. Tests passing is
not evidence that something looks right, and several defects in this codebase shipped
green: a white bevel highlight that was invisible on a white field, a 45° mitre
cutting across a rounded corner, and a brass rim so small on screen it read as absent.
Every one would have been obvious in a render, and every one was found by the owner
instead of by me.

**A same-colour edge is not a subtle edge, it is extra weight.** The banner
lettering read as "too fat" for three rounds; the cause was the merrow thread
resolving to white on white type (SLUH's rim is `#FFFFFF`), so a 7.5%-of-em
outward stroke added bulk and no border. Anything drawn as an outline, rim or
highlight has to be checked against what it sits on — `merrowThread` now enforces
a luminance gap rather than assuming one. And when a defect appears on screen but
not in print, suspect the two renderers being handed different arguments before
suspecting the drawing: that one was `textChenille(px, colour)` in print against
`textChenille(px, colour, rimColor)` on screen.

So before reporting any change to how something looks, do all of the following that
apply. Attach the renders to the reply.

### 1. Render the print path and look at it

`src/lib/utils/compose-school-frame.ts` draws through `@napi-rs/canvas` in node, so a
vitest file can render a real frame with no browser. `compose-school-frame.test.ts`
already writes one when `SCHOOL_SAMPLE_OUT` is set:

```
SCHOOL_SAMPLE_OUT=/path/out.png npx vitest run src/lib/utils/compose-school-frame.test.ts
```

For anything edge-related, crop and magnify with `kernel: "nearest"` — a corner
seam or a halo is invisible at fit-to-page and unmistakable at 6x.

### 2. Render the ON-SCREEN path in a real browser

The builder and the print sheet are two renderers. **Checking one proves nothing
about the other**, and they are exactly where drift hides — the whole reason
`tile-theme.ts` exists. Chromium is at `/opt/pw-browsers/`; `npm run dev`, then drive
it with puppeteer-core and screenshot `/lab/school`.

This is not optional. The gold-flooded banners were correct in the canvas render and
completely wrong in CSS, because `background-clip: border-box` has no canvas
equivalent. Only the browser could show it.

### 3. Cover the shapes the thing actually takes

A square badge and a 6:1 banner are different cases and break differently. A
corner-to-corner gradient looks right on a badge and becomes a left-to-right wash on a
bar. Render at least one square tile and one wide bar, on both a light and a dark
field — `bevelMetrics` and `bevelGradient` branch on field luminance.

### 4. Prefer measuring to squinting

When the question is "is there a fringe", sample the pixels: bucket partial-alpha
pixels by alpha and print their mean RGB. That turned "the edges look dirty" into
"edge pixels ramp to (235,235,234) while the art is (130,130,129)" — a matte fringe,
with a known fix. If a measurement looks extreme, question the method before
reporting it: comparing RGB inside fully transparent regions once produced a bogus
error of 49/255 where the real figure was under 1/255.

## Geometry GROUND TRUTH (owner-established 2026-08-02) — read before any geometry work

- **Nothing newer than the July 4 builder has ever completed design → physical
  part.** The July ring (`DEFAULT_FRAME_CONFIG`, 13 × 7, one tile thick all
  round, window 11 × 5 = 10.901" × 4.955", overlapping the plate face ~0.55"/
  0.52") was printed and its tiles sat FLUSH. Every school geometry since —
  the 10 × 5 classic, the 12 × 6 rail window — is unverified theory.
- **Bill had to STRETCH school exports in eufyMake to make them fit.** That is
  evidence of a dimensional mismatch between our files and his physical rail,
  and it contaminates every conclusion drawn from those prints. STANDING RULE:
  nothing is ever stretched in eufyMake. A file that doesn't fit is wrong and
  comes back to the code.
- The rebase candidates `SCHOOL_JULY_SLIM_FRAME_CONFIG` / `SCHOOL_JULY_FULL_
  FRAME_CONFIG` (in constants/frame.ts, staged, NOT wired) derive the school
  frames from the verified July core + flags only; JULY_SLIM's rail IS the July
  ring to the millimetre. **Flip gate:** Bill measures his rail (window opening,
  tile pitch, rail thickness) against the July numbers, or one physical
  unstretched print of JULY_SLIM. Do not flip, or re-litigate window size in
  code, without a measurement of a physical part.

## Geometry facts worth not re-deriving

- eufyMake E1 bed: 16.5" × 13". School frame tile pitch 0.991".
- School grid: 14 cols × 8 rows. Wings at col 0/13, inner rails col 1/12, plate hole
  rows 1–5 × cols 2–11. **Top panel is 1 row; bottom panel is 2 rows** (6–7).
- A 2×2 badge cannot fit the 1-row top strip, which is why the top bar is forced to
  text (`sectionSupportsTiles`).

## Zustand persistence

`migrate` runs **only** when the stored version is lower than the current one.
`merge` runs on **every** hydrate. A repair placed in `migrate` will not reach a
browser whose blob is already at the current version — which is usually the exact
case the repair was written for. Put repairs in `merge`, and make them return the
**same object** when nothing changed so they don't churn renders.
