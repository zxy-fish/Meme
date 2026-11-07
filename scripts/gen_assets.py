"""Generate the placeholder poster covers and PWA icons.

Run with the DSH bundled Python (has Pillow + numpy):
  /Users/gongqianyu/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 scripts/gen_assets.py
"""
from __future__ import annotations

import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 600, 900

ITEMS = [
    ("frieren", "葬送的芙莉莲", "FRIEREN", "ANIME · 2023", "#0f1830", "#8fa7d9", "#f4f1e8", "#e8b06a", 1),
    ("aot", "进击的巨人", "ATTACK ON TITAN", "ANIME · 2013", "#0b0b0d", "#5a1515", "#f3e9dd", "#d95b43", 2),
    ("interstellar", "星际穿越", "INTERSTELLAR", "MOVIE · 2014", "#050b15", "#17456b", "#e8f0f7", "#e0a458", 3),
    ("dune", "沙丘", "DUNE", "MOVIE · 2021", "#1b1008", "#8a5a2b", "#f6e7cf", "#e8b06a", 4),
    ("threebody", "三体", "THE THREE-BODY PROBLEM", "NOVEL · 2006", "#061416", "#0e3b3a", "#dff5ef", "#6fc7b6", 5),
    ("chainsaw", "链锯人", "CHAINSAW MAN", "MANGA · 2018", "#160606", "#7a1414", "#ffe9e0", "#ff6b4a", 6),
    ("norwegian", "挪威的森林", "NORWEGIAN WOOD", "NOVEL · 1987", "#101a13", "#5d7a5c", "#f4f0df", "#d8c48a", 7),
    ("dungeon", "迷宫饭", "DELICIOUS IN DUNGEON", "MANGA · 2014", "#241408", "#a86a2a", "#fff2d9", "#ffcf70", 8),
]

SONG = "/System/Library/Fonts/Supplemental/Songti.ttc"
HEI = "/System/Library/Fonts/STHeiti Medium.ttc"


def font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=index)


def hexc(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(a: str, b: str) -> Image.Image:
    im = Image.new("RGB", (W, H))
    px = im.load()
    ca, cb = hexc(a), hexc(b)
    for y in range(H):
        t = y / (H - 1)
        for x in range(W):
            px[x, y] = lerp(ca, cb, t * 0.92 + (x / W) * 0.08)
    return im


def split_title(title: str) -> list[str]:
    n = len(title)
    if n <= 5:
        return [title]
    if n == 7:
        return [title[:3], title[3:]]
    first = (n + 1) // 2
    return [title[:first], title[first:]]


def make_cover(slug: str, title: str, en: str, kicker: str, c1: str, c2: str, ink: str, accent: str, num: int) -> None:
    im = gradient(c1, c2).convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rnd = random.Random(num)

    for _ in range(3):
        cx = rnd.choice([-60, W + 40, int(W * 0.72), int(W * 0.2)])
        cy = rnd.choice([120, 260, 420])
        r = rnd.choice([180, 240, 320])
        d.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            outline=hexc(accent) + (rnd.choice([18, 26, 34]),),
            width=rnd.choice([1, 2, 3]),
        )

    d.text((W - 190, 20), f"{num:02d}", font=font(HEI, 220), fill=(255, 255, 255, 11))
    d.line([(0, int(H * 0.62)), (W, int(H * 0.48))], fill=hexc(accent) + (40,), width=1)
    d.rectangle([26, 26, W - 26, H - 26], outline=(255, 255, 255, 24), width=1)
    d.text((48, 52), kicker, font=font(HEI, 19), fill=hexc(ink) + (190,))

    lines = split_title(title)
    fs = 82 if len(lines) == 1 else 78
    f = font(SONG, fs, index=1)
    y = H - 250 - (len(lines) - 1) * fs
    for line in lines:
        d.text((48, y), line, font=f, fill=hexc(ink) + (255,))
        y += fs + 6

    d.text((50, H - 118), en, font=font(HEI, 16), fill=hexc(ink) + (150,))
    d.rectangle([50, H - 88, 122, H - 85], fill=hexc(accent) + (230,))

    im = Image.alpha_composite(im, layer)

    arr = np.array(im.convert("RGB")).astype(np.int16)
    noise = np.random.normal(0, 6, (H, W, 1)).repeat(3, axis=2)
    out = Image.fromarray(np.clip(arr + noise, 0, 255).astype(np.uint8)).convert("RGB")

    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    for i in range(120):
        vd.rectangle([i, i, W - i, H - i], outline=int(3 * (120 - i) / 120))
    black = Image.new("RGB", (W, H), (0, 0, 0))
    out = Image.composite(out, black, vig.point(lambda p: 255 - p))
    out.save(f"public/covers/{slug}.jpg", quality=91, optimize=True)


def make_icon(size: int, maskable: bool = False) -> None:
    im = Image.new("RGB", (size, size), (11, 12, 15))
    d = ImageDraw.Draw(im)
    pad = 0 if maskable else int(size * 0.07)
    d.rounded_rectangle(
        [pad, pad, size - pad, size - pad], radius=int(size * 0.22), fill=(232, 176, 106)
    )
    f = font(SONG, int(size * 0.58), index=1)
    bbox = d.textbbox((0, 0), "m", font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.02),
        "m",
        font=f,
        fill=(20, 15, 9),
    )
    d.ellipse([size * 0.66, size * 0.22, size * 0.77, size * 0.33], fill=(20, 15, 9))
    suffix = "-maskable" if maskable else ""
    im.save(f"public/icons/icon-{size}{suffix}.png")


def main() -> None:
    for item in ITEMS:
        make_cover(*item)
        print("cover", item[0])
    make_icon(192)
    make_icon(512)
    make_icon(512, True)
    print("icons done")


if __name__ == "__main__":
    main()
