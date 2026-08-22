"""§26: "A bad answer is worse than no answer."

The system must decline rather than guess. These tests supply evidence that is
genuinely insufficient and assert that nothing confident comes back.
"""

from __future__ import annotations

import cv2
import numpy as np
import pytest

from vehicle_fitment.confidence.score import Status
from vehicle_fitment.evidence.levels import EvidenceLevel
from vehicle_fitment.pipeline import analyse
from vehicle_fitment.synth.scene import SceneSpec, render


def test_blank_image_refuses(tmp_path) -> None:
    image = np.full((600, 900, 3), 120, dtype=np.uint8)
    path = tmp_path / "blank.png"
    cv2.imwrite(str(path), image)
    result = analyse(image, path)
    assert not result.plate_detected
    assert result.level is EvidenceLevel.NONE
    assert result.status is Status.RED
    assert result.clearances is None
    assert "photograph" in (result.refusal_reason or "").lower()


def test_noise_image_does_not_hallucinate_a_plate(tmp_path) -> None:
    rng = np.random.default_rng(11)
    image = rng.integers(0, 255, (600, 900, 3), dtype=np.uint8)
    path = tmp_path / "noise.png"
    cv2.imwrite(str(path), image)
    result = analyse(image, path)
    # It may propose a candidate; it must NOT come back production-ready.
    assert result.status is not Status.GREEN


def test_extreme_obliqueness_is_refused(tmp_path) -> None:
    image, _ = render(SceneSpec(yaw_degrees=62, pitch_degrees=30))
    path = tmp_path / "oblique.png"
    cv2.imwrite(str(path), image)
    result = analyse(image, path)
    if result.refusal_reason is None:
        # If it did not refuse outright it must at least not be GREEN.
        assert result.status is not Status.GREEN
    else:
        assert result.status is Status.RED
        assert result.clearances is None


def test_partial_plate_does_not_produce_a_confident_answer(tmp_path) -> None:
    image, _ = render(SceneSpec(occlude_fraction=0.45))
    path = tmp_path / "partial.png"
    cv2.imwrite(str(path), image)
    result = analyse(image, path)
    assert result.status is not Status.GREEN, (
        "a plate that is 45% hidden must not yield a production-ready record"
    )


def test_refusal_carries_no_numbers(tmp_path) -> None:
    """A refusal must not smuggle out plausible-looking measurements."""
    image = np.full((600, 900, 3), 120, dtype=np.uint8)
    path = tmp_path / "blank2.png"
    cv2.imwrite(str(path), image)
    result = analyse(image, path)
    assert result.clearances is None
    assert result.fitment is None
    assert result.confidence.score == 0.0
