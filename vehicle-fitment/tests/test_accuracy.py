"""Measured accuracy against KNOWN truth.

This is the file that justifies the synthetic renderer. A real photograph can
only show that an answer looks plausible, because nobody knows a real tailgate's
true clearance to a thousandth. Here the truth is chosen before the pixels exist,
so ERROR is knowable and the claims below are measurements rather than hopes.

What is asserted, and why each one matters:

  accuracy   -- the number is close to the truth
  coverage   -- the ERROR BAR CONTAINS the truth. A tight bar that misses is
                worse than a wide one that holds, because downstream fitment
                trusts the bar (section 20).
  degradation-- error and uncertainty both GROW with obliqueness. A system whose
                error bars stay flat as conditions worsen is not measuring its
                own uncertainty, it is reciting a constant.
  conservatism- the worst case never overstates available room, because that is
                the direction that puts a frame on a customer's bumper that does
                not fit.
"""

from __future__ import annotations

import pytest

from vehicle_fitment.geometry.clearance import measure_clearances
from vehicle_fitment.geometry.homography import calibrate_from_plate_corners
from vehicle_fitment.perception.plate import detect_plate_candidates
from vehicle_fitment.synth.scene import SceneSpec, render

# Tolerances are PROTOTYPE targets (section 25), not claims about final
# performance. An eighth of an inch is roughly the resolution at which a frame's
# fit on a real bumper starts to be decided.
TOLERANCE_INCHES = 0.125


def _run(spec: SceneSpec):
    image, truth = render(spec)
    candidates = detect_plate_candidates(image)
    assert candidates, "no plate found in a fixture that contains one"
    cal = calibrate_from_plate_corners(candidates[0].quad)
    result = measure_clearances(image, cal)
    expected = {
        "left": truth.left_clearance,
        "right": truth.right_clearance,
        "top": truth.top_clearance,
        "bottom": truth.bottom_clearance,
    }
    return cal, result, expected


CASES = [
    ("straight on", SceneSpec()),
    ("yaw 10", SceneSpec(yaw_degrees=10)),
    ("yaw 20", SceneSpec(yaw_degrees=20)),
    ("pitch 12", SceneSpec(pitch_degrees=12)),
    ("yaw 15 pitch 8", SceneSpec(yaw_degrees=15, pitch_degrees=8)),
    ("blurred", SceneSpec(blur_sigma=2.0)),
    ("noisy", SceneSpec(noise_sigma=8.0)),
    ("glare", SceneSpec(glare=True)),
    ("roll 6", SceneSpec(roll_degrees=6)),
    ("small in frame", SceneSpec(plate_px_width=300.0)),
    ("asymmetric body", SceneSpec(left_clearance=2.10, right_clearance=0.85,
                                  top_clearance=0.35, bottom_clearance=1.40)),
    ("shadow gap", SceneSpec(recess_shadow_line=True)),
]


@pytest.mark.parametrize("name,spec", CASES, ids=[c[0] for c in CASES])
def test_clearances_are_accurate(name: str, spec: SceneSpec) -> None:
    _, result, expected = _run(spec)
    for edge, truth_value in expected.items():
        m = result.raw()[edge]
        assert m.is_known, f"{name}: {edge} came back unknown on a clean fixture"
        assert abs(m.value - truth_value) <= TOLERANCE_INCHES, (
            f"{name}: {edge} measured {m.value:.3f} against truth {truth_value:.3f}"
        )


@pytest.mark.parametrize("name,spec", CASES, ids=[c[0] for c in CASES])
def test_error_bars_contain_the_truth(name: str, spec: SceneSpec) -> None:
    _, result, expected = _run(spec)
    for edge, truth_value in expected.items():
        m = result.raw()[edge]
        assert m.low - 1e-9 <= truth_value <= m.high + 1e-9, (
            f"{name}: {edge} reported {m.render()} which does NOT contain the "
            f"true {truth_value:.3f}. An error bar that excludes the answer is "
            "worse than a wide one, because fitment trusts it."
        )


@pytest.mark.parametrize("name,spec", CASES, ids=[c[0] for c in CASES])
def test_worst_case_never_overstates_available_room(name: str, spec: SceneSpec) -> None:
    _, result, expected = _run(spec)
    for edge, truth_value in expected.items():
        m = result.raw()[edge]
        assert m.worst_case() <= truth_value + 1e-9, (
            f"{name}: {edge} worst case {m.worst_case():.3f} claims MORE room than "
            f"the true {truth_value:.3f}; that is the dangerous direction."
        )


def test_uncertainty_grows_with_obliqueness() -> None:
    """The property that proves uncertainty is computed, not recited."""
    _, straight, _ = _run(SceneSpec())
    _, oblique, _ = _run(SceneSpec(yaw_degrees=28, pitch_degrees=14, blur_sigma=1.5))
    flat = straight.left.uncertainty
    steep = oblique.left.uncertainty
    assert steep > flat, (
        f"uncertainty did not grow with a worse view ({flat:.4f} -> {steep:.4f}); "
        "it is behaving like a constant rather than a measurement"
    )


def test_perspective_quality_tracks_the_actual_pose() -> None:
    labels = []
    for yaw in (0, 12, 26, 40):
        cal, _, _ = _run(SceneSpec(yaw_degrees=yaw))
        labels.append(cal.quality.label)
    order = ["HIGH", "MEDIUM", "LOW", "UNUSABLE"]
    ranks = [order.index(x) for x in labels]
    assert ranks == sorted(ranks), f"quality labels not monotonic with yaw: {labels}"


def test_asymmetric_scene_is_not_symmetrised() -> None:
    """A deliberately lopsided body must come back lopsided. Any averaging or
    mirroring bug hides perfectly behind a symmetric fixture."""
    _, result, expected = _run(
        SceneSpec(left_clearance=2.10, right_clearance=0.85,
                  top_clearance=0.35, bottom_clearance=1.40)
    )
    assert result.left.value > result.right.value + 0.5
    assert result.bottom.value > result.top.value + 0.5
