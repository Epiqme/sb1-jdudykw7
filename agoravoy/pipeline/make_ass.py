#!/usr/bin/env python3
"""SRT -> Bebas Neue word-pop ASS caption generator (Agoravoy video pipeline).

Implements the caption spec in agoravoy/BRAND.md (style "B3"): 2-3-word
uppercase chunks evenly timed inside each SRT segment, white Bebas Neue 104px
with a heavy black outline (no box), brand-red (#E10A0A) keyword letters, and
optionally a red-box title slam (e.g. "DEAL SCAN #1") at the top of the frame
during the opening B-roll.

Times in the output are ABSOLUTE (same clock as the SRT). When burning onto a
cut segment, shift PTS first so they line up:
  ffmpeg -i seg.mp4 -vf "setpts=PTS+<segStartSec>/TB,ass=captions.ass:fontsdir=agoravoy/assets,setpts=PTS-STARTPTS" ...
"""
import argparse
import re

DEFAULT_RED = "FREE SEVENTY PERCENT OFF THREE HUNDRED DOLLARS AGORAVOY DOT COM BALCONY WIN DROP"

HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pop,Bebas Neue,104,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,10,0,2,60,120,500,1
Style: Title,Bebas Neue,96,&H00FFFFFF,&H00FFFFFF,&H000A0AE1,&H000A0AE1,0,0,0,0,100,100,2,0,3,14,0,8,60,120,500,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def t2s(t):
    h, m, rest = t.split(":")
    s, ms = rest.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def s2a(x):
    h = int(x // 3600)
    m = int(x % 3600 // 60)
    s = x % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--srt", required=True, help="input .srt from HeyGen")
    ap.add_argument("--out", required=True, help="output .ass path")
    ap.add_argument("--red", default=DEFAULT_RED,
                    help="space-separated keywords to color brand red (matched uppercase, punctuation-stripped)")
    ap.add_argument("--title", default=None, help='optional title slam text, e.g. "DEAL SCAN #1"')
    ap.add_argument("--title-start", type=float, default=5.52, help="title slam start (seconds)")
    ap.add_argument("--title-end", type=float, default=8.0, help="title slam end (seconds)")
    args = ap.parse_args()

    srt = open(args.srt).read()
    blocks = re.findall(r"\d+\n([\d:,]+) --> ([\d:,]+)\n(.+?)(?:\n\n|\Z)", srt, re.S)
    if not blocks:
        raise SystemExit(f"no caption blocks parsed from {args.srt}")
    red = set(args.red.upper().split())

    events = []
    for st, en, text in blocks:
        words = text.replace("\n", " ").upper().split()
        words = [re.sub(r"[^A-Z0-9\-\'?.,!#]", "", w) for w in words]
        t0, t1 = t2s(st), t2s(en)
        # chunks of 2-3 words (a 4-word remainder splits 2+2, never 3+1)
        chunks = []
        i = 0
        while i < len(words):
            n = 3 if len(words) - i >= 3 else len(words) - i
            if len(words) - i == 4:
                n = 2
            chunks.append(words[i:i + n])
            i += n
        dur = (t1 - t0) / len(chunks)
        for j, ch in enumerate(chunks):
            cs, ce = t0 + j * dur, t0 + (j + 1) * dur
            styled = " ".join(
                ("{\\c&H0A0AE1&}" + w + "{\\c&HFFFFFF&}") if w.strip("?.,!") in red else w
                for w in ch
            )
            events.append(f"Dialogue: 0,{s2a(cs)},{s2a(ce)},Pop,,0,0,0,,{{\\fad(50,0)}}{styled}")

    if args.title:
        events.append(
            f"Dialogue: 1,{s2a(args.title_start)},{s2a(args.title_end)},Title,,0,0,0,,"
            f"{{\\fad(60,120)}}{args.title.upper()}"
        )

    with open(args.out, "w") as f:
        f.write(HEADER + "\n".join(events) + "\n")
    print(len(events), "events ->", args.out)


if __name__ == "__main__":
    main()
