"""The evidence ladder (spec §5) and the fallback hierarchy (§26).

§26's rule is the reason this file is small and blunt: "The system must NEVER
invent exact dimensions when evidence is inadequate... A bad answer is worse than
no answer." So the ladder terminates in a REFUSAL that is an ordinary return
value, not an exception and not a low-confidence guess dressed up as a result.

Each level carries a CONFIDENCE CEILING. That is how §35 ("confidence must
decrease when evidence decreases") is made structural rather than aspirational:
no amount of clean pixels can push a recess-derived estimate above what recess
evidence is worth, because the ceiling is applied after every other factor.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from vehicle_fitment.geometry.measurement import Method


class EvidenceLevel(str, Enum):
    A_MOUNTING_POINTS = "A"
    B_PLATE_PERIMETER = "B"
    C_PLATE_RECESS = "C"
    D_PARTIAL = "D"
    E_CROSS_IMAGE = "E"
    F_CUSTOMER_PHOTO = "F"
    NONE = "none"


@dataclass(frozen=True)
class LevelProfile:
    level: EvidenceLevel
    ceiling: float
    method: Method
    description: str


# Ceilings are engineering judgement, not measurement, and are stated here in one
# place so they can be argued with. The ORDER is the part that is not negotiable:
# it must be monotonically decreasing down the ladder, and a property test in
# tests/test_confidence.py asserts exactly that.
_PROFILES: dict[EvidenceLevel, LevelProfile] = {
    EvidenceLevel.A_MOUNTING_POINTS: LevelProfile(
        EvidenceLevel.A_MOUNTING_POINTS, 1.00, Method.MEASURED,
        "Four real mounting points located on the vehicle",
    ),
    EvidenceLevel.B_PLATE_PERIMETER: LevelProfile(
        EvidenceLevel.B_PLATE_PERIMETER, 0.95, Method.MEASURED,
        "Plate perimeter fully visible and rectified",
    ),
    EvidenceLevel.C_PLATE_RECESS: LevelProfile(
        EvidenceLevel.C_PLATE_RECESS, 0.85, Method.INFERRED,
        "Plate absent or hidden; OEM recess used as the reference",
    ),
    EvidenceLevel.D_PARTIAL: LevelProfile(
        EvidenceLevel.D_PARTIAL, 0.75, Method.ESTIMATED,
        "Only part of the plate or recess visible; constrained estimate",
    ),
    EvidenceLevel.E_CROSS_IMAGE: LevelProfile(
        EvidenceLevel.E_CROSS_IMAGE, 0.70, Method.ESTIMATED,
        "Reconstructed across several images of the same geometry family",
    ),
    EvidenceLevel.F_CUSTOMER_PHOTO: LevelProfile(
        EvidenceLevel.F_CUSTOMER_PHOTO, 0.90, Method.MEASURED,
        "Customer-supplied photograph of their own vehicle",
    ),
    EvidenceLevel.NONE: LevelProfile(
        EvidenceLevel.NONE, 0.0, Method.UNKNOWN,
        "No usable evidence; no automatic fitment",
    ),
}


def profile_for(level: EvidenceLevel) -> LevelProfile:
    return _PROFILES[level]


# §26's ladder, in order. Walked top to bottom; the first level whose evidence is
# actually present wins. Nothing below NONE exists -- that IS the bottom, and it
# means "ask the customer for a photo" (§27).
FALLBACK_ORDER: list[EvidenceLevel] = [
    EvidenceLevel.A_MOUNTING_POINTS,
    EvidenceLevel.B_PLATE_PERIMETER,
    EvidenceLevel.C_PLATE_RECESS,
    EvidenceLevel.D_PARTIAL,
    EvidenceLevel.E_CROSS_IMAGE,
    EvidenceLevel.NONE,
]
