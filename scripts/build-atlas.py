#!/usr/bin/env python3
"""Turn the raw sprite sheet into the runtime atlas.

KingPepe's sheet draws everything on the 2600's blue playfield colour. KAPLAY clears to
that same blue, so we key it out to transparent. The maze art also has the video wafers
and power pills baked in; the game draws those itself (so they can be eaten), so they are
keyed out of the maze too. Sprite coordinates are unchanged, so src/game/sprites.ts
indexes the atlas exactly as the raw sheet.

Usage: pip install pillow && python3 scripts/build-atlas.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "general.png"
OUT = ROOT / "public" / "assets" / "sprites" / "atlas.png"

BLUE = (45, 50, 184)
TAN = (162, 134, 56)  # walls and wafers share this colour
PILL = (204, 216, 110)
MAZE_BOTTOM = 168  # the maze occupies rows 0..167 of the sheet

im = Image.open(SRC).convert("RGBA")
px = im.load()


def rgb(x, y):
    return px[x, y][:3]


def is_wafer(x, y):
    # Wafers are 2px-tall tan bars; every wall is at least 4px tall.
    if rgb(x, y) != TAN:
        return False
    top = y
    while top > 0 and rgb(x, top - 1) == TAN:
        top -= 1
    bottom = y
    while bottom < MAZE_BOTTOM - 1 and rgb(x, bottom + 1) == TAN:
        bottom += 1
    return bottom - top + 1 <= 2


clear = [
    (x, y)
    for y in range(im.height)
    for x in range(im.width)
    if rgb(x, y) == BLUE or (y < MAZE_BOTTOM and (rgb(x, y) == PILL or is_wafer(x, y)))
]
for x, y in clear:
    px[x, y] = (0, 0, 0, 0)

OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT)
print(f"wrote {OUT.relative_to(ROOT)} ({im.width}x{im.height})")
