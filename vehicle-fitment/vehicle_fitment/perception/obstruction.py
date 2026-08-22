"""Obstruction proposals (spec §16). PIXELS ONLY -- never inches.

§16 lists the things that matter around a plate: cameras, sensors, lamps, seams,
badges, handles, exhaust. It also says something easy to skip past and important:
"Do not automatically classify every visible object. Unknown objects should be
allowed."

So this proposes REGIONS with a label that may well be `UNKNOWN`, and the label
carries its own confidence separate from the region's. A dark disc above a plate
is very probably a reversing camera, but "probably" is the honest word, and a
mislabelled obstruction that a reviewer trusts is worse than an unlabelled one
they look at.

Classification here is deliberately shallow -- shape, size, position. §33 expects
a trained model to take this over; the interface is what matters now, and the
geometry engine downstream does not care which produced the region.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum

import cv2
import numpy as np

from vehicle_fitment.pixels import PixelPoint


class ObstructionType(str, Enum):
    TAIL_LAMP = "tail_lamp"
    BACKUP_CAMERA = "backup_camera"
    PARKING_SENSOR = "parking_sensor"
    RADAR_SENSOR = "radar_sensor"
    TRUNK_RELEASE = "trunk_release"
    HATCH_SEAM = "hatch_seam"
    BODY_PANEL_SEAM = "body_panel_seam"
    TRIM = "trim"
    BADGE = "badge"
    REFLECTOR = "reflector"
    EXHAUST = "exhaust"
    TOW_HITCH = "tow_hitch"
    REAR_WIPER = "rear_wiper"
    OTHER = "other"
    UNKNOWN = "unknown"


@dataclass
class ObstructionProposal:
    """A region of interest in PIXELS, with a guess at what it is."""

    kind: ObstructionType
    polygon_px: list[PixelPoint]
    label_confidence: float
    detail: str

    def centroid(self) -> PixelPoint:
        n = len(self.polygon_px)
        return PixelPoint(
            sum(p.x for p in self.polygon_px) / n,
            sum(p.y for p in self.polygon_px) / n,
        )


def _quad_bounds(quad_pts: list[PixelPoint]) -> tuple[float, float, float, float]:
    xs = [p.x for p in quad_pts]
    ys = [p.y for p in quad_pts]
    return min(xs), min(ys), max(xs), max(ys)


def detect_obstructions(
    image: np.ndarray,
    plate_quad_px: list[PixelPoint],
    search_radius_multiple: float = 1.9,
) -> list[ObstructionProposal]:
    """Propose obstructions in the neighbourhood of the plate.

    Search is bounded to a neighbourhood because §13's warning about mounting
    points applies here too: the further afield the search, the more taillight
    screws and body clips get swept up as though they were near the frame.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    h, w = gray.shape
    x0, y0, x1, y1 = _quad_bounds(plate_quad_px)
    pw, ph = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    # Bounded tightly on purpose. An over-large window drags in taillights and
    # bumper trim, and -- found the hard way -- it also poisons any threshold
    # computed from the window's own statistics, because the sample becomes
    # mostly body paint rather than the plate's surroundings.
    rx = pw * search_radius_multiple
    ry = ph * search_radius_multiple
    rx0, ry0 = int(max(0, cx - rx)), int(max(0, cy - ry))
    rx1, ry1 = int(min(w, cx + rx)), int(min(h, cy + ry))
    roi = gray[ry0:ry1, rx0:rx1].copy()
    if roi.size == 0:
        return []

    # BLANK THE PLATE FACE BEFORE LOOKING FOR DARK FEATURES.
    #
    # The registration characters are the darkest small objects in the whole
    # neighbourhood -- far darker against the plate than a camera is against the
    # recess -- so any contrast-based detector finds the lettering first and
    # Otsu then thresholds the real obstructions away. We already know exactly
    # where the plate is, and by §12 its contents are of no interest, so the
    # face is filled with the local median: no lettering, and no artificial edge
    # introduced at the fill boundary either.
    plate_local = np.array(
        [[int(p.x) - rx0, int(p.y) - ry0] for p in plate_quad_px], dtype=np.int32
    )
    plate_mask = np.zeros(roi.shape, dtype=np.uint8)
    cv2.fillPoly(plate_mask, [plate_local], 255)
    outside = roi[plate_mask == 0]
    if outside.size:
        roi[plate_mask > 0] = int(np.median(outside))

    proposals: list[ObstructionProposal] = []
    plate_area = max(1.0, pw * ph)

    # ── dark compact blobs: cameras, sensors, badges ────────────────────────
    #
    # A black-hat finds dark structures SMALLER than its kernel sitting on a
    # lighter background, which is exactly what a camera or a sensor is. An
    # absolute or percentile threshold cannot express that: the recess floor is
    # darker than the body paint around it, so any global cut either swallows
    # the whole recess or misses a camera sitting inside it. Black-hat is
    # local by construction and sidesteps the choice entirely.
    k = max(9, (int(pw * 0.10) | 1))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    blackhat = cv2.morphologyEx(roi, cv2.MORPH_BLACKHAT, kernel)
    _, dark = cv2.threshold(blackhat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < plate_area * 0.0004 or area > plate_area * 0.20:
            continue
        peri = cv2.arcLength(contour, True)
        if peri <= 0:
            continue
        circularity = 4 * math.pi * area / (peri * peri)
        (bx, by, bw, bh) = cv2.boundingRect(contour)
        gcx, gcy = rx0 + bx + bw / 2.0, ry0 + by + bh / 2.0

        # The recess boundary is a long, strong, curved edge, and a black-hat
        # breaks it into thin slivers that are technically dark regions and are
        # not obstructions. A real fitting -- camera, sensor, badge, release --
        # is a COMPACT object: it fills a healthy fraction of its own bounding
        # box. Slivers do not. §16 permits unknown labels, but a reviewer facing
        # seven phantom unknowns per image stops reading them, which costs more
        # than the occasional missed sliver.
        extent = area / float(max(1, bw * bh))
        elongation = max(bw, bh) / float(max(1, min(bw, bh)))
        if extent < 0.35 or elongation > 4.0:
            continue

        # Inside the plate itself is lettering, not an obstruction.
        if x0 < gcx < x1 and y0 < gcy < y1:
            continue

        above = gcy < y0
        if circularity > 0.62 and 0.6 < bw / max(bh, 1) < 1.7:
            if above and abs(gcx - cx) < pw * 0.30:
                kind, conf = ObstructionType.BACKUP_CAMERA, 0.62
                detail = "round, centred, above the plate"
            else:
                kind, conf = ObstructionType.PARKING_SENSOR, 0.38
                detail = "round, off-centre"
        else:
            kind, conf = ObstructionType.UNKNOWN, 0.25
            detail = f"dark region, circularity {circularity:.2f}"

        poly = [
            PixelPoint(rx0 + bx, ry0 + by),
            PixelPoint(rx0 + bx + bw, ry0 + by),
            PixelPoint(rx0 + bx + bw, ry0 + by + bh),
            PixelPoint(rx0 + bx, ry0 + by + bh),
        ]
        proposals.append(ObstructionProposal(kind, poly, conf, detail))

    # ── long straight lines: panel seams ────────────────────────────────────
    edges = cv2.Canny(cv2.GaussianBlur(roi, (5, 5), 0), 40, 120)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=max(40, int(pw * 0.30)),
        minLineLength=int(pw * 0.85),
        maxLineGap=int(pw * 0.10),
    )
    if lines is not None:
        # OpenCV 4 returns (N, 1, 4); OpenCV 5 returns (N, 4). Reshape rather
        # than index, so this works on whichever the desktop happens to install.
        segments = np.asarray(lines).reshape(-1, 4)
        for lx0, ly0, lx1, ly1 in segments[:12]:
            ax, ay = rx0 + float(lx0), ry0 + float(ly0)
            bx2, by2 = rx0 + float(lx1), ry0 + float(ly1)
            if x0 < (ax + bx2) / 2 < x1 and y0 < (ay + by2) / 2 < y1:
                continue
            angle = abs(math.degrees(math.atan2(by2 - ay, bx2 - ax)))
            if angle > 20 and angle < 160:
                continue  # near-vertical lines here are usually trim, not seams
            mid_y = (ay + by2) / 2.0
            kind = ObstructionType.HATCH_SEAM if mid_y > y1 else ObstructionType.BODY_PANEL_SEAM
            proposals.append(
                ObstructionProposal(
                    kind,
                    [PixelPoint(ax, ay), PixelPoint(bx2, by2),
                     PixelPoint(bx2, by2 + 2), PixelPoint(ax, ay + 2)],
                    0.40,
                    f"horizontal line, {angle:.0f} deg",
                )
            )

    # Deduplicate by centroid so one feature is not reported five times.
    kept: list[ObstructionProposal] = []
    for p in proposals:
        c = p.centroid()
        if any(c.distance_to(k.centroid()) < pw * 0.06 for k in kept):
            continue
        kept.append(p)
    return kept
