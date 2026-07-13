#!/usr/bin/env python3
"""Agoravoy end-card generator (BRAND.md spec).

Renders the 1080x1920 closing card as a PNG: ocean-blue background,
AGORAVOY.COM in per-letter multicolor Bebas Neue with a dark-navy shadow
offset to the LEFT, taglines in white below. Feed the PNG to ffmpeg to
make the 3.2s card clip:

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

PATTERNS = {
    # AGORAVOY letter colors cycle through the list; .COM drawn in com_color
    "alternate": {"cycle": [RED, WHITE], "com": WHITE},
    "tricolor": {"cycle": [RED, WHITE, NAVY], "com": WHITE},
    "blocks": {"cycle": None, "com": NAVY},  # AGORA red, VOY white
}


def draw_word(draw, font, x, y, letters_colors, shadow, shadow_offset):
    sx, sy = shadow_offset
    for ch, color in letters_colors:
        w = draw.textlength(ch, font=font)
        if shadow:
            draw.text((x + sx, y + sy), ch, font=font, fill=NAVY)
        draw.text((x, y), ch, font=font, fill=color)
        x += w
    return x


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="output .png path")
    ap.add_argument("--font", default="agoravoy/assets/BebasNeue.ttf")
    ap.add_argument("--pattern", default="alternate", choices=sorted(PATTERNS))
    ap.add_argument("--shadow-x", type=int, default=-14, help="shadow x offset (negative = left)")
    ap.add_argument("--shadow-y", type=int, default=10)
    ap.add_argument("--url-size", type=int, default=150)
    ap.add_argument("--url-y", type=int, default=800)
    args = ap.parse_args()

    img = Image.new("RGB", (1080, 1920), BLUE)
    draw = ImageDraw.Draw(img)
    url_font = ImageFont.truetype(args.font, args.url_size)
    tag_font = ImageFont.truetype(args.font, 58)

    word = "AGORAVOY"
    tail = ".COM"
    pat = PATTERNS[args.pattern]
    if pat["cycle"]:
        colors = [pat["cycle"][i % len(pat["cycle"])] for i in range(len(word))]
    else:  # blocks: AGORA red, VOY white
        colors = [RED] * 5 + [WHITE] * 3
    letters = list(zip(word, colors)) + [(c, pat["com"]) for c in tail]

    total_w = sum(draw.textlength(ch, font=url_font) for ch, _ in letters)
    x0 = (1080 - total_w) / 2
    draw_word(draw, url_font, x0, args.url_y, letters, True, (args.shadow_x, args.shadow_y))

    for i, line in enumerate(["BOOK VIRGIN.", "BOARD WITH FRIENDS."]):
        w = draw.textlength(line, font=tag_font)
        draw.text(((1080 - w) / 2, 1130 + i * 85), line, font=tag_font, fill=WHITE)

    img.save(args.out)
    print("wrote", args.out)


if __name__ == "__main__":
    main()
