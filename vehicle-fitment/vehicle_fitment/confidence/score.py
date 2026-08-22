"""Confidence, and why (spec §18, §35).

§18 asks for a number AND its reasons, so `ConfidenceReport` keeps every factor
that moved the score. A bare 0.94 tells a reviewer nothing about what to check;
"perspective LOW, single image, no mounting points" tells them where to look.

§35 is the rule that shapes the arithmetic: confidence must never RISE as
evidence falls. Two mechanisms enforce it, and both are needed:

  1. every factor is a multiplier in (0, 1], so no factor can add confidence;
  2. the evidence level's ceiling is applied last, so a spotless photograph of a
     recess still cannot outrank a mediocre photograph of the plate itself.

Without (2), a beautifully lit Level C image would beat a grainy Level B one --
more pixels, less evidence, higher score. That is precisely the inversion §35
forbids.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from vehicle_fitment.evidence.levels import EvidenceLevel, profile_for

# §18 offers these as starting engineering thresholds, explicitly "not scientific
# truth". Configurable, and stored alongside every record so an old record can be
# read against the thresholds it was judged under.
GREEN_THRESHOLD = 0.90
YELLOW_THRESHOLD = 0.70


class Status(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


@dataclass
class Factor:
    name: str
    multiplier: float
    detail: str

    def __post_init__(self) -> None:
        if not (0.0 < self.multiplier <= 1.0):
            raise ValueError(
                f"factor {self.name!r} must be a multiplier in (0, 1]; "
                "confidence can only be reduced by evidence, never manufactured"
            )


@dataclass
class ConfidenceReport:
    level: EvidenceLevel
    factors: list[Factor] = field(default_factory=list)
    green_threshold: float = GREEN_THRESHOLD
    yellow_threshold: float = YELLOW_THRESHOLD

    @property
    def ceiling(self) -> float:
        return profile_for(self.level).ceiling

    @property
    def score(self) -> float:
        value = self.ceiling
        for f in self.factors:
            value *= f.multiplier
        return round(max(0.0, min(1.0, value)), 4)

    @property
    def status(self) -> Status:
        s = self.score
        if s >= self.green_threshold:
            return Status.GREEN
        if s >= self.yellow_threshold:
            return Status.YELLOW
        return Status.RED

    def add(self, name: str, multiplier: float, detail: str) -> "ConfidenceReport":
        self.factors.append(Factor(name, round(multiplier, 4), detail))
        return self

    def explain(self) -> list[str]:
        lines = [f"evidence level {self.level.value} (ceiling {self.ceiling:.2f})"]
        for f in self.factors:
            lines.append(f"  x{f.multiplier:.3f}  {f.name}: {f.detail}")
        lines.append(f"  = {self.score:.4f} -> {self.status.value.upper()}")
        return lines
