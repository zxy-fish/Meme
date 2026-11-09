"""Generate the Meme app icon (brown squircle + serif "m." mark).

The mark is drawn from the real typeface so every size is crisp: the icon is
rendered at 4x and downsampled, then packed into .icns / .ico / PWA PNGs.

Run with the DSH bundled Python (has Pillow):
  /Users/gongqianyu/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 scripts/make_icon.py

macOS-only: it reads system fonts and calls `iconutil`.
"""
from __future__ import annotations

import math
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BROWN = (169, 112, 33)  # #a97021
INK = (255, 246, 235)  # #fff6eb

# Geometry, as fractions of the squircle body (measured from the reference art).
BODY_RATIO = 0.82  # squircle size / canvas
CORNER_RATIO = 0.225  # corner radius / squircle
GLYPH_WIDTH = 0.425  # "m" width / squircle
GLYPH_HEIGHT = 0.2375  # "m" height / squircle
GLYPH_LEFT = 0.275  # "m" left edge / squircle
GLYPH_BOTTOM = 0.6625  # "m" baseline-ish bottom / squircle
DOT_CX, DOT_CY, DOT_R = 0.719, 0.269, 0.075

SERIF = "/System/Library/Fonts/NewYork.ttf"
SERIF_WEIGHT = "Semibold"
FALLBACK = "/System/Library/Fonts/Supplemental/Times New Roman.ttf"

SS = 4  # supersampling
SQUIRCLE_N = 3.5  # superellipse exponent: higher = squarer corners


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """New York if available, otherwise Times New Roman."""
    try:
        font = ImageFont.truetype(SERIF, size)
        try:
            font.set_variation_by_name(SERIF_WEIGHT)
        except Exception:  # noqa: BLE001 - weight axis is optional
            pass
        return font
    except OSError:
        return ImageFont.truetype(FALLBACK, size)


def glyph_image(box: float) -> Image.Image:
    """Render "m" on a transparent canvas at box×box, cropped to its ink."""
    canvas = Image.new("RGBA", (int(box), int(box)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font = load_font(int(box * 0.8))
    draw.text((box * 0.1, box * 0.1), "m", font=font, fill=INK)
    bbox = canvas.getbbox()
    return canvas.crop(bbox) if bbox else canvas


def squircle_mask(size: int, n: float = SQUIRCLE_N) -> Image.Image:
    """Superellipse (iOS-style) rounded square as a single-channel mask."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    # A superellipse reads as a continuous-corner squircle.
    steps = 720
    half = size / 2
    points = []

    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = half + half * (abs(ct) ** (2 / n)) * (1 if ct >= 0 else -1)
        y = half + half * (abs(st) ** (2 / n)) * (1 if st >= 0 else -1)
        points.append((x, y))
    draw.polygon(points, fill=255)
    return mask


def draw_mark(canvas: Image.Image, body: float, dx: float, dy: float) -> None:
    """Draw the m + dot mark inside a body×body box at (dx, dy)."""
    draw = ImageDraw.Draw(canvas)
    # Fit the glyph to the measured box so its proportions match the reference
    # art exactly, whatever serif the machine has.
    gw, gh = body * GLYPH_WIDTH, body * GLYPH_HEIGHT
    glyph = glyph_image(body * 1.2).resize((round(gw), round(gh)), Image.LANCZOS)
    canvas.paste(glyph, (round(dx + body * GLYPH_LEFT), round(dy + body * GLYPH_BOTTOM - gh)), glyph)
    r = body * DOT_R
    cx, cy = dx + body * DOT_CX, dy + body * DOT_CY
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=INK)


def render(size: int, maskable: bool = False) -> Image.Image:
    """Render one icon. Transparent padding, or full-bleed for maskable."""
    big = size * SS
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))

    if maskable:
        # Full-bleed brown so Android can crop it to any shape.
        canvas.paste(BROWN, (0, 0, big, big))
        body = big * BODY_RATIO
        draw_mark(canvas, body, (big - body) / 2, (big - body) / 2)
    else:
        body = big * BODY_RATIO
        offset = (big - body) / 2
        tile = Image.new("RGBA", (int(body), int(body)), BROWN + (255,))
        canvas.paste(tile, (int(offset), int(offset)), squircle_mask(int(body)))
        draw_mark(canvas, body, offset, offset)

    return canvas.resize((size, size), Image.LANCZOS)


def write_icns(master: Image.Image, path: Path) -> None:
    """Pack a 1024 master into an .icns via iconutil."""
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        for base in (16, 32, 128, 256, 512):
            for scale in (1, 2):
                px = base * scale
                name = f"icon_{base}x{base}{'@2x' if scale == 2 else ''}.png"
                master.resize((px, px), Image.LANCZOS).save(iconset / name)
        subprocess.run(
            ["iconutil", "-c", "icns", str(iconset), "-o", str(path)],
            check=True,
        )


def write_ico(master: Image.Image, path: Path) -> None:
    master.save(
        path,
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


def write_favicon(path: Path) -> None:
    """Small vector twin of the icon, for browsers that support SVG favicons."""
    body, off = 52.5, 5.75
    c = lambda v: off + body * v  # noqa: E731
    path.write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        f'<rect x="{off:g}" y="{off:g}" width="{body:g}" height="{body:g}" '
        'rx="11.6" fill="#a97021"/>'
        f'<text x="{c(0.4875):g}" y="{c(0.6625):g}" text-anchor="middle" '
        'font-family="New York, Times New Roman, Georgia, serif" font-weight="600" '
        f'font-size="29" fill="#fff6eb">m</text>'
        f'<circle cx="{c(DOT_CX):g}" cy="{c(DOT_CY):g}" r="{body * DOT_R:g}" fill="#fff6eb"/>'
        "</svg>\n",
        encoding="utf-8",
    )


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    build = root / "build"
    icons = root / "public" / "icons"
    build.mkdir(exist_ok=True)
    icons.mkdir(parents=True, exist_ok=True)

    master = render(1024)
    master.save(build / "icon.png")
    write_icns(master, build / "icon.icns")
    write_ico(master, build / "icon.ico")

    for size in (192, 512):
        render(size).save(icons / f"icon-{size}.png")
    render(512, maskable=True).save(icons / "icon-512-maskable.png")
    write_favicon(root / "public" / "favicon.svg")

    for p in [build / "icon.png", build / "icon.icns", build / "icon.ico"]:
        print(f"{p.relative_to(root)}  {p.stat().st_size / 1024:.0f} KB")
    for size in (192, 512):
        p = icons / f"icon-{size}.png"
        print(f"{p.relative_to(root)}  {p.stat().st_size / 1024:.0f} KB")
    print(f"public/icons/icon-512-maskable.png  {(icons / 'icon-512-maskable.png').stat().st_size / 1024:.0f} KB")
    print("public/favicon.svg")


if __name__ == "__main__":
    main()
