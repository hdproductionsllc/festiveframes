"""Synthetic rear-fascia scenes with EXACT ground truth.

Why this exists, and why it is not a shortcut around real photographs:

A real photo can only ever tell us whether an answer looks plausible. Nobody
knows, to a thousandth of an inch, how far a 2025 CR-V's tailgate seam actually
sits from its plate — so a real photo cannot measure the ERROR of a measurement
system, only its output. Here the truth is chosen before the pixels exist, so the
error is knowable exactly, and questions the spec cares about become answerable:

  - How much does accuracy degrade at 30 degrees of yaw versus straight on? (§11)
  - Does uncertainty GROW with obliqueness, or does it lie flat? (§20)
  - Does the system refuse when it should, instead of guessing? (§26)

Real photographs remain necessary and are what §37's five vehicles are for. They
answer "does the detector find the plate in the wild". This answers "and when it
does, is the number right". Both, or neither is worth much.

Everything is drawn by projecting CANONICAL INCHES through a known homography, so
the scene definition and the geometry engine share one coordinate language.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import cv2
import numpy as np

from vehicle_fitment.geometry.canonical import US_STANDARD_PLATE, PlateStandard


@dataclass
class GroundTruth:
    """What the scene IS, before any pixel is drawn. Inches, canonical frame."""

    left_clearance: float
    right_clearance: float
    top_clearance: float
    bottom_clearance: float
    plate_corners_px: list[tuple[float, float]]
    homography_inches_to_px: np.ndarray
    yaw_degrees: float
    pitch_degrees: float
    obstructions: dict[str, tuple[float, float]] = field(default_factory=dict)

    @property
    def body_left(self) -> float:
        return -(US_STANDARD_PLATE.half_width + self.left_clearance)

    @property
    def body_right(self) -> float:
        return US_STANDARD_PLATE.half_width + self.right_clearance

    @property
    def body_top(self) -> float:
        return US_STANDARD_PLATE.half_height + self.top_clearance

    @property
    def body_bottom(self) -> float:
        return -(US_STANDARD_PLATE.half_height + self.bottom_clearance)


@dataclass
class SceneSpec:
    """The knobs. Defaults describe a clean, straight-on, well-lit rear."""

    left_clearance: float = 1.20
    right_clearance: float = 1.20
    top_clearance: float = 0.50
    bottom_clearance: float = 0.75
    yaw_degrees: float = 0.0
    pitch_degrees: float = 0.0
    roll_degrees: float = 0.0
    image_size: tuple[int, int] = (1600, 1000)
    plate_px_width: float = 620.0
    blur_sigma: float = 0.0
    noise_sigma: float = 0.0
    glare: bool = False
    plate_characters: bool = True
    backup_camera: bool = True
    hatch_seam: bool = True
    recess_shadow_line: bool = False
    """Draw a dark stroke ON the recess boundary. Realistic -- real openings
    have a shadow gap -- but it makes the TRUE boundary ambiguous by half the
    stroke width, so accuracy fixtures leave it off and the ground truth is a
    single unambiguous step. On for robustness cases, off for error cases."""

    occlude_fraction: float = 0.0
    """Blank out this fraction of the plate from the left, simulating a partial
    view. Used to prove the system DEGRADES rather than guessing (§26)."""

    body_colour: tuple[int, int, int] = (58, 60, 64)
    plate_colour: tuple[int, int, int] = (232, 234, 230)
    recess_colour: tuple[int, int, int] = (38, 40, 44)


def _pose_quad(spec: SceneSpec, standard: PlateStandard) -> list[tuple[float, float]]:
    """Where the plate's four corners land in pixels, for the requested pose.

    A plate is planar, so a full camera model is unnecessary: yaw and pitch are
    applied as a genuine perspective foreshortening of the near/far edges, which
    is exactly what a real oblique photograph does to a flat rectangle.
    """
    cx, cy = spec.image_size[0] / 2.0, spec.image_size[1] / 2.0
    half_w = spec.plate_px_width / 2.0
    half_h = half_w * (standard.height_inches / standard.width_inches)

    yaw = math.radians(spec.yaw_degrees)
    pitch = math.radians(spec.pitch_degrees)

    # Perspective divisor per corner: a corner rotated away from the camera
    # images smaller. depth ~ 1 + sin(angle) * normalised offset.
    corners_in = standard.corners_clockwise_from_top_left()
    out: list[tuple[float, float]] = []
    for (ix, iy) in corners_in:
        nx = ix / standard.half_width
        ny = iy / standard.half_height
        depth = 1.0 + 0.42 * (nx * math.sin(yaw) + ny * math.sin(pitch))
        px = cx + (nx * half_w) / depth
        py = cy - (ny * half_h) / depth
        out.append((px, py))

    if spec.roll_degrees:
        r = math.radians(spec.roll_degrees)
        cos_r, sin_r = math.cos(r), math.sin(r)
        out = [
            (
                cx + (x - cx) * cos_r - (y - cy) * sin_r,
                cy + (x - cx) * sin_r + (y - cy) * cos_r,
            )
            for x, y in out
        ]
    return out


def render(spec: SceneSpec | None = None, standard: PlateStandard = US_STANDARD_PLATE):
    """Render a scene. Returns (BGR image, GroundTruth)."""
    spec = spec or SceneSpec()
    w, h = spec.image_size
    img = np.full((h, w, 3), 96, dtype=np.uint8)

    quad_px = _pose_quad(spec, standard)
    h_in_to_px = cv2.getPerspectiveTransform(
        np.array(standard.corners_clockwise_from_top_left(), dtype=np.float32),
        np.array(quad_px, dtype=np.float32),
    ).astype(np.float64)

    def project(x_in: float, y_in: float) -> tuple[int, int]:
        v = h_in_to_px @ np.array([x_in, y_in, 1.0])
        return (int(round(v[0] / v[2])), int(round(v[1] / v[2])))

    def poly(points_in: list[tuple[float, float]]) -> np.ndarray:
        return np.array([project(*p) for p in points_in], dtype=np.int32)

    truth = GroundTruth(
        left_clearance=spec.left_clearance,
        right_clearance=spec.right_clearance,
        top_clearance=spec.top_clearance,
        bottom_clearance=spec.bottom_clearance,
        plate_corners_px=quad_px,
        homography_inches_to_px=h_in_to_px,
        yaw_degrees=spec.yaw_degrees,
        pitch_degrees=spec.pitch_degrees,
    )

    # Body panel: a broad fascia, deliberately larger than the recess.
    cv2.fillPoly(img, [poly([(-26, 16), (26, 16), (26, -14), (-26, -14)])], spec.body_colour)

    # The recess/opening the plate sits in. Its edges ARE the clearances.
    recess = [
        (truth.body_left, truth.body_top),
        (truth.body_right, truth.body_top),
        (truth.body_right, truth.body_bottom),
        (truth.body_left, truth.body_bottom),
    ]
    cv2.fillPoly(img, [poly(recess)], spec.recess_colour)
    if spec.recess_shadow_line:
        cv2.polylines(img, [poly(recess)], True, (20, 21, 24), 3, cv2.LINE_AA)

    # The plate: light face, dark border. §12 wants it found by GEOMETRY, so the
    # contrast at the perimeter is what matters, not the characters.
    plate_corners = standard.corners_clockwise_from_top_left()
    cv2.fillPoly(img, [poly(plate_corners)], spec.plate_colour)
    cv2.polylines(img, [poly(plate_corners)], True, (44, 46, 52), 2, cv2.LINE_AA)

    if spec.plate_characters:
        # Deliberately smeared. If the pipeline ever depends on these being
        # legible, that is a bug the spec calls out by name (§12).
        for i in range(6):
            x = -4.2 + i * 1.7
            cv2.rectangle(
                img,
                project(x - 0.45, 1.35),
                project(x + 0.45, -1.35),
                (120, 124, 136),
                -1,
            )

    if spec.backup_camera:
        centre = (0.0, truth.body_top + 0.85)
        cv2.circle(img, project(*centre), max(6, int(spec.plate_px_width * 0.028)), (18, 18, 22), -1)
        truth.obstructions["backup_camera"] = centre

    if spec.hatch_seam:
        y = truth.body_bottom - 0.55
        cv2.line(img, project(-24, y), project(24, y), (26, 27, 30), 3, cv2.LINE_AA)
        truth.obstructions["hatch_seam"] = (0.0, y)

    if spec.occlude_fraction > 0:
        cut = standard.left + standard.width_inches * spec.occlude_fraction
        cv2.fillPoly(
            img,
            [poly([(standard.left - 2, standard.top + 2), (cut, standard.top + 2),
                   (cut, standard.bottom - 2), (standard.left - 2, standard.bottom - 2)])],
            (70, 72, 78),
        )

    if spec.glare:
        overlay = img.copy()
        cv2.ellipse(
            overlay,
            project(2.5, 1.0),
            (int(spec.plate_px_width * 0.20), int(spec.plate_px_width * 0.10)),
            0, 0, 360, (255, 255, 255), -1,
        )
        img = cv2.addWeighted(overlay, 0.42, img, 0.58, 0)

    if spec.blur_sigma > 0:
        k = int(spec.blur_sigma * 4) | 1
        img = cv2.GaussianBlur(img, (k, k), spec.blur_sigma)

    if spec.noise_sigma > 0:
        noise = np.random.default_rng(7).normal(0, spec.noise_sigma, img.shape)
        img = np.clip(img.astype(np.float64) + noise, 0, 255).astype(np.uint8)

    return img, truth
