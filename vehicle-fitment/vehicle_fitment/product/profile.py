"""The PRODUCT side of fitment (spec §14).

§14 insists the vehicle database answers "what area is available?" and the
product database answers "what area does our frame require?", with the fitment
engine multiplying the two. The reason is written into the spec and confirmed by
this project's own history: the physical frame is still moving. Bill's 8 inch
build failed a Honda Pilot; a 7 inch candidate is staged and unverified. A
vehicle record measured today must not have to be re-measured when the frame
changes, so no product dimension appears anywhere in the vehicle geometry.

Frames are therefore DATA, loaded from JSON, never constants in the engine.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from vehicle_fitment.geometry.measurement import Measurement

FRAMES_DIR = Path(__file__).parent / "frames"


@dataclass(frozen=True)
class RequiredRegion:
    """The rectangle the frame occupies, in §10 canonical inches."""

    left: float
    right: float
    top: float
    bottom: float

    def reach_beyond_plate(self, half_width: float, half_height: float) -> dict[str, float]:
        """How far past each plate edge the frame extends. These are the numbers
        that must be compared against the vehicle's clearances."""
        return {
            "left": max(0.0, -self.left - half_width),
            "right": max(0.0, self.right - half_width),
            "top": max(0.0, self.top - half_height),
            "bottom": max(0.0, -self.bottom - half_height),
        }


@dataclass(frozen=True)
class FrameProfile:
    id: str
    name: str
    status: str
    note: str
    required_region: RequiredRegion

    @classmethod
    def load(cls, identifier: str) -> "FrameProfile":
        path = FRAMES_DIR / f"{identifier}.json"
        if not path.exists():
            raise FileNotFoundError(f"no frame profile {identifier!r} in {FRAMES_DIR}")
        raw = json.loads(path.read_text())
        r = raw["required_region"]
        return cls(
            id=raw["id"],
            name=raw["name"],
            status=raw.get("status", "unknown"),
            note=raw.get("note", ""),
            required_region=RequiredRegion(r["left"], r["right"], r["top"], r["bottom"]),
        )

    @staticmethod
    def available() -> list[str]:
        return sorted(p.stem for p in FRAMES_DIR.glob("*.json"))


@dataclass
class EdgeVerdict:
    edge: str
    required: float
    available: Measurement
    fits_nominal: bool
    fits_worst_case: bool
    shortfall: float
    """Inches by which the frame overruns, using the WORST case. 0 when it fits."""


@dataclass
class FitmentVerdict:
    frame: FrameProfile
    edges: list[EdgeVerdict]
    safety_margin_inches: float

    @property
    def fits(self) -> bool:
        """Deliberately the worst case, not the nominal.

        A frame that fits at the nominal number and not at the low end of the
        error bar does not fit, and the customer's bumper is an expensive place
        to discover that. Where the two disagree the answer is "no", and the
        uncertainty is what a reviewer should attack.
        """
        return all(e.fits_worst_case for e in self.edges if e.available.is_known)

    @property
    def undetermined(self) -> list[str]:
        return [e.edge for e in self.edges if not e.available.is_known]

    @property
    def worst_edge(self) -> EdgeVerdict | None:
        known = [e for e in self.edges if e.available.is_known]
        return max(known, key=lambda e: e.shortfall) if known else None


def evaluate(
    clearances: dict[str, Measurement],
    frame: FrameProfile,
    half_width: float,
    half_height: float,
    safety_margin_inches: float,
) -> FitmentVerdict:
    """vehicle_geometry x product_geometry (§14)."""
    needed = frame.required_region.reach_beyond_plate(half_width, half_height)
    edges: list[EdgeVerdict] = []
    for edge in ("left", "right", "top", "bottom"):
        avail = clearances.get(edge, Measurement.unknown())
        req = needed[edge] + safety_margin_inches
        if avail.is_known:
            nominal_ok = avail.value >= req
            worst_ok = avail.worst_case() >= req
            shortfall = max(0.0, req - avail.worst_case())
        else:
            nominal_ok = worst_ok = False
            shortfall = 0.0
        edges.append(EdgeVerdict(edge, req, avail, nominal_ok, worst_ok, shortfall))
    return FitmentVerdict(frame, edges, safety_margin_inches)
