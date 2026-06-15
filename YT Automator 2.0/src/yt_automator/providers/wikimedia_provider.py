from __future__ import annotations

from pathlib import Path

import requests

from yt_automator.models import MediaAsset
from yt_automator.providers.base import MediaProvider
from yt_automator.utils.paths import ensure_parent


class WikimediaProvider(MediaProvider):
    name = "wikimedia"
    ENDPOINT = "https://commons.wikimedia.org/w/api.php"
    USER_AGENT = "yt-automator-v2/0.1 (contact: local-runner)"

    _NO_ATTR_TOKENS = ("cc0", "public domain")
    _BLOCKED_TOKENS = (
        "noncommercial", "no derivatives", "all rights reserved", "unknown",
        "-nc", "-nd",
    )
    _ALLOWED_TOKENS = ("cc0", "public domain", "cc by", "cc-by", "cc by-sa", "cc-by-sa")

    def search_and_download(
        self,
        query: str,
        output_dir: Path,
        max_assets: int,
    ) -> list[MediaAsset]:
        params = {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": 6,
            "gsrlimit": min(max_assets * 3, 20),
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": 1080,
            "format": "json",
        }
        headers = {"User-Agent": self.USER_AGENT}
        response = requests.get(self.ENDPOINT, params=params, headers=headers, timeout=20)
        response.raise_for_status()
        payload = response.json()

        pages = payload.get("query", {}).get("pages", {})
        assets: list[MediaAsset] = []
        for page in pages.values():
            image_info = (page.get("imageinfo") or [{}])[0]
            image_url = image_info.get("thumburl") or image_info.get("url")
            if not image_url:
                continue
            metadata = image_info.get("extmetadata") or {}
            license_short = (metadata.get("LicenseShortName") or {}).get("value", "Unknown")
            if not self._is_license_allowed(license_short):
                continue
            page_id = page.get("pageid", id(page))
            output_path = output_dir / f"wikimedia_{page_id}.jpg"
            ensure_parent(output_path)
            raw = requests.get(image_url, headers=headers, timeout=20)
            raw.raise_for_status()
            content_type = raw.headers.get("content-type", "")
            if "image" not in content_type:
                continue
            output_path.write_bytes(raw.content)
            attribution_required = not any(
                t in license_short.lower() for t in self._NO_ATTR_TOKENS
            )
            assets.append(
                MediaAsset(
                    provider=self.name,
                    local_path=output_path,
                    source_url=image_url,
                    license_name=license_short,
                    attribution_required=attribution_required,
                )
            )
            if len(assets) >= max_assets:
                break
        return assets

    @classmethod
    def _is_license_allowed(cls, license_name: str) -> bool:
        lowered = license_name.lower()
        if any(t in lowered for t in cls._BLOCKED_TOKENS):
            return False
        return any(t in lowered for t in cls._ALLOWED_TOKENS)
