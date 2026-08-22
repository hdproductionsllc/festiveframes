"""Orchestration: one image in, one auditable geometry record out.

This is the only module that knows about both halves of the system, and it is
deliberately thin. It chooses an evidence level, calls perception for PIXELS,
hands those to geometry for INCHES, scores confidence, and refuses when the
ladder bottoms out (§26). No measurement arithmetic happens here.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from vehicle_fitment.confidence.score import ConfidenceReport, Status
from vehicle_fitment.evidence.levels import EvidenceLevel, profile_for
from vehicle_fitment.geometry.canonical import US_STANDARD_PLATE, PlateStandard
from vehicle_fitment.geometry.clearance import (
    DEFAULT_SAFETY_MARGIN_INCHES,
    ClearanceResult,
    measure_clearances,
)
from vehicle_fitment.geometry.homography import PlateCalibration, calibrate_from_plate_corners
from vehicle_fitment.geometry.measurement import Measurement
from vehicle_fitment.perception.obstruction import ObstructionProposal, detect_obstructions
from vehicle_fitment.perception.plate import PlateCandidate, detect_plate_candidates
from vehicle_fitment.product.profile import FitmentVerdict, FrameProfile, evaluate

ALGORITHM_VERSION = "v1.0.0"


@dataclass
class Obstruction:
    """An obstruction, once measured into canonical inches."""

    kind: str
    label_confidence: float
    detail: str
    polygon_inches: list[tuple[float, float]]
    distance_from_plate_inches: float


@dataclass
class AnalysisResult:
    """Everything needed to reproduce, review and audit one measurement (§29)."""

    source_path: str
    image_hash: str
    algorithm_version: str
    level: EvidenceLevel
    plate_detected: bool
    calibration: PlateCalibration | None
    clearances: ClearanceResult | None
    obstructions: list[Obstruction]
    confidence: ConfidenceReport
    candidates_considered: int
    runner_up_score: float | None
    fitment: FitmentVerdict | None = None
    refusal_reason: str | None = None
    warnings: list[str] = field(default_factory=list)

    @property
    def status(self) -> Status:
        return self.confidence.status


def _hash(image_path: Path) -> str:
    return hashlib.sha256(image_path.read_bytes()).hexdigest()[:16]


def analyse(
    image: np.ndarray,
    source_path: str | Path,
    standard: PlateStandard = US_STANDARD_PLATE,
    frame_id: str | None = "candidate-7in",
    safety_margin_inches: float = DEFAULT_SAFETY_MARGIN_INCHES,
) -> AnalysisResult:
    path = Path(source_path)
    image_hash = _hash(path) if path.exists() else "n/a"
    warnings: list[str] = []

    candidates: list[PlateCandidate] = detect_plate_candidates(image)
    if not candidates:
        # §26's floor. Not an exception, not a guess: a result that says no.
        return AnalysisResult(
            source_path=str(path),
            image_hash=image_hash,
            algorithm_version=ALGORITHM_VERSION,
            level=EvidenceLevel.NONE,
            plate_detected=False,
            calibration=None,
            clearances=None,
            obstructions=[],
            confidence=ConfidenceReport(EvidenceLevel.NONE),
            candidates_considered=0,
            runner_up_score=None,
            refusal_reason=(
                "No plate perimeter found. Ask for a straight-on photograph of "
                "the vehicle's rear (spec section 27)."
            ),
            warnings=warnings,
        )

    best = candidates[0]
    runner_up = candidates[1].score if len(candidates) > 1 else None

    level = EvidenceLevel.B_PLATE_PERIMETER
    cal = calibrate_from_plate_corners(best.quad, standard, profile_for(level).method)

    if not cal.quality.is_usable:
        return AnalysisResult(
            source_path=str(path),
            image_hash=image_hash,
            algorithm_version=ALGORITHM_VERSION,
            level=EvidenceLevel.NONE,
            plate_detected=True,
            calibration=cal,
            clearances=None,
            obstructions=[],
            confidence=ConfidenceReport(EvidenceLevel.NONE),
            candidates_considered=len(candidates),
            runner_up_score=runner_up,
            refusal_reason=(
                f"Perspective is {cal.quality.label} "
                f"(foreshortening {cal.quality.foreshortening:.2f}, "
                f"skew {cal.quality.skew_degrees:.1f} deg). Rectifying this would "
                "produce numbers that look precise and are not."
            ),
            warnings=warnings,
        )

    clearances = measure_clearances(
        image, cal, safety_margin_inches=safety_margin_inches
    )

    obstructions: list[Obstruction] = []
    for prop in detect_obstructions(image, best.quad.as_list()):
        poly_in = [cal.to_inches(p.x, p.y) for p in prop.polygon_px]
        cx = sum(p[0] for p in poly_in) / len(poly_in)
        cy = sum(p[1] for p in poly_in) / len(poly_in)
        dx = max(0.0, abs(cx) - standard.half_width)
        dy = max(0.0, abs(cy) - standard.half_height)
        obstructions.append(
            Obstruction(
                kind=prop.kind.value,
                label_confidence=prop.label_confidence,
                detail=prop.detail,
                polygon_inches=poly_in,
                distance_from_plate_inches=float(np.hypot(dx, dy)),
            )
        )

    # ── confidence, with its reasons (§18) ─────────────────────────────────
    report = ConfidenceReport(level)
    q = cal.quality
    report.add(
        "perspective",
        {"HIGH": 1.0, "MEDIUM": 0.93, "LOW": 0.80}.get(q.label, 0.5),
        f"{q.label} (foreshortening {q.foreshortening:.2f}, skew {q.skew_degrees:.1f} deg)",
    )
    report.add(
        "corner localisation",
        max(0.55, min(1.0, 1.0 - (best.quad.mean_sigma - 1.0) * 0.06)),
        f"mean corner sigma {best.quad.mean_sigma:.2f} px",
    )
    report.add(
        "detector margin",
        1.0 if runner_up is None else max(0.72, min(1.0, 0.72 + (best.score - runner_up))),
        "single candidate" if runner_up is None
        else f"best {best.score:.3f} vs runner-up {runner_up:.3f}",
    )
    known = [m for m in clearances.raw().values() if m.is_known]
    report.add(
        "edge coverage",
        max(0.4, len(known) / 4.0),
        f"{len(known)} of 4 edges measured",
    )
    # §19: one image is one opinion. Until several agree, say so.
    report.add("single image", 0.95, "1 image, 1 source; no cross-image agreement yet")

    if best.interior_brightness < 90:
        warnings.append(
            "Chosen region is dark for a plate face; it may be the recess rather "
            "than the plate. Check the annotated image."
        )
    if runner_up is not None and best.score - runner_up < 0.10:
        warnings.append(
            f"Runner-up candidate scored {runner_up:.3f} against {best.score:.3f}. "
            "Two rectangles here look alike; a reviewer should confirm which is the plate."
        )

    fitment = None
    if frame_id:
        fitment = evaluate(
            clearances.raw(), FrameProfile.load(frame_id),
            standard.half_width, standard.half_height, safety_margin_inches,
        )

    return AnalysisResult(
        source_path=str(path),
        image_hash=image_hash,
        algorithm_version=ALGORITHM_VERSION,
        level=level,
        plate_detected=True,
        calibration=cal,
        clearances=clearances,
        obstructions=obstructions,
        confidence=report,
        candidates_considered=len(candidates),
        runner_up_score=runner_up,
        fitment=fitment,
        warnings=warnings,
    )
