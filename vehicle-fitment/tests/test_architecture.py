"""§34 enforced as an import graph, not as a habit.

"Separate perception from measurement... Never let the AI directly generate the
final measurement." A comment saying so decays; an import test does not.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1] / "vehicle_fitment"


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text())
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


@pytest.mark.parametrize("path", sorted((ROOT / "perception").glob("*.py")), ids=lambda p: p.name)
def test_perception_never_imports_geometry(path: Path) -> None:
    offenders = {m for m in _imports(path) if m.startswith("vehicle_fitment.geometry")}
    assert not offenders, (
        f"{path.name} imports {offenders}. Perception speaks PIXELS only; if it can "
        "reach the geometry engine it can start returning inches, which is exactly "
        "the coupling section 34 forbids."
    )


@pytest.mark.parametrize("path", sorted((ROOT / "geometry").glob("*.py")), ids=lambda p: p.name)
def test_geometry_never_imports_perception(path: Path) -> None:
    offenders = {m for m in _imports(path) if m.startswith("vehicle_fitment.perception")}
    assert not offenders, (
        f"{path.name} imports {offenders}. The measurement engine must be usable "
        "with hand-placed points and must never depend on a detector."
    )


def test_perception_modules_do_not_mention_inches() -> None:
    """A crude but effective smell test: perception has no business naming inches."""
    for path in (ROOT / "perception").glob("*.py"):
        code = "\n".join(
            line for line in path.read_text().splitlines()
            if not line.strip().startswith("#")
        )
        # Split off docstrings, which legitimately discuss the rule itself.
        body = ast.parse(path.read_text())
        for node in ast.walk(body):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Module)):
                doc = ast.get_docstring(node)
                if doc:
                    code = code.replace(doc, "")
        assert "inches" not in code.lower(), (
            f"{path.name} names inches outside its docstrings; perception returns pixels."
        )
