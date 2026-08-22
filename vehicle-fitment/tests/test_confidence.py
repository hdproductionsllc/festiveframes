"""§35: confidence must never rise as evidence falls."""

from __future__ import annotations

import itertools

import pytest

from vehicle_fitment.confidence.score import ConfidenceReport, Status
from vehicle_fitment.evidence.levels import FALLBACK_ORDER, EvidenceLevel, profile_for


def test_ladder_ceilings_are_monotonically_decreasing() -> None:
    ceilings = [profile_for(level).ceiling for level in FALLBACK_ORDER]
    assert ceilings == sorted(ceilings, reverse=True), (
        f"ladder ceilings {ceilings} are not monotonic; a lower evidence level "
        "could outrank a higher one, which is the inversion section 35 forbids"
    )


def test_a_perfect_lower_level_cannot_beat_a_flawed_higher_one() -> None:
    """The concrete inversion worth guarding: a beautiful photo of a RECESS must
    not outscore a mediocre photo of the PLATE ITSELF."""
    perfect_c = ConfidenceReport(EvidenceLevel.C_PLATE_RECESS).score
    flawed_b = (
        ConfidenceReport(EvidenceLevel.B_PLATE_PERIMETER)
        .add("perspective", 0.93, "MEDIUM")
        .score
    )
    assert perfect_c <= flawed_b


def test_factors_can_only_reduce() -> None:
    with pytest.raises(ValueError):
        ConfidenceReport(EvidenceLevel.B_PLATE_PERIMETER).add("boost", 1.2, "nope")


def test_adding_any_factor_never_increases_the_score() -> None:
    report = ConfidenceReport(EvidenceLevel.B_PLATE_PERIMETER)
    previous = report.score
    for i, mult in enumerate([1.0, 0.99, 0.8, 0.5, 0.95]):
        report.add(f"f{i}", mult, "")
        assert report.score <= previous + 1e-9
        previous = report.score


def test_status_bands() -> None:
    r = ConfidenceReport(EvidenceLevel.A_MOUNTING_POINTS)
    assert r.status is Status.GREEN
    r.add("x", 0.85, "")
    assert r.status is Status.YELLOW
    r.add("y", 0.7, "")
    assert r.status is Status.RED


def test_no_evidence_is_red_and_scores_zero() -> None:
    r = ConfidenceReport(EvidenceLevel.NONE)
    assert r.score == 0.0
    assert r.status is Status.RED
