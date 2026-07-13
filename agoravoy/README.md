# Agoravoy — content machine home base

This directory is the versioned brain of the Agoravoy content machine, imported from the Cowork "Agoravoy HQ → HANDOFF" package on 2026-07-13.

**Read order:** `HANDOFF.md` → `VIDEO-QUALITY-PLAYBOOK.md` → `pipeline/video-build-recipe.md`. (`STATUS.md` and `BUILD-LOG.md` still live only in Cowork HQ — import them when possible.)

## What's in this repo

- `HANDOFF.md` — project overview, current state, errors seen, priority list
- `CREDENTIALS.md` — every service + credential NAME (no secret values, ever)
- `VIDEO-QUALITY-PLAYBOOK.md` — 23 ranked quality findings; follow on every video
- `pipeline/video-build-recipe.md` — exact ffmpeg recipe (video 5 method)
- `pipeline/heygen-prompts.md` — both proven HeyGen prompts + gotchas
- `pipeline/make_ass.py` — SRT → Anton word-pop ASS captions (now takes CLI args; `--help`)

## What's NOT in this repo (and where it is)

- Raw footage (~195 clips): Epiq's Mac, `~/Downloads`
- Built videos, `Assets/` (incl. `Anton-Regular.ttf`), `Site/`, `Scripts/`, STATUS.md, BUILD-LOG.md, deals-watch.md: Cowork HQ folder
- Live CAM workflow: n8n cloud (agoravoy.app.n8n.cloud) — the JSON export in Cowork HQ is stale (v2 API)
- Secrets: n8n credential store + Epiq's password manager

## This environment (Claude Code remote sandbox) — verified 2026-07-13

- **api.heygen.com IS reachable here** (real 401 from HeyGen without a key) — unlike the Cowork sandbox, direct HeyGen API automation works from Claude Code once `HEYGEN_API_KEY` is provided.
- ffmpeg is not preinstalled but installs cleanly (`apt-get update && apt-get install -y ffmpeg`, v6.1.1). Long encodes are fine (10-min limit per command, background jobs supported) — no Cowork-style 45-180s kill.
- `make_ass.py`, the end-card render, and ASS caption burning were all smoke-tested here and decode clean.
- Anton-Regular.ttf is not here yet — tests used DejaVu. Add the real font (or fetch Anton from Google Fonts) before producing deliverables.
