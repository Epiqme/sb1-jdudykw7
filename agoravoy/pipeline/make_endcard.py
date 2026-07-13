#!/usr/bin/env python3
"""Agoravoy end-card generator (BRAND.md spec).

Renders the 1080x1920 closing card as a PNG: ocean-blue background, the
AGORAVOY wordmark split in two colors (AGORA / VOY), a small ".com" on the
same baseline, dark-navy shadow offset slightly LEFT, taglines in white.

  python3 make_endcard.py --out endcard.png
  ffmpeg -loop 1 -i endcard.png -t 3.2 -r 25 -vf "noise=alls=4:allf=t" \
         -c:v libx264 -pix_fmt yuv420p endcard.mp4
"""
import argparse

from PIL import Image, ImageDraw, ImageFont

RED = "#E10A0A"
BLUE = "#00A8D8"
NAVY = "#0A1F3C"
WHITE = "#FFFFFF"
COLORS = {"red": RED, "white": WHITE, "navy": NAVY, "blue": BLUE}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="output .png path")
    ap.add_argument("--font", default="agoravoy/assets/BebasNeue.ttf")
    ap.add_argument("--agora-color", default="white", choices=sorted(COLORS))
    ap.add_argument("--voy-color", default="red", choices=sorted(COLORS))
    ap.add_argument("--com-color", default="navy", choices=sorted(COLORS))
    ap.add_argument("--url-size", type=int, default=170)
    ap.add_argument("--com-size", type=int, default=80)
    ap.add_argument("--baseline-y", type=int, default=960, help="wordmark baseline")
    ap.add_argument("--shadow-x", type=int, default=-12, help="negative = left")
    ap.add_argument("--shadow-y", type=int, default=10)
    args = ap.parse_args()

    img = Image.new("RGB", (1080, 1920), BLUE)
    draw = ImageDraw.Draw(img)
    big = ImageFont.truetype(args.font, args.url_size)
    small = ImageFont.truetype(args.font, args.com_size)
    tag = ImageFont.truetype(args.font, 58)

    com_gap = 10  # breathing room before .com
    segments = [
        ("AGORA", big, COLORS[args.agora_color], 0),
        ("VOY", big, COLORS[args.voy_color], 0),
        (".com", small, COLORS[args.com_color], com_gap),
    ]
    total_w = sum(draw.textlength(t, font=f) + gap for t, f, _, gap in segments)
    x0 = (1080 - total_w) / 2
    y = args.baseline_y

    # two passes — all shadows first, then all faces — so the left-offset
    # shadow never paints over the face of a neighboring letter
    x = x0
    for text, font, _, gap in segments:
        draw.text((x + gap + args.shadow_x, y + args.shadow_y), text, font=font, fill=NAVY, anchor="ls")
        x += draw.textlength(text, font=font) + gap
    x = x0
    for text, font, color, gap in segments:
        draw.text((x + gap, y), text, font=font, fill=color, anchor="ls")
        x += draw.textlength(text, font=font) + gap

    for i, line in enumerate(["BOOK VIRGIN.", "BOARD WITH FRIENDS."]):
        w = draw.textlength(line, font=tag)
        draw.text(((1080 - w) / 2, 1130 + i * 85), line, font=tag, fill=WHITE)

    img.save(args.out)
    print("wrote", args.out)


if __name__ == "__main__":
    main()
