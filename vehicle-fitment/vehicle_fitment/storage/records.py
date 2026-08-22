"""Evidence storage (spec §29, §30).

§29: "Every geometry calculation must be reproducible. Never store only the final
number." §30: keep the original, the normalized, the annotated and the geometry
JSON separately, and never overwrite original evidence.

So a run writes four artefacts under `data/`, keyed by the image's content hash:

    originals/   the source image, copied byte for byte
    normalized/  the plate rectified to a canonical 12 x 6 plane
    annotated/   what the reviewer looks at
    records/     the geometry JSON, including the homography itself

The homography matrix is stored, not just the clearances it produced. That is
what makes a v1 -> v2 algorithm change auditable: the same evidence can be
reprocessed and the two answers compared, rather than the old number simply
being replaced by a new one with no way to see what moved.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np

from vehicle_fitment.geometry.measurement import Measurement
from vehicle_fitment.product.profile import FrameProfile

NORMALIZED_PX_PER_INCH = 50


def _measurement(m: Measurement) -> dict:
    return {
        "value": None if not m.is_known else round(m.value, 4),
        "uncertainty": None if not m.is_known else round(m.uncertainty, 4),
        "method": m.method.value,
    }


def _normalized(image: np.ndarray, cal) -> np.ndarray | None:
    """The plate rectified to a canonical plane, with room around it.

    Stored because it is the one view where a human can check the calibration by
    eye: if the plate is not a clean rectangle here, the homography is wrong, and
    every inch downstream is wrong with it.
    """
    std = cal.standard
    pad = 6.0
    w = int((std.width_inches + pad * 2) * NORMALIZED_PX_PER_INCH)
    h = int((std.height_inches + pad * 2) * NORMALIZED_PX_PER_INCH)
    src = np.array([[p.x, p.y] for p in cal.quad.as_list()], dtype=np.float32)
    dst = np.array([
        [(pad) * NORMALIZED_PX_PER_INCH, (pad) * NORMALIZED_PX_PER_INCH],
        [(pad + std.width_inches) * NORMALIZED_PX_PER_INCH, (pad) * NORMALIZED_PX_PER_INCH],
        [(pad + std.width_inches) * NORMALIZED_PX_PER_INCH, (pad + std.height_inches) * NORMALIZED_PX_PER_INCH],
        [(pad) * NORMALIZED_PX_PER_INCH, (pad + std.height_inches) * NORMALIZED_PX_PER_INCH],
    ], dtype=np.float32)
    try:
        m = cv2.getPerspectiveTransform(src, dst)
        return cv2.warpPerspective(image, m, (w, h))
    except cv2.error:
        return None


def save_record(result, image: np.ndarray, source: Path, out_dir: Path,
                frame: FrameProfile | None) -> dict[str, str]:
    from vehicle_fitment.annotate import annotate  # local: avoids a cycle

    stamp = result.image_hash
    dirs = {name: out_dir / name for name in ("originals", "normalized", "annotated", "records")}
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    paths: dict[str, str] = {}

    # §30: the original is COPIED, never written through.
    original_dest = dirs["originals"] / f"{stamp}{source.suffix or '.png'}"
    if not original_dest.exists():
        shutil.copy2(source, original_dest)
    paths["original"] = str(original_dest)

    annotated = annotate(image, result, frame)
    annotated_path = dirs["annotated"] / f"{stamp}.png"
    cv2.imwrite(str(annotated_path), annotated)
    paths["annotated"] = str(annotated_path)

    if result.calibration is not None:
        norm = _normalized(image, result.calibration)
        if norm is not None:
            norm_path = dirs["normalized"] / f"{stamp}.png"
            cv2.imwrite(str(norm_path), norm)
            paths["normalized"] = str(norm_path)

    cal = result.calibration
    record = {
        "schema": "vehicle_fitment.geometry_record/1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "algorithm_version": result.algorithm_version,
        "source": {
            "path": str(source),
            "image_hash": result.image_hash,
            "width": int(image.shape[1]),
            "height": int(image.shape[0]),
        },
        "evidence_level": result.level.value,
        "plate_detected": result.plate_detected,
        "candidates_considered": result.candidates_considered,
        "runner_up_score": result.runner_up_score,
        "refusal_reason": result.refusal_reason,
        "warnings": result.warnings,
        "coordinate_system": {
            "origin": "plate centre",
            "x": "rightward, inches",
            "y": "UPWARD, inches",
            "note": (
                "Spec section 10. The Festive Frames application uses top-left "
                "origin with +Y DOWN; convert only via "
                "vehicle_fitment.product.convention."
            ),
        },
        "confidence": {
            "score": result.confidence.score,
            "status": result.status.value,
            "level_ceiling": result.confidence.ceiling,
            "factors": [
                {"name": f.name, "multiplier": f.multiplier, "detail": f.detail}
                for f in result.confidence.factors
            ],
            "thresholds": {
                "green": result.confidence.green_threshold,
                "yellow": result.confidence.yellow_threshold,
            },
        },
    }

    if cal is not None:
        record["calibration"] = {
            "method": cal.method.value,
            "source_note": cal.source_note,
            "homography_px_to_inches": [[float(v) for v in row] for row in cal.homography],
            "inverse_inches_to_px": [[float(v) for v in row] for row in cal.inverse],
            "plate_standard": cal.standard.name,
            "plate_corners_px": [
                {"x": p.x, "y": p.y, "sigma": p.sigma} for p in cal.quad.as_list()
            ],
            "nominal_hole_centres_inches": cal.standard.nominal_hole_centres(),
            "mounting_deviation_inches": cal.mounting_deviation_inches,
            "perspective": {
                "label": cal.quality.label,
                "foreshortening": round(cal.quality.foreshortening, 4),
                "skew_degrees": round(cal.quality.skew_degrees, 3),
                "aspect_error": round(cal.quality.aspect_error, 4),
            },
            "inches_per_pixel_at_plate": round(cal.inches_per_pixel_at_plate(), 6),
        }

    if result.clearances is not None:
        record["clearance"] = {
            "raw": {k: _measurement(v) for k, v in result.clearances.raw().items()},
            "safe": {k: _measurement(v) for k, v in result.clearances.safe().items()},
            "safety_margin_inches": result.clearances.safety_margin_inches,
            "usable_polygon_inches": [
                [round(x, 4), round(y, 4)] for x, y in result.clearances.usable_polygon
            ],
        }

    record["obstructions"] = [
        {
            "type": o.kind,
            "label_confidence": o.label_confidence,
            "detail": o.detail,
            "distance_from_plate_inches": round(o.distance_from_plate_inches, 4),
            "polygon_inches": [[round(x, 4), round(y, 4)] for x, y in o.polygon_inches],
        }
        for o in result.obstructions
    ]

    if result.fitment is not None and frame is not None:
        record["fitment"] = {
            "frame_id": frame.id,
            "frame_status": frame.status,
            "fits": result.fitment.fits,
            "undetermined_edges": result.fitment.undetermined,
            "edges": [
                {
                    "edge": e.edge,
                    "required_inches": round(e.required, 4),
                    "available": _measurement(e.available),
                    "fits_nominal": e.fits_nominal,
                    "fits_worst_case": e.fits_worst_case,
                    "shortfall_inches": round(e.shortfall, 4),
                }
                for e in result.fitment.edges
            ],
        }

    record_path = dirs["records"] / f"{stamp}.json"
    record_path.write_text(json.dumps(record, indent=2))
    paths["record"] = str(record_path)
    return paths
