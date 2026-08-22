"""Perspective rectification: pixels to inches (spec §11).

"A photograph is not automatically a measurement." Everything in this file exists
to make that true. A four-point projective transform maps the detected plate
quadrilateral onto the canonical 12 x 6 plane, and every surrounding pixel then
lands in real inches.

UNCERTAINTY IS DERIVED, NOT DECLARED
------------------------------------
The honest question is not "how good is a homography" in the abstract; it is "if
the detector was off by its own stated sigma, how many inches would this answer
move?" That is a sensitivity question with a numeric answer, so this module
computes it: each corner is perturbed by its sigma in both axes, the point of
interest is re-projected, and the spread of the results IS the uncertainty.

That matters most exactly where intuition fails. Near the plate, a two-pixel
corner error is worth thousandths; out at the edge of a frame on a steeply
oblique photo, the same two pixels can be worth an eighth of an inch. A constant
error bar would understate the second case and overstate the first, and §20 asks
for neither false precision nor false doubt.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import cv2
import numpy as np

from vehicle_fitment.geometry.canonical import US_STANDARD_PLATE, PlateStandard
from vehicle_fitment.geometry.measurement import Measurement, Method
from vehicle_fitment.pixels import PixelPoint, PixelQuad


@dataclass(frozen=True)
class PerspectiveQuality:
    """How trustworthy the view is, as numbers rather than adjectives."""

    foreshortening: float
    """Ratio of the longer to the shorter of each pair of opposite sides. 1.0 is
    a perfectly frontal view; 1.3 means one side images 30% longer than the side
    it is parallel to in reality."""

    skew_degrees: float
    """Largest deviation of a corner from 90 degrees, after rectification would
    have made them square."""

    aspect_error: float
    """How far the imaged aspect ratio sits from the plate's true ratio, as a
    fraction. Large values usually mean the detected quad is not the plate."""

    @property
    def label(self) -> str:
        if self.foreshortening <= 1.08 and self.skew_degrees <= 6.0:
            return "HIGH"
        if self.foreshortening <= 1.25 and self.skew_degrees <= 15.0:
            return "MEDIUM"
        if self.foreshortening <= 1.60 and self.skew_degrees <= 28.0:
            return "LOW"
        return "UNUSABLE"

    @property
    def is_usable(self) -> bool:
        return self.label != "UNUSABLE"


@dataclass
class PlateCalibration:
    """A solved mapping between this image and canonical plate inches."""

    homography: np.ndarray
    """3x3, pixels -> inches."""

    inverse: np.ndarray
    """3x3, inches -> pixels."""

    standard: PlateStandard
    quad: PixelQuad
    quality: PerspectiveQuality
    method: Method
    source_note: str = ""
    mounting_deviation_inches: float | None = None
    """Set only when calibration came from REAL mounting points (§4/§13): how far
    the measured hole rectangle sits from the plate's nominal one. Reported, never
    corrected away."""

    _samples: int = field(default=24, repr=False)

    # ── projection ─────────────────────────────────────────────────────────
    def to_inches(self, x: float, y: float) -> tuple[float, float]:
        return _apply(self.homography, x, y)

    def to_pixels(self, x_in: float, y_in: float) -> tuple[float, float]:
        return _apply(self.inverse, x_in, y_in)

    def inches_per_pixel_at_plate(self) -> float:
        """Scale at the plate itself. Only meaningful near the plate — under
        perspective the scale genuinely differs across the image, which is the
        whole reason this is a homography and not a multiplication."""
        sides = self.quad.side_lengths()
        px_width = (sides["top"] + sides["bottom"]) / 2.0
        return self.standard.width_inches / px_width if px_width else math.inf

    # ── uncertainty ────────────────────────────────────────────────────────
    def measure_point(self, x: float, y: float, method: Method | None = None) -> tuple[Measurement, Measurement]:
        """Project a pixel to inches, WITH the uncertainty that projection earns.

        Perturbs each source corner by its own sigma along both axes, re-solves,
        and takes the spread. Returns (x_measurement, y_measurement).
        """
        base_x, base_y = self.to_inches(x, y)
        spread_x, spread_y = self._sensitivity(x, y)
        m = method or self.method
        return (
            Measurement(base_x, spread_x, m),
            Measurement(base_y, spread_y, m),
        )

    def _sensitivity(self, x: float, y: float) -> tuple[float, float]:
        """Half-width of the projected position under corner perturbation."""
        src = np.array([[p.x, p.y] for p in self.quad.as_list()], dtype=np.float64)
        dst = np.array(self.standard.corners_clockwise_from_top_left(), dtype=np.float64)
        sigmas = [p.sigma for p in self.quad.as_list()]

        xs: list[float] = []
        ys: list[float] = []
        # Deterministic perturbation pattern: each corner pushed along +/-x and
        # +/-y by its sigma. Deterministic on purpose, so a record reprocessed
        # under the same algorithm version reproduces byte for byte (§29).
        for corner in range(4):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                jittered = src.copy()
                jittered[corner, 0] += dx * sigmas[corner]
                jittered[corner, 1] += dy * sigmas[corner]
                try:
                    h = cv2.getPerspectiveTransform(
                        jittered.astype(np.float32), dst.astype(np.float32)
                    )
                except cv2.error:
                    continue
                px, py = _apply(h, x, y)
                if math.isfinite(px) and math.isfinite(py):
                    xs.append(px)
                    ys.append(py)
        if not xs:
            return (math.inf, math.inf)
        return ((max(xs) - min(xs)) / 2.0, (max(ys) - min(ys)) / 2.0)


def _apply(h: np.ndarray, x: float, y: float) -> tuple[float, float]:
    vec = h @ np.array([x, y, 1.0], dtype=np.float64)
    if abs(vec[2]) < 1e-12:
        return (math.inf, math.inf)
    return (float(vec[0] / vec[2]), float(vec[1] / vec[2]))


def _quality(quad: PixelQuad, standard: PlateStandard) -> PerspectiveQuality:
    sides = quad.side_lengths()
    pairs = [(sides["top"], sides["bottom"]), (sides["left"], sides["right"])]
    fore = 1.0
    for a, b in pairs:
        lo, hi = min(a, b), max(a, b)
        if lo > 0:
            fore = max(fore, hi / lo)

    pts = quad.as_list()
    worst = 0.0
    for i in range(4):
        prev_p, cur, nxt = pts[i - 1], pts[i], pts[(i + 1) % 4]
        v1 = (prev_p.x - cur.x, prev_p.y - cur.y)
        v2 = (nxt.x - cur.x, nxt.y - cur.y)
        n1 = math.hypot(*v1)
        n2 = math.hypot(*v2)
        if n1 == 0 or n2 == 0:
            continue
        cos = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))
        worst = max(worst, abs(math.degrees(math.acos(cos)) - 90.0))

    true_ratio = standard.width_inches / standard.height_inches
    imaged = quad.aspect_ratio()
    aspect_error = abs(imaged - true_ratio) / true_ratio if true_ratio else math.inf
    return PerspectiveQuality(fore, worst, aspect_error)


def calibrate_from_plate_corners(
    quad: PixelQuad,
    standard: PlateStandard = US_STANDARD_PLATE,
    method: Method = Method.MEASURED,
    note: str = "plate perimeter",
) -> PlateCalibration:
    """Level B (§5): the plate's own four corners. The workhorse case."""
    src = np.array([[p.x, p.y] for p in quad.as_list()], dtype=np.float32)
    dst = np.array(standard.corners_clockwise_from_top_left(), dtype=np.float32)
    h = cv2.getPerspectiveTransform(src, dst)
    h_inv = cv2.getPerspectiveTransform(dst, src)
    return PlateCalibration(
        homography=h.astype(np.float64),
        inverse=h_inv.astype(np.float64),
        standard=standard,
        quad=quad,
        quality=_quality(quad, standard),
        method=method,
        source_note=note,
    )


def calibrate_from_mounting_points(
    quad: PixelQuad,
    standard: PlateStandard = US_STANDARD_PLATE,
) -> PlateCalibration:
    """Level A (§5): four REAL mounting points.

    §4 forbids assuming those points sit exactly on the nominal 7 x 4.75
    rectangle merely because a standard plate does. So the transform is built
    against the nominal hole rectangle — that is the only scale reference
    available — and the residual is then MEASURED and recorded on the
    calibration as `mounting_deviation_inches`. A vehicle whose real mounting
    geometry differs is flagged for review, not quietly reshaped to fit (§13).
    """
    src = np.array([[p.x, p.y] for p in quad.as_list()], dtype=np.float32)
    dst = np.array(standard.nominal_hole_centres(), dtype=np.float32)
    h = cv2.getPerspectiveTransform(src, dst)
    h_inv = cv2.getPerspectiveTransform(dst, src)

    cal = PlateCalibration(
        homography=h.astype(np.float64),
        inverse=h_inv.astype(np.float64),
        standard=standard,
        quad=quad,
        quality=_quality(quad, standard),
        method=Method.MEASURED,
        source_note="mounting points",
    )

    # How far is the imaged hole rectangle from a true rectangle of the nominal
    # size? Measured through the solved transform, in inches.
    projected = [cal.to_inches(p.x, p.y) for p in quad.as_list()]
    nominal = standard.nominal_hole_centres()
    cal.mounting_deviation_inches = max(
        math.hypot(px - nx, py - ny) for (px, py), (nx, ny) in zip(projected, nominal)
    )
    return cal
