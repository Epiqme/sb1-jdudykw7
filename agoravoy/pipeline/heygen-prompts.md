# Proven HeyGen prompts (reuse these)

## A. Avatar-only render (video 5 method — the one that works best)

Use Video Agent in Chat mode (not Auto-pilot), epiqrichman avatar + epiqrichman voice chips loaded:

> Create ONE continuous avatar-only video, portrait 9:16, 1080p, using my epiqrichman avatar in the tropical shirt look and my epiqrichman voice clone. NO B-roll, NO stock or AI footage, NO background music, NO on-screen text or captions of any kind. Just the avatar speaking the exact script below, chest-up framing, natural subtle gestures, on the look's own clean background. I will add B-roll, captions and music myself in editing. Voice direction: first two sentences quick, upbeat, energetic, like a YouTube intro. Middle section confident and clear. Final two sentences warm and direct. Script, speak exactly as written: "..."

Script rules: ~80 words ≈ 30s. Numbers as words ("July thirty-first", "seventy percent"). Commas = short pause, periods = long. Banned words: solo, "eating alone", crew. No em dashes. Download the 1080p video AND the caption .srt from the artifact's download dialog (Video tab, then Captions tab).

## B. Full revision prompt (video 4 style — scene-by-scene, agent assembles everything)

Submitted 7/13 to chat "Create Agoravoy Video"; plan artifact "Agoravoy: Real Adventure Experience (High-Energy Ad)" exists, paused before generation:

> Revise "Agoravoy: Real Adventure Experience". Keep portrait 9:16, about thirty-five seconds, same epiqrichman avatar and epiqrichman voice clone, same script. Follow this scene plan exactly.
>
> GLOBAL STYLE: Cinematic, high-energy travel-ad pacing. Quick cuts, one to two seconds per B-roll shot. No dead air anywhere; every second has voiceover or visible action. Brand colors ONLY for all graphics, text, and cards: red #E10A0A, ocean blue #00A8D8, and white. All on-screen text in Bebas Neue font, bold, uppercase. No dark green anywhere. Upbeat, energetic music throughout, building to the end. Tone: confident, fun. Use my uploaded real footage clips in this chat's media library for all B-roll wherever a clip fits (real Virgin Voyages ship and shore excursion shots). Only generate AI footage if no uploaded clip covers a scene.
>
> SCENE 1 — Cold open, funny beat: the snorkel-gear guy strutting through the ship's elegant restaurant (reuse that exact scene). VO: "People think booking a cruise means being stuck on a ship. Wrong."
> SCENE 2 — Fast B-roll montage from my uploads: Virgin red hull close-up, red deck at sunset, coastal port aerial. Title card, white Bebas Neue text on red #E10A0A: "A NEW PORT EVERY DAY". VO: "Virgin Voyages drops you in a new port almost every single day."
> SCENE 3 — Fast B-roll montage from my uploads: zipline shots, icebergs, waterfall. VO: "And I book your shore adventures too: ziplines over the jungle, glacier hikes, snorkeling, beach clubs."
> SCENE 4 — B-roll from my uploads: pool deck aerial, aerial show. VO: "Because the adventure follows you back on board."
> SCENE 5 — A-roll: my avatar in the tropical shirt look. Overlay card in red #E10A0A and ocean blue #00A8D8 (no green anywhere): "AI DEAL SCANNING" and "SAME PRICE AS DIRECT", plus an agoravoy.com pill in red. VO: "You get the same price as booking direct, and my AI scans every deal so you never overpay. Get your free deal scan at agoravoy.com."
> SCENE 6 — End card, three to four seconds: ocean blue #00A8D8 background, "AGORAVOY.COM" in white Bebas Neue inside a red #E10A0A box, tagline below: "BOOK VIRGIN. BOARD WITH FRIENDS." Music builds to a peak and ends clean.

Follow-up message pattern for mapping uploaded clips to scenes (send WITH files attached):

> Here is my real footage for the B-roll. Use these exact uploaded clips, do not generate AI replacements for them. Scene 2 montage in this order: virgin-red-hull-closeup, red-deck-sunset, coastal-port-aerial... [etc]. Update the plan to use these clips, then generate the video.

## C. Gotchas

- Chat mode still auto-starts generation after planning — click Pause fast if you need to review the plan first.
- Video Agent claims it can't see footage unless it's uploaded IN that chat (Resources → Media). Browser-extension file injection into the chat stalls forever; a human drag-drop works. 20MB/file limit. Pre-trimmed clips: `Assets/video4-real-clips/`.
- Video Agent = 20 credits/min. Creator plan = 600 credits/mo.
- Prompting guides: help.heygen.com articles 13566094 (Video Agent) and 9574152 (script tips).
