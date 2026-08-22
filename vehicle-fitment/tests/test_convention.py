"""The coordinate-convention bridge (see product/convention.py).

Every fixture here is deliberately ASYMMETRIC. A symmetric point cannot detect a
sign error -- flip the Y axis on (0, 0) and it is still (0, 0) -- and the whole
hazard being guarded against is a silent vertical flip.
"""

from __future__ import annotations

import pytest

from vehicle_fitment.geometry.canonical import US_STANDARD_PLATE as P
from vehicle_fitment.product.convention import centre_to_topleft, topleft_to_centre

ASYMMETRIC = [(-2.5, 1.75), (4.25, -0.5), (-6.0, 3.0), (6.0, -3.0), (0.0, 2.9)]


@pytest.mark.parametrize("point", ASYMMETRIC)
def test_round_trip(point) -> None:
    x, y = point
    back = topleft_to_centre(*centre_to_topleft(x, y))
    assert back == pytest.approx((x, y), abs=1e-9)


def test_plate_corners_land_where_the_app_expects() -> None:
    """The app's own words: 'The plate occupies (0,0)..(12,6)'."""
    assert centre_to_topleft(P.left, P.top) == pytest.approx((0.0, 0.0))
    assert centre_to_topleft(P.right, P.bottom) == pytest.approx((12.0, 6.0))


def test_y_axis_actually_flips() -> None:
    """Guards the exact bug this module exists for: a point ABOVE the plate's
    centre must map to a SMALLER top-left y, not a larger one."""
    _, y_high = centre_to_topleft(0.0, 2.0)
    _, y_low = centre_to_topleft(0.0, -2.0)
    assert y_high < y_low, "the vertical axis is not being inverted"
