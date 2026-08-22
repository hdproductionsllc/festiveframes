"""Plate perimeter detection (spec §12). PIXELS ONLY — never inches.

§12 is emphatic: find the plate by GEOMETRY, not by reading it. No OCR, no state
name, no colour scheme, no character templates. A blurred, anonymised or
glare-washed plate is still perfectly usable if its perimeter is visible, and any
dependence on legibility would throw away most of the useful imagery.

THE HARD PART IS NOT FINDING A RECTANGLE, IT IS PICKING THE RIGHT ONE
---------------------------------------------------------------------
A plate is 2:1. So is the recess it sits in, very nearly — a 14.4 x 7.25 inch
opening around a 12 x 6 plate images at 1.99:1. Aspect ratio alone cannot tell
them apart, and choosing the recess produces a calibration that is wrong by
exactly the clearance we were trying to measure, while looking entirely
plausible. That is the worst failure mode available to this system.

So candidates are scored on several independent signals and all of them are
kept and returned ranked, so the pipeline can reason about the runner-up and a
human reviewer can see what else was on the table (§22).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import cv2
import numpy as np

from vehicle_fitment.pixels import PixelPoint, PixelQuad

# A plate images at 2:1 head-on; perspective squeezes that. Past roughly this
# band a candidate is something else, and forcing it would be worse than
# refusing (§26).
MIN_ASPECT = 1.25
MAX_ASPECT = 3.20
IDEAL_ASPECT = 2.00


@dataclass
class PlateCandidate:
    """One possible plate perimeter, with the evidence for and against it."""

    quad: PixelQuad
    score: float
    area_px: float
    aspect: float
    interior_brightness: float
    border_contrast: float
    solidity: float
    notes: list[str]

    @property
    def corner_sigma(self) -> float:
        return self.quad.mean_sigma


def _order_and_refine(
    approx: np.ndarray, gray: np.ndarray, blur_penalty: float
) -> PixelQuad | None:
    """Sub-pixel refine four corners and order them TL/TR/BR/BL.

    `cornerSubPix` also tells us how much to TRUST each corner: the distance it
    moved during refinement is a direct, honest proxy for localisation error, so
    it becomes the point's sigma rather than a constant guess. A corner that
    snaps cleanly is worth more than one that wanders, and the homography's
    uncertainty propagation consumes exactly that difference.
    """
    pts = approx.reshape(-1, 2).astype(np.float32)
    if pts.shape[0] != 4:
        return None
    before = pts.copy()
    try:
        cv2.cornerSubPix(
            gray,
            pts,
            (7, 7),
            (-1, -1),
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.01),
        )
    except cv2.error:
        pass

    points = []
    for i in range(4):
        moved = float(np.hypot(*(pts[i] - before[i])))
        # Floor of 0.5px: sub-pixel refinement is good but not magic. Blur widens
        # every edge, so it raises the floor proportionally.
        sigma = max(0.5 + blur_penalty, min(moved, 6.0))
        points.append(PixelPoint(float(pts[i][0]), float(pts[i][1]), sigma))
    try:
        return PixelQuad.from_unordered(points)
    except ValueError:
        return None


def _sample_interior(gray: np.ndarray, quad: PixelQuad) -> float:
    mask = np.zeros(gray.shape, dtype=np.uint8)
    poly = np.array([[int(p.x), int(p.y)] for p in quad.as_list()], dtype=np.int32)
    cv2.fillPoly(mask, [poly], 255)
    eroded = cv2.erode(mask, np.ones((9, 9), np.uint8), iterations=2)
    if cv2.countNonZero(eroded) < 20:
        eroded = mask
    return float(cv2.mean(gray, mask=eroded)[0])


def _border_contrast(gray: np.ndarray, quad: PixelQuad) -> float:
    """Difference between just inside and just outside the perimeter.

    A plate has a genuinely high-contrast edge (§12). A panel seam or a shadow
    boundary usually does not, which is what makes this worth measuring rather
    than assuming.
    """
    poly = np.array([[int(p.x), int(p.y)] for p in quad.as_list()], dtype=np.int32)
    filled = np.zeros(gray.shape, dtype=np.uint8)
    cv2.fillPoly(filled, [poly], 255)
    k = np.ones((11, 11), np.uint8)
    inner = cv2.erode(filled, k, iterations=1)
    outer = cv2.dilate(filled, k, iterations=1)
    ring_in = cv2.subtract(filled, inner)
    ring_out = cv2.subtract(outer, filled)
    if cv2.countNonZero(ring_in) < 10 or cv2.countNonZero(ring_out) < 10:
        return 0.0
    return abs(float(cv2.mean(gray, mask=ring_in)[0]) - float(cv2.mean(gray, mask=ring_out)[0]))


def detect_plate_candidates(
    image: np.ndarray, max_candidates: int = 8
) -> list[PlateCandidate]:
    """Rank plausible plate perimeters, best first. Returns [] if none qualify."""
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    h, w = gray.shape
    frame_area = float(h * w)

    # Estimate blur so corner sigmas can widen honestly on soft images.
    focus = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_penalty = 0.0 if focus > 500 else min(3.0, (500 - focus) / 200.0)

    # Two complementary edge maps. Canny finds crisp perimeters; adaptive
    # thresholding survives the uneven lighting real fascias have. Taking the
    # union costs little and avoids missing a plate that only one method sees.
    smoothed = cv2.bilateralFilter(gray, 9, 60, 60)
    edges = cv2.Canny(smoothed, 40, 140)
    adaptive = cv2.adaptiveThreshold(
        smoothed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 7
    )
    combined = cv2.bitwise_or(edges, cv2.Canny(adaptive, 40, 140))
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    contours, _ = cv2.findContours(combined, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    candidates: list[PlateCandidate] = []
    seen: list[tuple[float, float]] = []

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < frame_area * 0.0008 or area > frame_area * 0.97:
            continue

        # The upper bound is really guarding against ONE thing: the image border
        # being picked up as a rectangle. A blunt "no more than 75% of frame"
        # proxy also rejected a legitimate tight crop of a real plate that filled
        # 97% of its photograph -- found on the first real photograph tried, not
        # on any synthetic fixture. So reject what was actually meant: a quad
        # whose bounding box IS the frame.
        bx, by, bw, bh = cv2.boundingRect(contour)
        if bw >= w * 0.995 and bh >= h * 0.995:
            continue
        peri = cv2.arcLength(contour, True)
        if peri <= 0:
            continue
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue

        quad = _order_and_refine(approx, gray, blur_penalty)
        if quad is None:
            continue
        aspect = quad.aspect_ratio()
        if not (MIN_ASPECT <= aspect <= MAX_ASPECT):
            continue

        centre = (
            sum(p.x for p in quad.as_list()) / 4.0,
            sum(p.y for p in quad.as_list()) / 4.0,
        )
        if any(math.hypot(centre[0] - c[0], centre[1] - c[1]) < 12 for c in seen):
            continue

        hull_area = cv2.contourArea(cv2.convexHull(contour))
        solidity = area / hull_area if hull_area > 0 else 0.0
        interior = _sample_interior(gray, quad)
        contrast = _border_contrast(gray, quad)

        notes: list[str] = []
        # ── the scoring signals, each independent of the others ──
        aspect_score = max(0.0, 1.0 - abs(aspect - IDEAL_ASPECT) / IDEAL_ASPECT)

        # A U.S. plate face is light. This is the signal that separates the plate
        # from the dark recess around it, which aspect ratio alone cannot do.
        brightness_score = min(1.0, max(0.0, (interior - 60.0) / 150.0))
        if interior < 70:
            notes.append("interior is dark for a plate face")

        contrast_score = min(1.0, contrast / 60.0)
        size_score = min(1.0, (area / frame_area) / 0.10)
        solidity_score = min(1.0, solidity)

        score = (
            0.30 * aspect_score
            + 0.28 * brightness_score
            + 0.22 * contrast_score
            + 0.12 * size_score
            + 0.08 * solidity_score
        )

        seen.append(centre)
        candidates.append(
            PlateCandidate(
                quad=quad,
                score=round(score, 4),
                area_px=float(area),
                aspect=float(aspect),
                interior_brightness=interior,
                border_contrast=contrast,
                solidity=float(solidity),
                notes=notes,
            )
        )

    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:max_candidates]
