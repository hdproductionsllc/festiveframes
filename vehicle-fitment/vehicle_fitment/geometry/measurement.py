"""Measurements that carry how they were obtained (spec §20, §31).

THE RULE THIS FILE EXISTS TO ENFORCE: there are no bare floats in a fitment
result. Every number is a `Measurement`, so it is impossible to print, serialise
or compare a clearance without also carrying whether it was measured, inferred,
estimated — or is simply unknown.

§20 asks the UI to distinguish those four. It is far easier to guarantee that at
the type level than to remember it at each of the dozen places a number is
rendered, and "1.12 inches" with no provenance is exactly the false precision the
spec warns against.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from enum import Enum


class Method(str, Enum):
    """How a number came to exist. Ordered worst-to-best deliberately: the enum's
    order is used to take the WEAKEST method across a combination, since a value
    derived from an estimate is itself no better than an estimate."""

    UNKNOWN = "unknown"
    ESTIMATED = "estimated"
    INFERRED = "inferred"
    MEASURED = "measured"

    @property
    def rank(self) -> int:
        return _METHOD_ORDER.index(self)


_METHOD_ORDER = [Method.UNKNOWN, Method.ESTIMATED, Method.INFERRED, Method.MEASURED]


@dataclass(frozen=True)
class Measurement:
    """A physical quantity in inches, its uncertainty, and its provenance.

    `uncertainty` is a half-width: 1.12 +/- 0.08 means the value is believed to
    lie in [1.04, 1.20]. It is never optional. A measurement with no idea of its
    own error is reported as UNKNOWN rather than as a confident number.
    """

    value: float
    uncertainty: float
    method: Method

    def __post_init__(self) -> None:
        if self.uncertainty < 0:
            raise ValueError("uncertainty is a half-width and cannot be negative")
        if self.method is Method.UNKNOWN and not math.isnan(self.value):
            # An UNKNOWN measurement must not smuggle a usable-looking number.
            object.__setattr__(self, "value", math.nan)

    @classmethod
    def unknown(cls) -> "Measurement":
        return cls(value=math.nan, uncertainty=math.inf, method=Method.UNKNOWN)

    @property
    def is_known(self) -> bool:
        return self.method is not Method.UNKNOWN and not math.isnan(self.value)

    @property
    def low(self) -> float:
        return self.value - self.uncertainty

    @property
    def high(self) -> float:
        return self.value + self.uncertainty

    def worst_case(self) -> float:
        """The pessimistic end of a CLEARANCE: how little room there might be.

        Fitment decisions use this rather than `value`. A frame that fits at the
        nominal figure and not at the low end does not fit, and finding that out
        on a customer's bumper is the expensive way to learn it.
        """
        return self.low

    def combined_with(self, other: "Measurement", value: float) -> "Measurement":
        """Derive a new measurement from two others.

        Uncertainties add in quadrature (independent errors) and the method is the
        WEAKER of the two inputs. Both halves matter: quadrature stops uncertainty
        inflating without limit, and taking the weaker method stops a measured
        value laundering an estimated one into looking measured.
        """
        if not (self.is_known and other.is_known):
            return Measurement.unknown()
        unc = math.hypot(self.uncertainty, other.uncertainty)
        method = self.method if self.method.rank <= other.method.rank else other.method
        return Measurement(value=value, uncertainty=unc, method=method)

    def render(self, unit: str = '"') -> str:
        """Human-facing form, e.g. `1.120" +/- 0.080 [MEASURED]` (§20)."""
        if not self.is_known:
            return f"unknown [{self.method.value.upper()}]"
        return (
            f"{self.value:.3f}{unit} +/- {self.uncertainty:.3f} "
            f"[{self.method.value.upper()}]"
        )
