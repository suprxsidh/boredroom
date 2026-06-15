from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from yt_automator.models import MediaAsset


class MediaProvider(ABC):
    name: str

    def __init_subclass__(cls, **kwargs: object) -> None:
        super().__init_subclass__(**kwargs)
        if not ABC in cls.__mro__[1:] and not hasattr(cls, "name"):
            raise TypeError(f"{cls.__name__} must define a class attribute 'name'")

    @abstractmethod
    def search_and_download(
        self,
        query: str,
        output_dir: Path,
        max_assets: int,
    ) -> list[MediaAsset]:
        raise NotImplementedError
