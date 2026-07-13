# Agoravoy Video Quality Playbook

*Researched 2026-07-13. 5 parallel research passes, ~75 sources, claims cross-verified (confidence flagged). Ranked by impact for our pipeline: HeyGen avatar + real iPhone footage + ffmpeg + Anton brand cards.*

## TIER 1 — Biggest wins (do these on every video)

### 1. Win the first 3 seconds, three channels at once

90% of ad recall impact happens in the first 6 seconds; 63% of highest-CTR videos hook within 3 (TikTok's own research). At 0:00 stack all three: **motion in frame one** (never a static open — motion beats static openers by ~11 hook-rate points), **spoken open loop**, and **text overlay from frame 0.0** (platforms OCR early frames). Our snorkel-guy cold open is exactly right — keep leading with the funniest/most kinetic real clip. Benchmark: 3-sec hook rate 40%+ = elite, below 25% = broken hook.

### 2. Your real face > the avatar. Real footage > AI footage. Always.

Animoto 2025 (n=460): 78% trust videos with real people more; 36% say suspected-AI video lowered brand trust; top AI tells are mechanical movement (67%) and artificial audio (55%). The anti-slop playbook: avatar only for hook + key beats (~10% of runtime), cut to REAL footage every 3–5s, never use AI scenery for places viewers assume are real. Our REAL-BROLL direction is validated — push it further. Virgin Voyages themselves declared "real over polished" (Boatchella: 1,100 creators, 236M views). Selling Virgin with phone-real footage matches the brand's own aesthetic.

### 3. Burn in word-pop captions, center-lower third

Captioned video: ~12% more view time (Facebook internal), 80% more likely to finish (Verizon/Publicis). Word-by-word "karaoke" pops beat static sentences for completion. Spec: bold sans (Anton works), ~55–75pt at 1080x1920, white + black stroke, positioned center to lower-middle, ONE accent color for keywords (use our red #E10A0A). We currently ship .srt sidecars — switch to burned-in word pops.

### 4. Cut every ~1.5–2s, sync to beat, vary the rhythm

TikTok rewards 0.8–2s cuts; beat-synced transitions correlate with 15–25% higher completion (soft number, direction solid). Don't machine-gun uniformly — mix rapid 1s cuts with an occasional 2–3s breather. Our v6 12-shot montage at 1.3s/shot is on target; next step is cutting ON music beats, which means picking the track FIRST and editing to it.

### 5. Safe zones — keep everything inside 900x1400 centered

Universal cross-platform box at 1080x1920: ~250px clear top, ~270px+ bottom, 60px left, 120px right (right rail = TikTok buttons). Bottom 25% is dead (UI overlays). Audit our title cards and agoravoy.com pill against this. TikTok ADS are tighter: ~440–484px dead at bottom.

## TIER 2 — HeyGen-specific quality levers

### 6. Voice Mirroring for the CTA lines

Record yourself reading the script; the avatar mirrors your exact tone/pacing in the cloned voice ("Convert to Voice Mirroring" shows a teleprompter). Artificial audio is the #2 AI tell — this is the single best fix. Faster alternative: Voice Director (megaphone icon, Panda engine) with per-line tone prompts like "Quick, upbeat, energetic, like a YouTube intro."

### 7. Script formatting = pacing engine

Commas = short breath, periods = long pause. Write numbers as words ("twenty twenty-six"). Use the Pause button for beats. Add pronunciation rules (double-click word → Pronunciation) for "Agoravoy" and ship names — they save to Brand Glossary permanently.

### 8. Motion prompts: one gesture per prompt, or force stillness

Structure: [Body part] + [Action] + [Emotion], max two short clauses. Stacked gestures fail. If gestures look exaggerated (a known Video Agent issue): "no hand gestures, barely move."

### 9. Workflow: Video Agent for the draft, AI Studio for precision

Video Agent gets 80–90% there; open the result in AI Studio to fix avatar position, timing, voice takes. Preview short segments before full renders — credits burn on failed renders too. Keep text overlays OUT of the render where possible and add in post (no re-render to fix a typo).

### 10. Avatar look quality is set at filming time

If re-shooting a look: one continuous 2+ min take, 4K, chest-up, hands below chest, closed-lip pauses between sentences, soft even light + backlight, real camera not webcam. For Avatar V motion reference: over-act — "the energy you put in is the energy you get out."

## TIER 3 — The ffmpeg pipeline (exact recipes)

**Order matters: tonemap → stabilize (only if needed) → crop/reframe → grade → sharpen/grain → encode. One filter chain, one encode generation.**

### 11. Tonemap iPhone HDR before grading (we may be silently washing out clips)

iPhone records Dolby Vision (BT.2020). Feeding it to eq/curves (BT.709 tools) = gray, washed-out output. Check: `ffprobe -show_entries stream=color_transfer` — if smpte2084/arib-std-b67, tonemap first:

```
zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=hable:desat=0,zscale=transfer=bt709:matrix=bt709:range=tv,format=yuv420p
```

### 12. Travel grade (replaces our flat eq=contrast=1.05:saturation=1.22)

Teal-orange without a LUT:

```
colorbalance=rs=0.1:gs=-0.1:bs=-0.2:rm=0.05:gm=-0.05:bm=-0.1:rh=0.1:gh=-0.05:bh=-0.15,eq=saturation=1.15:contrast=1.08
```

Keep saturation ≤1.2 — platform re-encodes amplify oversaturation. Or use a .cube travel LUT: `lut3d=file=look.cube` (blend at 60% opacity if too strong).

### 13. Make avatar + real footage look like one video

Apply the SAME final grade pass to both, then unify texture with light grain over everything: `noise=alls=6:allf=t` plus matching unsharp. The avatar render is flat/clean; grain is the cheapest seam-hider.

### 14. Crop 4K only, respect the math

9:16 crop uses ~32% of a 16:9 frame. From 4K → ~1215x2160 native (great). From 1080p → 607x1080 (sub-HD, soft). `crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920`, adjust x-offset per shot to keep subjects framed.

### 15. Export master

```
-c:v libx264 -profile:v high -level 4.2 -b:v 12M -maxrate 12M -bufsize 24M -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k -ar 48000 -movflags +faststart
```

1080x1920 H.264, NOT 4K, NOT HEVC (both trigger harsher re-encodes on TikTok/IG). Upload via mobile app with "highest quality" on. Give YouTube the best file — its VP9/AV1 pipeline preserves most.

## TIER 4 — Sound

### 16. Music first, then edit

88% of TikTok users say sound is essential; trending sounds = ~66–68% more engagement, best ridden within 24–72h of rising. Business accounts must use TikTok Commercial Music Library or licensed tracks. Pick BPM to match cut pace: 120–140 for montages, 90–110 for talking-head. Start the track at the drop/chorus, not the intro.

### 17. Mix: duck music ~10dB under VO, master ~-14 LUFS

Music bed at -20 to -25dB under speech, swell in gaps. Platforms normalize to ~-13/-14 LUFS — mixing hotter just gets turned down.

### 18. SFX on 3–5 beats max, not every cut

Riser before the reveal, whoosh on scene changes, impact on text slams. Never mask the first word of a sentence.

## TIER 5 — Strategy (what top cruise accounts do)

### 19. The proven solo-agent format stack

- **Episodic numbered series** — the World Cruise creators' engine ("Day X of...", "Deal Scan #12"). Appointment viewing + back-catalog binge.
- **Price-reveal / cost-breakdown** — highest-intent format; matches our Free Deal Scan positioning perfectly ("I scanned this sailing — here's what direct doesn't tell you").
- **"Things Virgin doesn't tell you"** insider videos — expertise IS the product.
- **POV cabin/ship walkthroughs** from real footage.
- Susie Flores (@cruisinsusie, ~$3M sales) and "Travel Agent Parker" (700–900 quote emails/day after one viral video) both converted via dead-simple CTAs: personality content → "email/DM me for a quote."

### 20. Length: ship two variants

Ads: 9–15s cut for direct response + 21–34s for storytelling (TikTok official research). Organic: 24–38s TikTok/Reels sweet spot. Our ~30–35s videos are fine; also cut a 12s version of each.

### 21. CTA without killing watch time

TikTok CTA cards/end placement: +45% recall vs interruptive CTAs. Soft verbal mention mid-video, hard CTA at the end. Engineer one "send this to someone" moment — IG's #2 ranking signal is DM shares per reach.

### 22. Disclose the avatar, lightly

Every platform now requires AI labels; IAB research shows advertisers overestimate the backlash — disclosure hurts far less than being caught. Virgin's own Jen AI campaign (2B impressions) worked BECAUSE it was openly AI. A small "AI avatar" note or a self-aware joke fits our tone.

### 23. Cadence: 3–5/week beats daily-rushed

2–5 TikToks/week is the biggest views jump (Buffer, 11M posts); 3 good ones beat 5 rushed. Post Tue–Thu ~5–9 PM local; TikTok's first 30–60 min test batch decides distribution.

## Immediate action list for video 5

1. Pick music track FIRST (Commercial Music Library, 120–140 BPM), edit cuts on beats.
2. Tonemap check every raw clip before grading (recipe #11).
3. New grade chain (#12) + shared grain pass over avatar and B-roll (#13).
4. Burned-in word-pop captions, white/black-stroke + red keyword pops, inside 900x1400 (#3, #5).
5. Voice Mirroring on the CTA line (#6).
6. Export with #15 preset; also cut a 12s teaser variant (#20).
7. Format: make it "Deal Scan #1" — start the numbered series (#19).

*Source quality: platform-official research (TikTok Marketing Science, Mosseri statements, HeyGen help docs) = high confidence. Creator-tool blog percentages (exact cut timings, caption lift numbers) = directional. Full source URLs in the chat research logs.*
