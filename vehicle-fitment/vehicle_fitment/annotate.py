"""The annotated image (spec §36, §22, §30).

§36 requires "an annotated image showing every detected point and polygon", and
§22 wants a reviewer to see the plate outline, the mounting points, the canonical
overlay, the proposed frame boundary, the usable polygon and the obstructions,
all at once. This draws exactly that.

It is a SEPARATE file from the original (§30). The original evidence is never
drawn on, so a better algorithm can reprocess it later and produce a different
annotation from the same pixels (§29).
"""

from __future__ import annotations

import cv2
import numpy as np

from vehicle_fitment.pipeline import AnalysisResult
from vehicle_fitment.product.profile import FrameProfile

PLATE_COLOUR = (60, 220, 60)
HOLE_COLOUR = (0, 200, 255)
USABLE_COLOUR = (255, 190, 40)
FRAME_COLOUR = (80, 80, 255)
OBSTRUCTION_COLOUR = (200, 80, 255)


def _px(cal, x_in: float, y_in: float) -> tuple[int, int]:
    x, y = cal.to_pixels(x_in, y_in)
    return (int(round(x)), int(round(y)))


def annotate(image: np.ndarray, result: AnalysisResult, frame: FrameProfile | None = None) -> np.ndarray:
    canvas = image.copy()
    cal = result.calibration
    if cal is None:
        cv2.putText(canvas, "NO CALIBRATION", (24, 48), cv2.FONT_HERSHEY_SIMPLEX,
                    1.1, (0, 0, 255), 3, cv2.LINE_AA)
        return canvas

    std = cal.standard

    # Plate perimeter, from the DETECTED corners.
    quad = np.array([[int(p.x), int(p.y)] for p in cal.quad.as_list()], dtype=np.int32)
    cv2.polylines(canvas, [quad], True, PLATE_COLOUR, 2, cv2.LINE_AA)
    for p in cal.quad.as_list():
        cv2.circle(canvas, (int(p.x), int(p.y)), 5, PLATE_COLOUR, -1, cv2.LINE_AA)
        # Radius = the corner's own sigma, so a reviewer can SEE which corners
        # the detector was unsure about rather than reading it in a log.
        cv2.circle(canvas, (int(p.x), int(p.y)), max(3, int(p.sigma * 3)),
                   PLATE_COLOUR, 1, cv2.LINE_AA)

    # Canonical grid every inch: the coordinate system made visible (§22).
    for i in range(-6, 7):
        cv2.line(canvas, _px(cal, i, std.top), _px(cal, i, std.bottom), (90, 90, 90), 1, cv2.LINE_AA)
    for j in range(-3, 4):
        cv2.line(canvas, _px(cal, std.left, j), _px(cal, std.right, j), (90, 90, 90), 1, cv2.LINE_AA)

    # Inferred mounting points (§5 level B step 4).
    for (hx, hy) in std.nominal_hole_centres():
        c = _px(cal, hx, hy)
        cv2.circle(canvas, c, 7, HOLE_COLOUR, 2, cv2.LINE_AA)
        cv2.drawMarker(canvas, c, HOLE_COLOUR, cv2.MARKER_CROSS, 12, 1, cv2.LINE_AA)

    # Usable region (§15) as an actual polygon, not four numbers.
    if result.clearances and len(result.clearances.usable_polygon) >= 3:
        poly = np.array([_px(cal, x, y) for x, y in result.clearances.usable_polygon],
                        dtype=np.int32)
        cv2.polylines(canvas, [poly], True, USABLE_COLOUR, 2, cv2.LINE_AA)

    # Proposed frame boundary (§22 item 5).
    if frame is not None:
        r = frame.required_region
        fpoly = np.array([
            _px(cal, r.left, r.top), _px(cal, r.right, r.top),
            _px(cal, r.right, r.bottom), _px(cal, r.left, r.bottom),
        ], dtype=np.int32)
        cv2.polylines(canvas, [fpoly], True, FRAME_COLOUR, 2, cv2.LINE_AA)

    for obs in result.obstructions:
        pts = np.array([_px(cal, x, y) for x, y in obs.polygon_inches], dtype=np.int32)
        cv2.polylines(canvas, [pts], True, OBSTRUCTION_COLOUR, 2, cv2.LINE_AA)
        cv2.putText(canvas, obs.kind, (int(pts[0][0]), int(pts[0][1]) - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, OBSTRUCTION_COLOUR, 1, cv2.LINE_AA)

    _legend(canvas, result, frame)
    return canvas


def _legend(canvas: np.ndarray, result: AnalysisResult, frame: FrameProfile | None) -> None:
    lines = [
        (f"status {result.status.value.upper()}  conf {result.confidence.score:.3f}"
         f"  level {result.level.value}", (255, 255, 255)),
        ("plate perimeter (radius = corner sigma)", PLATE_COLOUR),
        ("inferred mounting points", HOLE_COLOUR),
        ("usable region", USABLE_COLOUR),
    ]
    if frame is not None:
        lines.append((f"frame required: {frame.id}", FRAME_COLOUR))
    if result.obstructions:
        lines.append(("obstructions", OBSTRUCTION_COLOUR))

    pad, lh = 12, 22
    box_h = pad * 2 + lh * len(lines)
    overlay = canvas.copy()
    cv2.rectangle(overlay, (10, 10), (470, 10 + box_h), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.68, canvas, 0.32, 0, canvas)
    for i, (text, colour) in enumerate(lines):
        cv2.putText(canvas, text, (10 + pad, 10 + pad + lh * (i + 1) - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.48, colour, 1, cv2.LINE_AA)
