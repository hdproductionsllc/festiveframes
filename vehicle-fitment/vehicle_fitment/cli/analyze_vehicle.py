"""§36's command-line prototype.

    python -m vehicle_fitment.cli.analyze_vehicle image.jpg

Prints the report §36 specifies and writes an annotated image beside it. Exit
code is 0 for GREEN/YELLOW and 2 for RED or a refusal, so it can be used in a
script without parsing the text.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2

from vehicle_fitment.annotate import annotate
from vehicle_fitment.confidence.score import Status
from vehicle_fitment.geometry.clearance import DEFAULT_SAFETY_MARGIN_INCHES
from vehicle_fitment.pipeline import ALGORITHM_VERSION, analyse
from vehicle_fitment.product.profile import FrameProfile
from vehicle_fitment.storage.records import save_record


def _print_report(result, frame: FrameProfile | None) -> None:
    cal = result.calibration
    print(f"Source:            {result.source_path}")
    print(f"Image hash:        {result.image_hash}   algorithm {ALGORITHM_VERSION}")
    print(f"Plate detected:    {'YES' if result.plate_detected else 'NO'}"
          f"   ({result.candidates_considered} candidate(s) considered)")

    if result.refusal_reason:
        print()
        print("NO AUTOMATIC FITMENT")
        print(f"  {result.refusal_reason}")
        print()
        print("Status:            RED")
        return

    print(f"Evidence level:    {result.level.value}")
    print("Plate corners (px):")
    for name, p in zip(("TL", "TR", "BR", "BL"), cal.quad.as_list()):
        print(f"  {name}  ({p.x:8.2f}, {p.y:8.2f})   sigma {p.sigma:.2f} px")
    print(f"Plate dimensions:  {cal.standard.width_inches:.3f} x "
          f"{cal.standard.height_inches:.3f} in")
    print("Inferred mounting points (canonical inches):")
    for (hx, hy) in cal.standard.nominal_hole_centres():
        print(f"  ({hx:+.3f}, {hy:+.3f})")
    if cal.mounting_deviation_inches is not None:
        print(f"  measured deviation from nominal: {cal.mounting_deviation_inches:.3f} in")
    print(f"Perspective:       {cal.quality.label}"
          f"  (foreshortening {cal.quality.foreshortening:.3f},"
          f" skew {cal.quality.skew_degrees:.1f} deg)")
    print(f"Scale at plate:    {cal.inches_per_pixel_at_plate():.5f} in/px")

    print()
    print("Usable clearance (raw / safe, safety margin "
          f"{result.clearances.safety_margin_inches:.2f} in):")
    safe = result.clearances.safe()
    for edge, m in result.clearances.raw().items():
        print(f"  {edge:<7} {m.render():<34} safe {safe[edge].render()}")
    print(f"  usable polygon: {len(result.clearances.usable_polygon)} points")

    print()
    if result.obstructions:
        print("Obstructions:")
        for o in result.obstructions:
            print(f"  - {o.kind:<16} {o.distance_from_plate_inches:5.2f} in from plate"
                  f"   label confidence {o.label_confidence:.2f}   ({o.detail})")
    else:
        print("Obstructions:      none detected")

    if result.fitment is not None and frame is not None:
        print()
        print(f"Frame fitment:     {frame.name}  [{frame.status}]")
        for e in result.fitment.edges:
            verdict = "fits" if e.fits_worst_case else "DOES NOT FIT"
            extra = "" if e.fits_worst_case else f"  short by {e.shortfall:.3f} in"
            print(f"  {e.edge:<7} needs {e.required:5.2f}  has {e.available.render():<34}"
                  f" {verdict}{extra}")
        print(f"  VERDICT: {'FITS' if result.fitment.fits else 'DOES NOT FIT'}"
              "  (decided on the worst case, not the nominal)")

    if result.warnings:
        print()
        print("Warnings:")
        for w in result.warnings:
            print(f"  ! {w}")

    print()
    print("Confidence:")
    for line in result.confidence.explain():
        print(f"  {line}")
    print()
    print(f"Status:            {result.status.value.upper()}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Analyse one rear-vehicle photograph for plate fitment geometry."
    )
    parser.add_argument("image", type=Path)
    parser.add_argument("--frame", default="candidate-7in",
                        help=f"product profile; one of {FrameProfile.available()}")
    parser.add_argument("--no-frame", action="store_true",
                        help="measure the vehicle only, with no product comparison")
    parser.add_argument("--safety-margin", type=float, default=DEFAULT_SAFETY_MARGIN_INCHES)
    parser.add_argument("--out-dir", type=Path, default=Path("data"))
    parser.add_argument("--json", action="store_true", help="also print the record as JSON")
    args = parser.parse_args(argv)

    if not args.image.exists():
        print(f"no such image: {args.image}", file=sys.stderr)
        return 2

    image = cv2.imread(str(args.image))
    if image is None:
        print(f"could not read {args.image} as an image", file=sys.stderr)
        return 2

    frame_id = None if args.no_frame else args.frame
    result = analyse(image, args.image, frame_id=frame_id,
                     safety_margin_inches=args.safety_margin)
    frame = FrameProfile.load(frame_id) if frame_id else None

    _print_report(result, frame)

    paths = save_record(result, image, args.image, args.out_dir, frame)
    print()
    print("Evidence written (original never modified):")
    for k, v in paths.items():
        print(f"  {k:<10} {v}")

    if args.json:
        print()
        print(json.dumps(json.loads(Path(paths["record"]).read_text()), indent=2)[:2000])

    return 0 if result.status in (Status.GREEN, Status.YELLOW) else 2


if __name__ == "__main__":
    raise SystemExit(main())
