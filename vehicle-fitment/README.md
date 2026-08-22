# Vehicle Fitment Intelligence Engine

Phase 1 of the spec: the section 36 command-line prototype and the geometry
engine under it. Given one photograph of a vehicle's rear, it locates the licence
plate, turns the image into real inches, measures how much room surrounds the
plate, and says whether a given Festive Frames product fits — or refuses, when
the evidence does not support an answer.

## Run it

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt          # Windows: .venv\Scripts\pip
.venv/bin/python -m pytest tests/ -q               # 66 tests

.venv/bin/python -m vehicle_fitment.cli.analyze_vehicle path/to/rear-photo.jpg
```

Useful flags: `--frame bill-current-8in` to test against the 8 inch build that
failed a Honda Pilot, `--no-frame` to measure the vehicle without any product
comparison, `--safety-margin 0.15`, `--json`.

## What it produces

A report, and four artefacts under `data/` keyed by the image's content hash:
the original copied byte for byte, the plate rectified to a canonical plane, an
annotated image, and a geometry record in JSON that includes the homography
itself — so a later algorithm version can reprocess the same evidence and the two
answers can be compared (sections 29 and 30).

## How it is put together

```
perception/   PIXELS ONLY. Plate quadrilaterals, mounting points, obstructions.
              Never imports geometry. Never returns inches.
geometry/     INCHES ONLY. Homography, canonical coordinates, clearances.
              Never imports perception.
pixels.py     The shared vocabulary between them, owned by neither.
evidence/     The A-F ladder and the fallback hierarchy.
confidence/   Scoring, with the reasons kept.
product/      Frame profiles as DATA, and the coordinate-convention bridge.
synth/        Ground-truth scene generator, used to measure accuracy.
```

Section 34's rule — "separate perception from measurement" — is enforced as an
import graph and asserted in `tests/test_architecture.py`, so breaking it is a
test failure rather than a code-review miss.

## Two things to know before changing anything

**The vertical axis is inverted relative to the main app.** This package uses
spec section 10: origin at the plate's centre, +Y UP. `src/lib/fit/spec.ts` in
the Next.js app uses top-left origin, +Y DOWN. Convert only through
`product/convention.py`. A sign error here is invisible in any symmetric test
fixture and puts the deep bottom bar at the top of the frame.

**Accuracy is validated synthetically, on purpose.** A real photograph cannot
measure a measurement system, because nobody knows a real tailgate's clearance to
a thousandth. `synth/scene.py` chooses the truth before the pixels exist, so
`tests/test_accuracy.py` can assert error, error-bar coverage, and that
uncertainty GROWS as the view worsens. Real photographs answer a different and
equally necessary question — does the detector find the plate in the wild — and
that is what the section 37 five-vehicle validation is for.

## Current state, honestly

Working and tested: plate detection by geometry (no OCR), perspective
rectification, clearance and usable-polygon measurement with derived
uncertainty, the evidence ladder, confidence with monotonicity guarantees,
refusal behaviour, product fitment, evidence storage, the annotated review image.

Measured on synthetic scenes across 12 conditions: clearance error at or under
0.06 inch, error bars contain the truth in every case, and the worst case never
overstates available room.

Not built yet, deliberately (sections 23 and 25 say prove the engine first):
image acquisition and ranking, the review UI, FastAPI, multi-image aggregation,
geometry families, the vehicle database.

Known rough edges:

- Obstruction classification is shallow — shape, size and position only. It
  finds a reversing camera reliably on synthetic scenes and honestly labels the
  rest `unknown`, which section 16 permits. Tuning it further against synthetic
  imagery would fit the renderer's quirks rather than reality; it wants real
  photographs.
- The usable polygon is drawn from measured rays only, so its corners are
  chamfered where no ray was cast. That is honest rather than decorative, but it
  is not a body contour.
- On the one real photograph available in this environment
  (`public/plates/missouri-jrbills-centered.jpg`) the inferred mounting points
  land on the real bolt holes visually, but measured hole spacing came out 7.267
  inch against the 7.000 standard. That deviation is not attributed: it could be
  blob centroids that are not hole centres, the plate's raised border biasing
  perimeter detection, or the asset's own non-uniform resize in the plate
  pipeline. It needs a clean straight-on photograph to settle.

## Next

Section 37's five vehicles, on a machine that can reach image sources. The
fastest genuine test is a straight-on photograph of any car — that is a Level B
case and exercises the whole ladder.
