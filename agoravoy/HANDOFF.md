# AGORAVOY HANDOFF — for Claude Code

Written 2026-07-13. Everything an agent needs to continue this project lives in the Agoravoy HQ folder (Cowork workspace) and, as of this import, in this repo's `agoravoy/` directory. Read this file, then STATUS.md, then BUILD-LOG.md (those two still live in Cowork HQ — see README.md for asset locations).

## 1. What this project is

Agoravoy is Epiq Richman's one-person travel agency selling Virgin Voyages cruises (via Fora Travel, agent ID 296153). Positioning: "Book Virgin. Board with friends." — same price as booking direct, plus an AI Free Deal Scan and the Icebreaker community. Revenue: 16% commission on fare, 10% on add-ons through his LetsGoBook link.

The build has four parts:

1. **CAM (Content Automation Machine)** — an n8n cloud workflow that turns one-line video ideas in a Google Sheet into rendered HeyGen avatar videos. Sheet row status flow: IDEA → SCRIPTED → GENERATING → VIDEO READY (+ video URL written back).
2. **Local video post-production pipeline** — ffmpeg-based. Takes the HeyGen avatar render and replaces sections with Epiq's REAL trip footage (~195 iPhone clips in ~/Downloads), burns Bebas Neue word-pop captions (see BRAND.md), grades, mixes, exports platform-ready 9:16. This pass is what makes the videos good; CAM alone produces only the raw avatar base.
3. **The site** — static HTML on Netlify (source in Site/), deploy locked to a review permalink, live domain agoravoy.com still shows placeholder. Free Deal Scan form posts to Formspree.
4. **Deal watch** — deals-watch.md is the baseline of Virgin's current offers; compare against virginvoyages.com/cruise-deals, update file after each check.

## 2. Current state (7/13)

### Working

- CAM ran clean end-to-end Jul 12 13:00 (n8n execution #552, 4m16s): Claude script → QA → Sheets update → HeyGen v3 render → VIDEO READY + URL in sheet. The 7/11 silent-fail bug is RESOLVED.
- 5 videos built. Best two: `Videos/2026-07-12-video4-adventure-REAL-BROLL-v8-ANTON.mp4` and `Videos/2026-07-13-video5-deal-scan-1-v3.mp4` (video 5 = first of the "Deal Scan #N" series, built to the new playbook spec).
- Site fully edited and verified on Netlify review permalink (deploy id 6a53ed876508f49a24b94e5e); Book buttons already point to the LetsGoBook link.
- Research playbook done: VIDEO-QUALITY-PLAYBOOK.md (23 ranked findings + exact ffmpeg recipes + action list). Follow it for every new video.

### Broken / unfinished

- Video 4's HeyGen revision (upbeat music + replacing green baked-in overlays during the avatar CTA with red/blue) was submitted to the Video Agent chat "Create Agoravoy Video"; a plan artifact "Agoravoy: Real Adventure Experience (High-Energy Ad)" exists but was paused and NOT generated. Epiq took over that chat manually. Real-footage clips (10, trimmed <10MB each) are staged in `Assets/video4-real-clips/` for him to drag in.
- No music in video 5 (add TikTok Commercial Music Library track at upload, or bake in via Epidemic Sound/Pixabay — Epiq was deciding).
- 12-second teaser variant of video 5: not built (needs its own caption pass).
- CAM is functional but not packaged for sale (no clean export, sheet template, or setup walkthrough).
- agoravoy.com live domain still on placeholder; go-live is a deliberate decision waiting on Epiq.
- Icebreaker "From our sailors" site tiles are stock photos; long-term replace with real clips.

### Known errors seen (for pattern-matching)

- n8n 7/11: "HeyGen generate video" node skipped silently, execution reported success, job ID cell empty. Cause never pinned; resolved after rewiring to v3 API + node option cleanup. If it recurs: check the node's onError/continueOnFail and remember n8n runs a STALE workflow version until you deactivate+reactivate (or unpublish+publish in the new UI) after any PATCH.
- n8n Claude node rejected the "temperature" option with claude-sonnet-5 — leave it unset.
- HeyGen v2 talking_photo endpoint returns STILL images — never use; v3 `POST api.heygen.com/v3/videos` with avatar_id + voice_id, 9:16, NO motion_prompt.
- Credential header must be `X-Api-Key` (a header literally named "heygen key" is an invalid HTTP token and fails).

## 3. Video pipeline — the exact recipe (video 5 method, current best)

Full commands in `pipeline/video-build-recipe.md`. Summary:

1. Verify the deal/content facts live (deals-watch.md rules; banned words: solo, "eating alone", crew; no em dashes; numbers as words).
2. Script ≈80 words for ~30s. HeyGen Video Agent in CHAT mode (not Auto-pilot), avatar-only render: "NO B-roll, NO music, NO on-screen text", epiqrichman avatar (tropical shirt look) + epiqrichman voice clone, 9:16 1080p. Download video + SRT.
3. Build locally at 25fps frame-exact: avatar hook (open on B-roll, avatar enters ~1.4s), 36-frame real-clip shots, avatar CTA, end card. AUDIO UNTOUCHED = lip sync exact.
4. Captions: `make_ass.py` converts the SRT to Bebas Neue word-pop ASS chunks (BRAND.md spec) (white, red #E10A0A keywords, safe-zone margins). Burn with `ass=captions.ass:fontsdir=agoravoy/assets`.
5. Grade everything (avatar too) with the teal-orange chain + grain (in recipe file).
6. **CRITICAL: deliver ONE continuous encode.** `ffmpeg -f concat -i list.txt -c:v libx264 ...` re-encode. NEVER ship a `-c copy` concat of separately-encoded pieces — probes clean but QuickTime freezes at seams and decode drops frames (killed video 5 v1 and v2).
7. Export: 1080x1920 H.264 12M, AAC 256k 48kHz, -14 LUFS loudnorm, +faststart. Master to `Videos/` named `YYYY-MM-DD-videoN-<slug>-vN.mp4`.

Brand: red #E10A0A, ocean blue #00A8D8, white; font Bebas Neue (`agoravoy/assets/BebasNeue.ttf` — replaced Anton 7/13, see BRAND.md); tagline "BOOK VIRGIN. BOARD WITH FRIENDS."; end card = AGORAVOY.COM in red letters (no box) on ocean blue — see BRAND.md.

Raw footage: ~195 UUID-named clips in ~/Downloads (real Virgin ship + excursion footage, all SDR bt709). Best-clip IDs with timestamps are logged in STATUS.md ("TOP ACTION CLIPS FOUND"). 10 pre-trimmed/graded picks in `Assets/video4-real-clips/`.

## 4. What to build next (priority order)

1. Finish video 4's HeyGen revision (music + red/blue overlays) once Epiq attaches the real clips — or regenerate scene-by-scene per the plan artifact already in that chat.
2. Music decision → bake into video 5, build the ~12-15s teaser cut.
3. Post videos, start the "Deal Scan #N" series cadence (3-5/wk per playbook), watch first-30-min metrics.
4. Package CAM for sale: clean n8n export JSON, Google Sheet template, master prompt doc, 30-min setup walkthrough. Blueprint already drafted in `Scripts/CAM-v2-blueprint.md`.
5. Site go-live when Epiq says go (unlock Netlify auto-publish / point agoravoy.com at the locked deploy).

## 5. File map (everything that matters)

| Path | What it is |
| --- | --- |
| STATUS.md | Living project log. READ IT ALL. Update it after every work session. *(Cowork HQ)* |
| BUILD-LOG.md | Video-build formulas and CAM render settings (avatar_id, voice_id, API details). *(Cowork HQ)* |
| VIDEO-QUALITY-PLAYBOOK.md | Research-backed quality spec — follow for every video. *(in this repo + Google Drive)* |
| deals-watch.md | Virgin offer baseline (updated 7/13) + watcher rules + banned words. *(Cowork HQ)* |
| HANDOFF/pipeline/video-build-recipe.md | Exact ffmpeg commands for the video 5 method. *(in this repo: `pipeline/`)* |
| HANDOFF/pipeline/make_ass.py | SRT → word-pop ASS caption generator (Bebas Neue per BRAND.md). *(in this repo: `pipeline/`)* |
| HANDOFF/pipeline/captions-sample.ass | Example output (video 5's actual captions). *(Cowork HQ — not transferred)* |
| HANDOFF/CREDENTIALS.md | Every account/key needed (names only). *(in this repo)* |
| Scripts/CAM-v2-blueprint.md | CAM architecture + productization plan. *(Cowork HQ)* |
| Scripts/CAM-v2-n8n-workflow.json | n8n workflow export (NOTE: stale — uses v2 API; live workflow in n8n uses v3. Re-export before selling). *(Cowork HQ)* |
| Assets/Anton-Regular.ttf | RETIRED brand font (Bebas Neue replaced it 7/13). *(Cowork HQ / Epiq's Mac)* |
| Assets/video4-real-clips/ | 10 trimmed, HeyGen-uploadable real clips, named by content. *(Cowork HQ / Epiq's Mac)* |
| Site/ | Full site source (styles.css holds brand color variables). *(Cowork HQ)* |
| Videos/ | All builds. video4 v8 + video5 v3 are the keepers. *(Cowork HQ / Epiq's Mac)* |
| Bookings/letsgobook-link.md | Epiq's commission link + Fora account facts. *(Cowork HQ)* |
| chat-archive-part*.jsonl | Early chat history (idea queue lives here). *(Cowork HQ)* |

## 6. Hard-won environment gotchas

- Cowork sandbox: 45s-180s bash limit kills long ffmpeg encodes; background jobs (nohup/setsid) do NOT survive between calls. Encode in chunks or superfast/ultrafast presets. Claude Code on the Mac won't have this problem.
- Grain filter (`noise=alls=6`) makes x264 3-5x slower — budget for it.
- Cowork sandbox cannot reach api.heygen.com (proxy-blocked) — HeyGen via browser automation or n8n only. Claude Code running locally may not be blocked; test first.
- HeyGen chat file-attach via browser-extension file injection stalls forever; native drag-drop by the human works.
- HeyGen chat uploads: 20MB/file limit.
- The n8n UI moved to Publish/Unpublish (versioned) instead of the Active toggle. Trial: 559/1000 executions used, ends ~7/22 → then ~$20-24/mo or self-host.
