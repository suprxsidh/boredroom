from __future__ import annotations

from pathlib import Path


def get_repo_root() -> Path:
    current = Path(__file__).resolve().parent
    for candidate in [current, *current.parents]:
        if (candidate / ".yta-root").exists():
            return candidate
    raise RuntimeError(
        "Could not find .yta-root sentinel. "
        "Run from inside the YT Automator 2.0 directory."
    )


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
