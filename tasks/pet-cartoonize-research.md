# Pet photo → cartoon → die-cut: research findings & recommended pipeline

_Sourced deep-research synthesis (19/25 claims confirmed by adversarial verification).
Mid-2026 figures — re-verify pricing/licensing before committing._

## Why the first attempt failed (root cause, confirmed)
**Ideogram Remix is a style transform, not a cutout tool.** Asking it for a
transparent/clean background was tool-misuse → it returned a black background.
(Compounded by our test image being a *transparent PNG*, whose alpha flattened to
black.) The cutout must come from a **dedicated background remover**, as a separate step.

## Recommended models

### Generate (photo → stylized, keep likeness): **Google "Nano Banana Pro"** (Gemini image model)
- Google explicitly designed it to **"make photos of your friends, family and even
  your pets look consistently like themselves,"** supports style transfer, and takes
  **reference photos via the API** to lock identity.
- **Commercial rights granted** on outputs, no extra Google licensing fee.
- ~**$0.13/image**, ~2–5s.
- ⚠️ Caveats: likeness is *design intent, not a guarantee* (occasional identity drift) →
  **keep a customer approve-before-print step.** Invisible **SynthID watermark** in every
  output (confirm it's invisible at 3″/300 dpi; API tier avoids the visible sparkle).
  AI outputs are **likely not US-copyrightable → non-exclusive** (competitors could copy
  the art; and it can't override trademarks/real-person likeness).

### Avoid for a paid product: **FLUX.1 [dev] / Kontext-dev**
- Weights are **Non-Commercial**; commercial use needs a **paid Black Forest Labs license**,
  and the "Builder" tier explicitly **forbids client/downstream use** → you'd need a
  higher (Platform/Agency) tier. Added cost + legal complexity. (FLUX.1 **[schnell]** is
  Apache-2.0/free-commercial — the lone exception.)

### Not rankable from this research
Head-to-head quality claims (GPT Image vs FLUX vs Nano Banana) were **refuted or split**,
and no cost/latency survived for Ideogram/OpenAI/Recraft — so no confident ranking among
those. Nano Banana is recommended on *likeness design-intent + commercial terms*, not a
proven quality benchmark — **A/B it on real pet photos before locking in.**

## Cutout / background removal (the missing step)
A dedicated remover → transparent-alpha PNG with clean fur edges:
- **fal.ai BiRefNet V2** — hosted API, returns transparent PNG, **MIT-licensed (commercial OK)**.
- **Ideogram "Remove BG"** — native, good fur-edge handling, **and we already pay for Ideogram** (so keep Ideogram — just use Remove BG, not Remix).
- **rembg** (self-hosted, BiRefNet backbone) — free, transparent PNG or mask-only.

## Die-cut print prep (confirm exact specs with the actual vendor)
- **CMYK, 300 dpi minimum, 0.125″ bleed per side** (industry standard, verbatim from UPrinting).
- Keep important elements ≥0.125″ inside the cut line.
- ⚠️ Contour-cut-line specifics (white-border width, auto-added cut path) are
  **vendor-dependent** — generic claims about them were *refuted* in research. Get the
  dieline/cut-file spec from whoever actually prints/cuts these.

## ⭐ Recommended pipeline
1. **Generate** — Nano Banana Pro (Gemini API): customer photo + house-style prompt → stylized pet illustration.
2. **Cutout** — Ideogram Remove BG (we already pay) *or* fal BiRefNet V2 → transparent PNG.
3. **Approve** — show the customer the cutout; they bless it (likeness isn't guaranteed).
4. **Print prep** — CMYK, 300 dpi, 0.125″ bleed, contour line per the print vendor's spec.

## Open questions to resolve before building
- Real-pet likeness success rate of Nano Banana Pro (test varied breeds/markings/lighting) + best reference-photo protocol (how many refs, framing).
- Does SynthID/sparkle show at 3″/300 dpi? (API tier needed for clean output?)
- Exact dieline/cut-file + min cutout DPI from the chosen print/cut vendor.
- True per-order cost/latency at our volume (generate + cutout).

## What changes in our build (when un-parked)
`/api/cartoonize` swaps the GENERATE step Ideogram Remix → **Gemini "Nano Banana"**
(needs a Google/Gemini API key), and **adds a background-removal call** (Ideogram Remove
BG or fal BiRefNet) before returning. Approval gate stays. Sources in
`tasks/` workflow output; key sources: Google Gemini blog, philschmid sticker guide,
fal BiRefNet, Ideogram Remove BG docs, BFL FLUX license, UPrinting die-cut specs.
