# NOTE: This script is no longer the app icon source. The icon is now Devon's
# dice artwork (assets/devon-icon-dice-source.png), turned into a full-bleed
# icon-only.png/icon.png and splash.png/splash-dark.png by
# assets/flatten-dice-icon.py. Running this script would overwrite those files
# with the old generated die design; it's kept only for reference.
"""Generates the "BANK! Dice Party Game" app icon and splash images (Pillow + Fraunces font).

Usage: python3 generate-icon.py /path/to/Fraunces-variable.ttf
Writes icon-only.png (1024), icon.png (1024), splash.png and splash-dark.png (2732)
next to this script. Output is RGB (no alpha), as the App Store requires.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

BG = (14, 17, 16)        # #0e1110
SAGE = (197, 204, 196)   # #c5ccc4
FONT = sys.argv[1] if len(sys.argv) > 1 else "Fraunces.ttf"
HERE = os.path.dirname(os.path.abspath(__file__))


def font(size, wght=650, opsz=144):
    f = ImageFont.truetype(FONT, size)
    vals = []
    for a in f.get_variation_axes():
        n = a.get("name", b"")
        n = n.decode() if isinstance(n, bytes) else n
        if "eight" in n:
            vals.append(wght)
        elif "ptical" in n:
            vals.append(opsz)
        elif "oft" in n or "onky" in n:
            vals.append(0)
        else:
            vals.append(a["default"])
    f.set_variation_by_axes(vals)
    return f


def die(size):
    t = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=SAGE + (255,))
    f = font(int(size * 0.74))
    bb = d.textbbox((0, 0), "B", font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text((size / 2 - w / 2 - bb[0], size / 2 - h / 2 - bb[1]), "B", font=f, fill=BG + (255,))
    pr, o = size * 0.045, size * 0.17
    for px, py in [(size - o, o), (o, size - o)]:
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=BG + (255,))
    return t


def render(n, frac, angle=-8, ss=4):
    big = n * ss
    im = Image.new("RGB", (big, big), BG)
    t = die(int(big * frac)).rotate(angle, resample=Image.BICUBIC, expand=True)
    im.paste(t, ((big - t.width) // 2, (big - t.height) // 2), t)
    return im.resize((n, n), Image.LANCZOS)


if __name__ == "__main__":
    icon = render(1024, 0.62)
    icon.save(os.path.join(HERE, "icon-only.png"))
    icon.save(os.path.join(HERE, "icon.png"))
    splash = render(2732, 0.20)
    splash.save(os.path.join(HERE, "splash.png"))
    splash.save(os.path.join(HERE, "splash-dark.png"))
