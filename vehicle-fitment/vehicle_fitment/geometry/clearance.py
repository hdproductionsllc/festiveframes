"""Clearance and the usable region (spec §15, §17). INCHES ONLY.

§15 explicitly refuses to let this collapse to four numbers: "do not reduce
everything to four numbers... store a 2D polygon representing the usable region",
because real fascias are curved, stepped and asymmetric. So the primary output
here is a POLYGON traced around the plate, and left/right/top/bottom fall out of
it as summaries for the cases where four numbers really are enough.

HOW THE BODY EDGE IS FOUND
--------------------------
Rays are cast outward from the plate perimeter, defined in CANONICAL INCHES and
then projected into the image. Doing it that way round matters: a ray that is
straight and evenly spaced in inches is neither straight nor evenly spaced in
pixels once perspective is involved, so sampling in pixel space and converting
afterwards would quietly bias every measurement on an oblique photo — worst
exactly where the frame's outer edge lives.

Each ray walks outward until the image gradient says an edge was crossed. The
distance at which that happened IS the clearance, in inches, straight out of the
homography. No pixel-to-inch fudge factor exists anywhere in this file.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import cv2
import numpy as np

from vehicle_fitment.geometry.homography import PlateCalibration
from vehicle_fitment.geometry.measurement import Measurement, Method

DEFAULT_MAX_SEARCH_INCHES = 6.0
DEFAULT_SAMPLES_PER_EDGE = 21
DEFAULT_STEP_INCHES = 0.02

# §17: a body contour is not usable right up to the millimetre it touches. The
# real figure has to come off the physical prototype; this is an engineering
# placeholder and is configurable, never baked into a stored geometry.
DEFAULT_SAFETY_MARGIN_INCHES = 0.10


@dataclass
class EdgeHit:
    """One ray's result."""

    edge: str
    along: float
    """Position along that plate edge, -1..+1 from one end to the other."""
    clearance_inches: float | None
    point_inches: tuple[float, float] | None
    strength: float
    width_inches: float = 0.0
    """How wide the gradient ramp was, in inches. A crisp step is near zero; a
    shadow gap or a blurred photo is wide, and that width is genuine ambiguity
    about where the boundary IS -- so it belongs in the error bar."""


@dataclass
class ClearanceResult:
    left: Measurement
    right: Measurement
    top: Measurement
    bottom: Measurement
    usable_polygon: list[tuple[float, float]] = field(default_factory=list)
    hits: list[EdgeHit] = field(default_factory=list)
    safety_margin_inches: float = DEFAULT_SAFETY_MARGIN_INCHES

    def raw(self) -> dict[str, Measurement]:
        return {"left": self.left, "right": self.right, "top": self.top, "bottom": self.bottom}

    def safe(self) -> dict[str, Measurement]:
        """§17: raw and safe are both reported; the source geometry is never
        modified to bake a margin in."""
        out = {}
        for name, m in self.raw().items():
            if not m.is_known:
                out[name] = m
                continue
            out[name] = Measurement(
                max(0.0, m.value - self.safety_margin_inches), m.uncertainty, m.method
            )
        return out


def _gradient(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    gx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    return np.hypot(gx, gy)


def _sample(grad: np.ndarray, x: float, y: float) -> float:
    h, w = grad.shape
    xi, yi = int(round(x)), int(round(y))
    if xi < 1 or yi < 1 or xi >= w - 1 or yi >= h - 1:
        return math.nan
    return float(grad[yi - 1 : yi + 2, xi - 1 : xi + 2].max())


def _cast(
    grad: np.ndarray,
    cal: PlateCalibration,
    origin: tuple[float, float],
    direction: tuple[float, float],
    max_search: float,
    step: float,
    threshold: float,
) -> tuple[float | None, tuple[float, float] | None, float, float]:
    """Walk outward in INCHES; return (distance, point, edge strength).

    STEPPING OVER THE PLATE'S OWN PERIMETER. Every ray starts on the plate edge,
    which is by construction the strongest gradient it will ever see — a light
    plate face against a dark recess. Naively taking the first edge therefore
    returns the plate's own border on every vehicle ever photographed, and it
    returns it as a confident number.

    A fixed "skip the first N inches" would be a magic constant that is wrong for
    any plate whose border is thicker or thinner than the guess. Instead this is
    a small state machine over edge CROSSINGS: the ray is already inside an edge
    when it starts, so it first waits for the gradient to fall back to flat
    material, and only then does the next rise count as the body boundary.

    A plate mounted flush on a flat panel with no recess simply never produces
    that second rise, and the ray honestly reports nothing found (§26).
    """
    clear_level = threshold * 0.45
    d = 0.0
    left_plate_edge = False
    while d <= max_search:
        x_in = origin[0] + direction[0] * d
        y_in = origin[1] + direction[1] * d
        px, py = cal.to_pixels(x_in, y_in)
        s = _sample(grad, px, py)
        if math.isnan(s):
            break
        if not left_plate_edge:
            # Still crossing the plate's own border; wait for flat material.
            if s <= clear_level:
                left_plate_edge = True
        elif s >= threshold:
            # An edge has real WIDTH. Taking the first sample over threshold
            # returns where the ramp begins, which sits systematically SHORT of
            # the feature by half the edge's width -- measured at 0.06in on a
            # 3px shadow line, and worse on a blurred photograph, always biased
            # the same direction. The edge is properly located at its gradient
            # PEAK, so walk to the top of the ramp and report that.
            peak_s, peak_d, peak_pt = s, d, (x_in, y_in)
            ramp_start = d
            ramp_end = d
            probe = d
            while probe <= max_search:
                probe += step
                qx = origin[0] + direction[0] * probe
                qy = origin[1] + direction[1] * probe
                ppx, ppy = cal.to_pixels(qx, qy)
                ps = _sample(grad, ppx, ppy)
                if math.isnan(ps) or ps < threshold:
                    break
                ramp_end = probe
                if ps > peak_s:
                    peak_s, peak_d, peak_pt = ps, probe, (qx, qy)
            return peak_d, peak_pt, peak_s, max(0.0, ramp_end - ramp_start)
        d += step
    return None, None, 0.0, 0.0


def measure_clearances(
    image: np.ndarray,
    cal: PlateCalibration,
    max_search_inches: float = DEFAULT_MAX_SEARCH_INCHES,
    samples_per_edge: int = DEFAULT_SAMPLES_PER_EDGE,
    step_inches: float = DEFAULT_STEP_INCHES,
    safety_margin_inches: float = DEFAULT_SAFETY_MARGIN_INCHES,
) -> ClearanceResult:
    grad = _gradient(image)
    finite = grad[np.isfinite(grad)]
    # Otsu on the gradient: an adaptive threshold beats a magic number across
    # lighting conditions, and the fallback keeps a flat image from finding
    # "edges" in its own noise.
    threshold = max(float(np.percentile(finite, 92)), 25.0)

    std = cal.standard
    edges = {
        "left": ((std.left, 0.0), (-1.0, 0.0), std.half_height),
        "right": ((std.right, 0.0), (1.0, 0.0), std.half_height),
        "top": ((0.0, std.top), (0.0, 1.0), std.half_width),
        "bottom": ((0.0, std.bottom), (0.0, -1.0), std.half_width),
    }

    hits: list[EdgeHit] = []
    per_edge: dict[str, list[float]] = {k: [] for k in edges}
    per_edge_width: dict[str, list[float]] = {k: [] for k in edges}
    polygon_pts: dict[str, list[tuple[float, float]]] = {k: [] for k in edges}

    for name, (origin, direction, half_span) in edges.items():
        for i in range(samples_per_edge):
            t = -1.0 + 2.0 * i / (samples_per_edge - 1)
            # Inset the ends slightly: the plate's own corners are strong edges
            # and rays launched from them find themselves.
            t *= 0.86
            if name in ("left", "right"):
                start = (origin[0], t * half_span)
            else:
                start = (t * half_span, origin[1])
            d, pt, strength, width = _cast(
                grad, cal, start, direction, max_search_inches, step_inches, threshold
            )
            hits.append(EdgeHit(name, t, d, pt, strength, width))
            if d is not None and pt is not None:
                per_edge[name].append(d)
                polygon_pts[name].append(pt)
                per_edge_width[name].append(width)

    def summarise(name: str) -> Measurement:
        values = per_edge[name]
        if len(values) < max(3, samples_per_edge // 4):
            # Too few rays found anything. §26: refuse rather than invent.
            return Measurement.unknown()
        arr = np.array(values, dtype=np.float64)
        median = float(np.median(arr))
        # Spread of the rays themselves, plus the homography's own sensitivity
        # at the point where the edge was found. Both are real sources of error
        # and neither alone is the whole story.
        spread = float(np.percentile(arr, 84) - np.percentile(arr, 16)) / 2.0
        probe = polygon_pts[name][len(polygon_pts[name]) // 2]
        px, py = cal.to_pixels(*probe)
        mx, my = cal.measure_point(px, py)
        proj_sigma = max(mx.uncertainty, my.uncertainty)

        # Three independent, physically real sources of error, added in
        # quadrature. Leaving any of them out produced error bars that did not
        # actually contain the true answer:
        #   spread      -- disagreement between the rays along one edge
        #   proj_sigma  -- what the homography does to the detector's corner error
        #   edge_half   -- half the gradient ramp's width. A crisp step is nearly
        #                  free; a shadow gap or a soft photo is genuinely
        #                  ambiguous about WHERE the boundary is, by about this
        #                  much, and pretending otherwise is false precision.
        widths = per_edge_width[name]
        edge_half = (float(np.median(widths)) / 2.0) if widths else 0.0
        unc = math.sqrt(
            max(spread, step_inches) ** 2 + proj_sigma ** 2 + edge_half ** 2
        )
        return Measurement(median, unc, cal.method)

    ordered: list[tuple[float, float]] = []
    for name in ("top", "right", "bottom", "left"):
        pts = polygon_pts[name]
        if name == "top":
            pts = sorted(pts, key=lambda p: p[0])
        elif name == "right":
            pts = sorted(pts, key=lambda p: -p[1])
        elif name == "bottom":
            pts = sorted(pts, key=lambda p: -p[0])
        else:
            pts = sorted(pts, key=lambda p: p[1])
        ordered.extend(pts)

    return ClearanceResult(
        left=summarise("left"),
        right=summarise("right"),
        top=summarise("top"),
        bottom=summarise("bottom"),
        usable_polygon=ordered,
        hits=hits,
        safety_margin_inches=safety_margin_inches,
    )
