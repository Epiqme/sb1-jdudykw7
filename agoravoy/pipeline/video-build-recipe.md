# Video build recipe (video 5 method — current best practice)

All commands assume: HeyGen avatar render `HEYGEN.mp4` (1080x1920, 25fps) + its `HEYGEN.srt`, raw clips in `~/Downloads`, Anton at `Assets/Anton-Regular.ttf`. Work at 25fps, count FRAMES not seconds (seconds drift audio sync).

## 0. Check every raw clip for HDR before grading

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer,color_primaries -of csv=p=0 CLIP.MP4
```

`bt709,bt709` → skip tonemap. If `smpte2084`/`arib-std-b67` (iPhone HDR), prepend:

```
zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=hable:desat=0,zscale=transfer=bt709:matrix=bt709:range=tv,format=yuv420p
```

(Epiq's ~195 current clips are all SDR bt709 — verified 7/13.)

## 1. Grade chain (B-roll AND avatar segments — unified look)

B-roll (full chain):

```
crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale=1080:1920,setsar=1,colorbalance=rs=0.1:gs=-0.1:bs=-0.2:rm=0.05:gm=-0.05:bm=-0.1:rh=0.1:gh=-0.05:bh=-0.15,eq=saturation=1.15:contrast=1.08,unsharp=5:5:0.5,noise=alls=6:allf=t,fps=25
```

Avatar segments (lighter, keeps skin natural, grain unifies texture):

```
eq=contrast=1.03:saturation=1.05,noise=alls=6:allf=t
```

## 2. Segment cutting (frame-exact)

- Read the SRT for beat boundaries. Avatar-visible sections = hook + CTA; everything between = real B-roll, audio untouched.
- Shots: 36 frames (1.44s) each at 25fps — lands near beats of any 125-130 BPM track.
- Trim: `-vf "fps=25,trim=end_frame=36,setpts=PTS-STARTPTS"` (or `start_frame:end_frame`).
- Open on B-roll, not the avatar face (thumbnail + Epiq's rule). Avatar enters ~1.4s in: discard the first 36 avatar frames, keep its later frames at their ORIGINAL timeline positions so lips stay synced.

## 3. Captions (Anton word-pops)

```bash
python3 make_ass.py --srt HEYGEN.srt --out build/captions.ass   # see --help for keyword/title options
```

Parses SRT → 2-3-word uppercase chunks, evenly timed inside each SRT segment, Anton 84px white with black outline, keywords in red `&H0A0AE1&` (BGR of #E10A0A), bottom-center MarginV 500 (inside all platform safe zones), plus a "DEAL SCAN #N" red-box title slam (Title style, top-center). Burn per-segment with a PTS shift so absolute SRT times line up:

```bash
ffmpeg -i seg.mp4 -vf "setpts=PTS+<segStartSec>/TB,ass=captions.ass:fontsdir=<dir with Anton-Regular.ttf>,setpts=PTS-STARTPTS" ...
```

## 4. End card (3.2s)

```bash
ffmpeg -f lavfi -i "color=c=0x00A8D8:s=1080x1920:r=25:d=3.2" -vf "drawtext=fontfile=Anton-Regular.ttf:text='AGORAVOY.COM':fontsize=104:fontcolor=white:box=1:boxcolor=0xE10A0A:boxborderw=42:x=(w-text_w)/2:y=820,drawtext=fontfile=Anton-Regular.ttf:text='BOOK VIRGIN. BOARD WITH FRIENDS.':fontsize=50:fontcolor=white:x=(w-text_w)/2:y=1090,drawtext=fontfile=Anton-Regular.ttf:text='DEAL SCAN \#1':fontsize=60:fontcolor=0xE10A0A:box=1:boxcolor=white:boxborderw=24:x=(w-text_w)/2:y=620,noise=alls=4:allf=t" ...
```

## 5. Final assembly — THE RULE THAT MATTERS

NEVER deliver `-c copy` concat output. It probes clean but players freeze at seams and re-decode drops/shifts frames (killed v1 and v2 of video 5). Always finish with ONE re-encode pass through the concat demuxer:

```bash
ffmpeg -f concat -safe 0 -i pieces.txt -i voice.m4a -af "loudnorm=I=-14:TP=-1.5:LRA=11,apad" -t <total> \
  -c:v libx264 -b:v 12M -maxrate 12M -bufsize 24M -preset fast -r 25 -vsync cfr \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart MASTER.mp4
```

(Preset fast/medium on a real machine; the sandbox needed ultrafast.)

## 6. Verify before delivering (every time)

```bash
ffprobe -count_frames -select_streams v -show_entries stream=nb_read_frames ...   # expected total
ffmpeg -v error -i MASTER.mp4 -f null -                                           # decode clean
# packet pts monotonic ~0.04s steps; extract 5-6 frames across the timeline and LOOK at them
```

Audio frame math: HeyGen audio length in frames must equal video total exactly (e.g. video 5: 138 head + 362 broll + 238 tail = 738f = 29.52s, card padded after).

## 7. Platform export notes

1080x1920 H.264 (NOT 4K, NOT HEVC — harsher platform re-encodes), upload via mobile app "highest quality". Music: TikTok Commercial Music Library for business account, 125-140 BPM, start at the drop. Safe zones: keep text inside centered 900x1400.
