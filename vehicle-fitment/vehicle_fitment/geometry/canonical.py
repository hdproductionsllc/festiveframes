"""The canonical plate coordinate system (spec §3, §10).

ORIGIN IS THE CENTRE OF THE PLATE. X is rightward, Y is UPWARD. Units are inches.

    plate_left   = -6.000      plate_top    = +3.000
    plate_right  = +6.000      plate_bottom = -3.000

READ THIS BEFORE TOUCHING ANYTHING THAT CROSSES INTO THE MAIN APP
-----------------------------------------------------------------
The TypeScript side of Festive Frames uses the OPPOSITE vertical convention.
`src/lib/fit/spec.ts` states, in its own words:

    "INCHES, origin at the PLATE's top-left corner, x rightward, y DOWNWARD
     ... The plate occupies (0,0)..(12,6)."

Both conventions are defensible and neither is going to change. Mixing them puts
artwork on the bumper instead of the trunk lid, and — this is the dangerous part —
the mistake is INVISIBLE to any test whose fixture happens to be vertically
symmetric, which most plate fixtures are. So conversion happens in exactly one
place, `vehicle_fitment.product.convention`, and nowhere else. Nothing in this
package is permitted to emit top-left coordinates.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

# ─── The U.S. standard automotive plate (§3) ────────────────────────────────
#
# Sourced from state specifications (Ohio, Texas, California all agree): the
# plate is 12 x 6 inches with bolt holes on 7.000" horizontal and 4.750" vertical
# CENTRE-TO-CENTRE spacing.
#
# §3 is explicit that these must not be treated as universal for every plate in
# the world. They are the U.S. passenger/truck standard and this package's scope
# is exactly that; anything else is classified UNSUPPORTED rather than forced
# into this model. See `PlateStandard` below — the numbers are parameters, not
# literals scattered through the code.

PLATE_WIDTH_INCHES: Final[float] = 12.000
PLATE_HEIGHT_INCHES: Final[float] = 6.000
HOLE_SPACING_X_INCHES: Final[float] = 7.000
HOLE_SPACING_Y_INCHES: Final[float] = 4.750


@dataclass(frozen=True)
class PlateStandard:
    """A plate specification. Passed as data so a future non-U.S. standard is a
    new instance rather than an edit to the geometry engine."""

    name: str
    width_inches: float
    height_inches: float
    hole_spacing_x_inches: float
    hole_spacing_y_inches: float

    @property
    def half_width(self) -> float:
        return self.width_inches / 2.0

    @property
    def half_height(self) -> float:
        return self.height_inches / 2.0

    @property
    def left(self) -> float:
        return -self.half_width

    @property
    def right(self) -> float:
        return +self.half_width

    @property
    def top(self) -> float:
        return +self.half_height

    @property
    def bottom(self) -> float:
        return -self.half_height

    def corners_clockwise_from_top_left(self) -> list[tuple[float, float]]:
        """Plate corners in canonical inches, TL -> TR -> BR -> BL.

        This ordering is the contract every homography in this package uses. It
        is stated once, here, because a rotated correspondence produces a
        perfectly valid-looking transform that silently mirrors the result.
        """
        return [
            (self.left, self.top),
            (self.right, self.top),
            (self.right, self.bottom),
            (self.left, self.bottom),
        ]

    def nominal_hole_centres(self) -> list[tuple[float, float]]:
        """The four NOMINAL mounting-hole centres, same ordering as the corners.

        §4 is emphatic that this is the geometry of the PLATE, not permission to
        assume the vehicle's mounting points sit here. When real mounting points
        are visible they are measured and compared against these; the deviation
        is reported, never normalised away (§13).
        """
        hx = self.hole_spacing_x_inches / 2.0
        hy = self.hole_spacing_y_inches / 2.0
        return [(-hx, +hy), (+hx, +hy), (+hx, -hy), (-hx, -hy)]

    def hole_inset_from_edges(self) -> dict[str, float]:
        """Derived inset figures from §3, kept as a derivation rather than as the
        quoted 2.500 / 0.625 literals so they cannot drift from the spacings."""
        return {
            "left": self.half_width - self.hole_spacing_x_inches / 2.0,
            "right": self.half_width - self.hole_spacing_x_inches / 2.0,
            "top": self.half_height - self.hole_spacing_y_inches / 2.0,
            "bottom": self.half_height - self.hole_spacing_y_inches / 2.0,
        }


US_STANDARD_PLATE: Final[PlateStandard] = PlateStandard(
    name="US standard automotive",
    width_inches=PLATE_WIDTH_INCHES,
    height_inches=PLATE_HEIGHT_INCHES,
    hole_spacing_x_inches=HOLE_SPACING_X_INCHES,
    hole_spacing_y_inches=HOLE_SPACING_Y_INCHES,
)
