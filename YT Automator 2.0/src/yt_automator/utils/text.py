from __future__ import annotations

import re


def normalize_script(text: str) -> str:
    cleaned = text.replace("*", "").replace('"', "").strip()
    return re.sub(r"\s+", " ", cleaned)


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def sentence_split(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def slugify(value: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-")
    return base.lower() or "item"
