"""Generate the Android launcher icons, adaptive foreground and splash screens.

Reuses the mark renderer from make_icon.py, so the Android app and the desktop
app share one logo. Run after editing make_icon.py:

  /Users/gongqianyu/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 scripts/make_android_assets.py
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw

_spec = importlib.util.spec_from_file_location(
    "make_icon", Path(__file__).resolve().parent / "make_icon.py"
)
mk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mk)

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"

BROWN = mk.BROWN
INK = mk.INK

DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

# Mark bounding box inside the "body" square, from make_icon's geometry.
MARK_LEFT, MARK_RIGHT = mk.GLYPH_LEFT, mk.DOT_CX + mk.DOT_R
MARK_TOP = mk.DOT_CY - mk.DOT_R
MARK_BOTTOM = mk.GLYPH_BOTTOM
MARK_CX = (MARK_LEFT + MARK_RIGHT) / 2
MARK_CY = (MARK_TOP + MARK_BOTTOM) / 2


def draw_mark(img: Image.Image, body: float, cx: float, cy: float) -> None:
    """Draw the m + dot group centred on (cx, cy), scaled to a body×body box."""
    mk.draw_mark(img, body, cx - MARK_CX * body, cy - MARK_CY * body)


def launcher(size: int, shape: str) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BROWN + (255,))
    draw_mark(canvas, size * 0.78, size / 2, size / 2)

    mask = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(mask)
    if shape == "circle":
        d.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.22), fill=255)
    canvas.putalpha(mask.resize((size, size), Image.LANCZOS))
    return canvas


def foreground(size: int) -> Image.Image:
    """Adaptive icon foreground: transparent, mark inside the 66/108 safe zone."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_mark(canvas, size * 0.62, size / 2, size / 2)
    return canvas


def splash(width: int, height: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), BROWN + (255,))
    draw_mark(canvas, min(width, height) * 0.34, width / 2, height / 2)
    return canvas


def main() -> None:
    for name, scale in DENSITIES.items():
        out = RES / f"mipmap-{name}"
        out.mkdir(parents=True, exist_ok=True)

        legacy = launcher(int(48 * scale), "square")
        legacy.save(out / "ic_launcher.png")
        launcher(int(48 * scale), "circle").save(out / "ic_launcher_round.png")
        foreground(int(108 * scale)).save(out / "ic_launcher_foreground.png")
        print(f"mipmap-{name}: launcher {legacy.size[0]}px, foreground {int(108 * scale)}px")

    # Splash screens: one per orientation bucket, plus the fallback drawable.
    targets: list[tuple[Path, int, int]] = [(RES / "drawable" / "splash.png", 480, 320)]
    for name, scale in DENSITIES.items():
        targets.append((RES / f"drawable-port-{name}" / "splash.png", int(320 * scale), int(480 * scale)))
        targets.append((RES / f"drawable-land-{name}" / "splash.png", int(480 * scale), int(320 * scale)))

    for path, w, h in targets:
        path.parent.mkdir(parents=True, exist_ok=True)
        splash(w, h).convert("RGB").save(path, optimize=True)
    print(f"splash: {len(targets)} images")

    colors = RES / "values" / "ic_launcher_background.xml"
    colors.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<resources>\n"
        f'    <color name="ic_launcher_background">#{BROWN[0]:02X}{BROWN[1]:02X}{BROWN[2]:02X}</color>\n'
        "</resources>\n",
        encoding="utf-8",
    )
    print("values/ic_launcher_background.xml -> brand brown")


if __name__ == "__main__":
    main()
