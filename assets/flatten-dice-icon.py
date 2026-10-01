"""Builds the app icon and splash from Devon's dice artwork.

Source: assets/devon-icon-dice-source.png (2048x2048 RGBA, rounded corners
baked in as transparency). iOS applies its own corner mask, so the icon must
be a full-bleed square with no alpha.

Method: fit a smooth 2-D quadratic to the artwork's dark background gradient
(sampled from opaque background pixels outside the dice; RMSE < 0.5 levels),
render that gradient across the whole square, composite the artwork on top,
and downscale to 1024. The transparent corners become a seamless continuation
of the background; nothing is cropped or rescaled, so the dice are untouched.

The splash is the same artwork with the gradient removed (flattened to
#0e1110, the app's background) so it sits seamlessly on a 2732x2732 #0e1110
canvas.

Usage: python3 flatten-dice-icon.py   (needs Pillow + numpy; run in assets/)
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "devon-icon-dice-source.png")
FLAT = np.array([14, 17, 16], float)  # #0e1110

src = Image.open(SRC).convert("RGBA")
W, H = src.size
s = np.asarray(src).astype(float)
rgb, a = s[..., :3], s[..., 3]
yy, xx = np.mgrid[0:H, 0:W]
x, y = xx / W, yy / H
feats = [np.ones_like(x), x, y, x**2, y**2, x * y]

dice_box = (xx > W * 0.166) & (xx < W * 0.781) & (yy > H * 0.093) & (yy < H * 0.957)
m = (a == 255) & (rgb.mean(axis=2) < 35) & ~dice_box
X = np.stack([f[m] for f in feats], 1)
bg = np.stack([sum(c[i] * feats[i] for i in range(6))
               for c in (np.linalg.lstsq(X, rgb[..., ch][m], rcond=None)[0] for ch in range(3))], -1)

alpha = a[..., None] / 255.0
comp = rgb * alpha + bg * (1 - alpha)
dither = np.random.default_rng(1).uniform(-0.5, 0.5, comp.shape)
icon = Image.fromarray(np.clip(comp + dither, 0, 255).round().astype(np.uint8), "RGB")
icon = icon.resize((1024, 1024), Image.LANCZOS)
icon.save(os.path.join(HERE, "icon-only.png"))
icon.save(os.path.join(HERE, "icon.png"))

flat = Image.fromarray(np.clip(comp - bg + FLAT, 0, 255).round().astype(np.uint8), "RGB")
tile = flat.resize((1000, 1000), Image.LANCZOS)
S = 2732
splash = Image.new("RGB", (S, S), tuple(int(v) for v in FLAT))
splash.paste(tile, ((S - 1000) // 2, (S - 1000) // 2))
splash.save(os.path.join(HERE, "splash.png"))
splash.save(os.path.join(HERE, "splash-dark.png"))
