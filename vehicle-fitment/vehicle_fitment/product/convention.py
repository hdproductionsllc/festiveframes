"""The ONE place the two coordinate conventions meet.

The vehicle side of this system (spec §10) puts the origin at the plate's CENTRE
with +Y UP. The Festive Frames application puts it at the plate's TOP-LEFT with
+Y DOWN -- `src/lib/fit/spec.ts`, in its own words:

    "INCHES, origin at the PLATE's top-left corner, x rightward, y DOWNWARD
     ... The plate occupies (0,0)..(12,6)."

Both are sensible; neither is going to change; and a frame designed in one and
measured in the other is upside down. The failure is quiet, because a plate is
symmetric enough that a flipped result still looks like a plausible frame -- it
just puts the deep bottom bar at the TOP, where it fouls the tailgate handle
instead of hanging below the plate.

So conversion happens here and nowhere else, and `tests/test_convention.py`
round-trips it in both directions with a deliberately ASYMMETRIC point, because a
symmetric fixture cannot detect a sign error at all.
"""

from __future__ import annotations

from vehicle_fitment.geometry.canonical import US_STANDARD_PLATE, PlateStandard


def centre_to_topleft(
    x: float, y: float, standard: PlateStandard = US_STANDARD_PLATE
) -> tuple[float, float]:
    """§10 canonical (centre origin, +Y up) -> app convention (top-left, +Y down)."""
    return (x + standard.half_width, standard.half_height - y)


def topleft_to_centre(
    x: float, y: float, standard: PlateStandard = US_STANDARD_PLATE
) -> tuple[float, float]:
    """App convention (top-left origin, +Y down) -> §10 canonical (centre, +Y up)."""
    return (x - standard.half_width, standard.half_height - y)
