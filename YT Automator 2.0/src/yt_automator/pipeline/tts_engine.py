from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import edge_tts


class TTSEngine:
    def __init__(self, voices: list[str]):
        self.voices = voices

    async def synthesize(self, text: str, output_path: Path, voice: str | None = None) -> Path:
        selected_voice = voice or self.voices[0]
        try:
            communicate = edge_tts.Communicate(text, selected_voice, rate="+15%")
            await communicate.save(str(output_path))
            return output_path
        except Exception as exc:
            print(f"[WARN] edge-tts failed, using silent fallback: {exc}")
            self._create_silent_fallback(output_path)
            return output_path

    @staticmethod
    def _create_silent_fallback(output_path: Path) -> None:
        subprocess.run(
            [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "anullsrc=r=44100:cl=mono",
                "-t", "6", "-q:a", "9", "-acodec", "libmp3lame",
                str(output_path),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


def run_async(coro):
    return asyncio.run(coro)
