"""Pixel-space types: the ONLY vocabulary perception is allowed to speak.

This module is deliberately owned by neither `perception` nor `geometry`. It
holds plain coordinates with no notion of inches and no notion of images, so
that:

    perception  ->  pixels.py   <-  geometry

Perception produces these. Geometry consumes them. Neither imports the other,
which is how spec §34 ("separate perception from measurement") is enforced as an
import graph rather than as a habit. `tests/test_architecture.py` asserts it.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class PixelPoint:
    """A point in image space. `sigma` is the localisation uncertainty in PIXELS.

    Carrying sigma here is what lets the geometry engine derive an uncertainty in
    inches instead of inventing one: a corner the detector is confident about to
    half a pixel and one it is guessing to five pixels must not produce the same
    error bars.
    """

    x: float
    y: float
    sigma: float = 1.0

    def distance_to(self, other: "PixelPoint") -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


@dataclass(frozen=True)
class PixelQuad:
    """Four image points in TL -> TR -> BR -> BL order.

    The ordering is the contract; `from_unordered` is the only sanctioned way to
    build one from arbitrary points, because a rotated correspondence yields a
    homography that looks fine and silently mirrors every measurement.
    """

    top_left: PixelPoint
    top_right: PixelPoint
    bottom_right: PixelPoint
    bottom_left: PixelPoint

    def as_list(self) -> list[PixelPoint]:
        return [self.top_left, self.top_right, self.bottom_right, self.bottom_left]

    @property
    def mean_sigma(self) -> float:
        pts = self.as_list()
        return sum(p.sigma for p in pts) / len(pts)

    @classmethod
    def from_unordered(cls, points: list[PixelPoint]) -> "PixelQuad":
        """Order four points into TL, TR, BR, BL.

        Sorting by (x + y) and (x - y) is the standard trick and it is robust for
        the rotations a photographed plate actually exhibits. It is NOT robust
        past about 45 degrees of image roll, which is why `roll_is_extreme` exists
        to refuse rather than to guess.
        """
        if len(points) != 4:
            raise ValueError(f"a quad needs exactly 4 points, got {len(points)}")
        by_sum = sorted(points, key=lambda p: p.x + p.y)
        by_diff = sorted(points, key=lambda p: p.x - p.y)
        top_left, bottom_right = by_sum[0], by_sum[-1]
        bottom_left, top_right = by_diff[0], by_diff[-1]
        chosen = {id(top_left), id(top_right), id(bottom_right), id(bottom_left)}
        if len(chosen) != 4:
            raise ValueError("could not order these points into a quad")
        return cls(top_left, top_right, bottom_right, bottom_left)

    def side_lengths(self) -> dict[str, float]:
        return {
            "top": self.top_left.distance_to(self.top_right),
            "right": self.top_right.distance_to(self.bottom_right),
            "bottom": self.bottom_left.distance_to(self.bottom_right),
            "left": self.top_left.distance_to(self.bottom_left),
        }

    def aspect_ratio(self) -> float:
        s = self.side_lengths()
        width = (s["top"] + s["bottom"]) / 2.0
        height = (s["left"] + s["right"]) / 2.0
        return width / height if height > 0 else math.inf
