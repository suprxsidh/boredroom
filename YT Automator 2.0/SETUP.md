# Setup Guide

## Prerequisites

Install ffmpeg (required for video rendering):

```bash
brew install ffmpeg
ffmpeg -version
```

## 1. Install Python dependencies

```bash
make setup
```

This creates `.venv/` and installs the `yta` CLI.

## 2. Set environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Key | Where to get it | Required? |
|-----|-----------------|-----------|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key | Yes (or use Ollama) |
| `PIXABAY_API_KEY` | [pixabay.com/api](https://pixabay.com/api/docs/) | Recommended |
| `NASA_API_KEY` | [api.nasa.gov](https://api.nasa.gov) | Optional (physics only) |

## 3. Add YouTube OAuth credentials

For **each channel** (biology, physics, history):

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (one project can serve all channels)
3. **APIs & Services → Enable APIs** → enable **YouTube Data API v3**
4. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
   - Configure consent screen if prompted: External → fill app name → Save
   - Application type: **Desktop app** → name it after the channel → Create
5. Download the JSON → rename it → place in `secrets/youtube/`:

| Channel | Filename |
|---------|----------|
| biology | `secrets/youtube/biology_credentials.json` |
| physics | `secrets/youtube/physics_credentials.json` |
| history | `secrets/youtube/history_credentials.json` |

Token files are created automatically the first time you run each channel.

## 4. Add background music

Place 3–4 royalty-free MP3 files in `assets/music/`:

| Filename | Source |
|----------|--------|
| `bg1.mp3` | [pixabay.com/music](https://pixabay.com/music) (free, no attribution) |
| `bg2.mp3` | same |
| `bg3.mp3` | same |
| `bg4.mp3` | same |

If no music files are found, the pipeline auto-generates a silent fallback (requires ffmpeg).

## 5. Validate setup

```bash
make doctor
```

All `[OK]` lines = ready. `[WARN]` lines = optional. `[FAIL]` lines = must fix.

## 6. First run (dry-run — no real upload)

```bash
make dry-run CHANNEL=biology
```

This runs the full pipeline but skips the actual YouTube upload.
Check `outputs/biology/` for the generated video.

## 7. First real upload

```bash
make run CHANNEL=biology
```

A browser window will open for Google OAuth consent. Approve it once per channel.
The token is saved to `secrets/youtube/biology_token.json` for future runs.

## 8. Start the scheduler (all channels)

```bash
make daemon-all
```

Videos are scheduled at 17:30, 19:00, 20:30, 22:00, 23:30 IST.
Keep this process running (use `screen`, `tmux`, or a system service).

## Adding more channels later

Drop a new JSON file in `config/channels/` following the same structure as `biology.json`.
Add its credentials file to `secrets/youtube/`. Run `make doctor` to verify.
