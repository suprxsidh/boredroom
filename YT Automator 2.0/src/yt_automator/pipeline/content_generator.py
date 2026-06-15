from __future__ import annotations

import json
import logging
import re
import requests
from typing import Any

_log = logging.getLogger(__name__)

from yt_automator.models import ContentPackage
from yt_automator.utils.text import normalize_script, sentence_split


class ContentGenerator:
    def __init__(
        self,
        gemini_api_key: str | None,
        ollama_model: str | None = None,
        ollama_base_url: str = "http://localhost:11434",
        gemini_model: str = "gemini-2.0-flash-lite",
    ):
        self.gemini_api_key = gemini_api_key
        self.ollama_model = ollama_model
        self.ollama_base_url = ollama_base_url.rstrip("/")
        self.gemini_model = gemini_model
        self._client = None
        if gemini_api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=gemini_api_key)
            except Exception as exc:
                _log.warning("google-genai import failed, Gemini disabled: %s", exc)
                self._client = None

    def generate(
        self,
        channel_config: dict[str, Any],
        strategy_key: str,
        strategy_data: dict[str, Any],
        history: list[str],
        reddit_context: dict[str, str] | None = None,
    ) -> ContentPackage:
        prompt_profile = channel_config["prompt_profile"]
        theme = strategy_data["theme"]

        history_text = ""
        if history:
            latest = ", ".join(f'"{t}"' for t in history[-40:])
            history_text = f"Do not repeat these already covered topics: [{latest}]"

        reddit_text = ""
        if reddit_context:
            reddit_text = (
                "Incorporate this community story context while transforming it into an "
                "original narrative. Avoid direct copying. "
                f"Story title: {reddit_context.get('title', '')}. "
                f"Story summary: {reddit_context.get('summary', '')}."
            )

        prompt = f"""{prompt_profile['system_role']}

Channel: {channel_config['channel_name']}
Theme: {theme}
Strategy key: {strategy_key}
{history_text}
{reddit_text}

Script rules:
{prompt_profile['script_rules']}

Return strict JSON object with keys:
topic, script, title, description, video_query, tags, source_links""".strip()

        if self.ollama_model:
            try:
                payload = self._generate_with_ollama(prompt)
                return self._to_package(payload)
            except Exception as exc:
                _log.warning("Ollama generation failed, trying next backend: %s", exc)

        if self._client is not None:
            try:
                response = self._client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt,
                )
                payload = self._parse_json(response.text)
                return self._to_package(payload)
            except Exception as exc:
                _log.warning("Gemini generation failed, using fallback: %s", exc)

        return self._fallback_package(channel_config, strategy_data, reddit_context)

    def _generate_with_ollama(self, prompt: str) -> dict[str, Any]:
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }
        response = requests.post(
            f"{self.ollama_base_url}/api/generate",
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        body = response.json()
        text = body.get("response", "{}").strip()
        return self._parse_json(text)

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        cleaned = text.strip().replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON object found in LLM response: {cleaned[:200]!r}")
        return json.loads(match.group())

    @staticmethod
    def _to_package(payload: dict[str, Any]) -> ContentPackage:
        script = normalize_script(payload.get("script", ""))
        script = " ".join(sentence_split(script))
        return ContentPackage(
            topic=str(payload.get("topic", "Untitled topic")).strip(),
            script=script,
            title=str(payload.get("title", "Untitled short")).strip(),
            description=str(payload.get("description", "")).strip(),
            video_query=str(payload.get("video_query", "interesting visuals")).strip(),
            tags=[str(item) for item in payload.get("tags", [])][:12],
            source_links=[str(item) for item in payload.get("source_links", [])][:8],
            style_variant=str(payload.get("style_variant", "default")),
        )

    @staticmethod
    def _fallback_package(
        channel_config: dict[str, Any],
        strategy_data: dict[str, Any],
        reddit_context: dict[str, str] | None,
    ) -> ContentPackage:
        topic = strategy_data["theme"]
        script = (
            f"Quick deep dive on {topic}. "
            "This starts with a claim almost everyone gets wrong. "
            "Most people miss this crucial detail, but it completely changes the entire story. "
            "The middle of this story is where the explanation gets counterintuitive, "
            "because the obvious answer fails when you look at real evidence. "
            "Scientists and researchers have documented this for decades, "
            "yet it rarely makes it into mainstream education or popular discussion. "
            "By the end, one small detail flips the conclusion and makes the whole topic "
            "easier to understand and remember. "
            "Follow for the next short if you want more high-signal facts without the fluff."
        )
        return ContentPackage(
            topic=topic,
            script=normalize_script(script),
            title=f"{channel_config['channel_name'].title()} short: {topic[:48]}",
            description=(
                f"{topic}. Built for quick learning and retention. "
                f"#{channel_config['channel_name']} #shorts #learn"
            ),
            video_query=strategy_data.get("default_query", "cinematic vertical background"),
            tags=[channel_config["channel_name"], "shorts", "education", "viral"],
            source_links=[],
            style_variant="fallback",
        )
