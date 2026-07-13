#!/usr/bin/env python3
"""Agoravoy end-card generator — FINAL spec, locked by Epiq 2026-07-13.

Renders the 1080x1920 closing card PNG:
  - White background
  - AGORAVOY wordmark: Anton 140px, wide letter spacing (0.12em), upright —
    AGORA in ocean blue #00A8D8, VOY in Virgin red #E10A0A
  - "agoravoy.com" in red lowercase Anton 32px, justified edge-to-edge with
    the wordmark, tucked at its base
  - Taglines "BOOK VIRGIN." / "BOARD WITH FRIENDS." in site navy #083D5C

Make the 3.2s card clip:
  python3 make_endcard.py --out endcard.png
  ffmpeg -loop 1 -i endcard.png -t 3.2 -r 25 -vf "noise=alls=4:allf=t" \
         -c:v libx264 -pix_fmt yuv420p endcard.mp4
"""
import argparse

from PIL import Image, ImageDraw, ImageFont

RED = "#E10A0A"
OCEAN = "#00A8D8"
NAVY = "#083D5C"
WHITE = "#FFFFFF"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="output .png path")
    ap.add_argument("--font", default="agoravoy/assets/Anton-Regular.ttf")
    args = ap.parse_args()

    img = Image.new("RGB", (1080, 1920), WHITE)
    d = ImageDraw.Draw(img)

    size = 140
    f = ImageFont.truetype(args.font, size)
    ls = size * 0.12
    word = [(c, OCEAN) for c in "AGORA"] + [(c, RED) for c in "VOY"]
    w = sum(d.textlength(c, font=f) + ls for c, _ in word) - ls
    x0 = (1080 - w) / 2
    x = x0
    for c, color in word:
        d.text((x, 940), c, font=f, fill=color, anchor="ls")
        x += d.textlength(c, font=f) + ls

    url = "agoravoy.com"
    uf = ImageFont.truetype(args.font, 32)
    glyphs = sum(d.textlength(c, font=uf) for c in url)
    gap = (w - glyphs) / (len(url) - 1)
    x = x0
    for c in url:
        d.text((x, 990), c, font=uf, fill=RED, anchor="ls")
        x += d.textlength(c, font=uf) + gap

    tag = ImageFont.truetype(args.font, 54)
    for i, line in enumerate(["BOOK VIRGIN.", "BOARD WITH FRIENDS."]):
        tw = d.textlength(line, font=tag)
        d.text(((1080 - tw) / 2, 1190 + i * 82), line, font=tag, fill=NAVY)

    img.save(args.out)
    print("wrote", args.out)


if __name__ == "__main__":
    main()
