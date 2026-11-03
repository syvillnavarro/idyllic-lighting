"""Derive the preview's brand files from the logo reference (B3).

The reference is a 1024px square PNG with cream lettering and an illuminated
house on black. These copies are for the concept preview only and still need
the owner's approval; replace them with the original artwork before launch.

    python scripts/prepare_brand_assets.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source-assets" / "logo-reference-b3.png"
BRAND = ROOT / "src" / "assets" / "brand"
APP = ROOT / "src" / "app"

NIGHT = (11, 14, 19)
BACKGROUND = 7  # the reference's black is (7, 7, 7)
NOISE_FLOOR = 0.03  # compression noise in the black would otherwise become faint alpha everywhere

WORDMARK_BOX = (149, 623, 858, 847)
LOGO_BOX = (68, 195, 920, 847)
GABLE_BOX = (250, 190, 670, 600)


def keyed(rgb: Image.Image) -> Image.Image:
    """Light-on-black artwork as colour plus alpha, so it composites onto any dark surface."""
    src = np.asarray(rgb.convert("RGB")).astype(np.float32)
    alpha = np.clip((src.max(axis=2) - BACKGROUND) / (255 - BACKGROUND), 0, 1)
    alpha[alpha < NOISE_FLOOR] = 0
    a = alpha[..., None]
    colour = np.where(a > 0, (src - (1 - a) * BACKGROUND) / np.maximum(a, 1e-6), 0)
    out = np.dstack([np.clip(colour, 0, 255), alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def flat(img: Image.Image) -> Image.Image:
    """Single-colour lettering: keep the alpha edges, drop the grain in the colour channels."""
    rgba = np.asarray(img).copy()
    solid = rgba[..., 3] > 230
    rgba[..., :3] = np.median(rgba[solid][:, :3], axis=0).round().astype(np.uint8)
    rgba[..., 3][solid] = 255
    return Image.fromarray(rgba, "RGBA")


def fit(img: Image.Image, *, width: int | None = None, height: int | None = None) -> Image.Image:
    if width is not None:
        height = round(img.height * width / img.width)
    else:
        width = round(img.width * height / img.height)
    return img.resize((width, height), Image.Resampling.LANCZOS)


def icon(crop: Image.Image, size: int, fill: float) -> Image.Image:
    canvas = Image.new("RGB", (size, size), NIGHT)
    mark = fit(crop, width=round(size * fill))
    canvas.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def main() -> None:
    logo = Image.open(SOURCE).convert("RGB")
    BRAND.mkdir(parents=True, exist_ok=True)

    wordmark = flat(keyed(logo.crop(WORDMARK_BOX)))
    fit(wordmark, height=120).save(BRAND / "idyllic-wordmark.webp", lossless=True, quality=100, method=6)

    full = keyed(logo.crop(LOGO_BOX))
    fit(full, width=480).save(BRAND / "idyllic-logo.webp", quality=78, alpha_quality=75, method=6)

    gable = logo.crop(GABLE_BOX)
    sizes = (16, 32, 48)
    # Next.js only decodes ICO files whose embedded PNGs are RGBA.
    favicons = [icon(gable, size, 0.92).convert("RGBA") for size in sizes]
    favicons[-1].save(APP / "favicon.ico", sizes=[(s, s) for s in sizes], append_images=favicons[:-1])
    icon(gable, 180, 0.86).save(APP / "apple-icon.png", optimize=True)

    for path in (BRAND / "idyllic-wordmark.webp", BRAND / "idyllic-logo.webp", APP / "favicon.ico", APP / "apple-icon.png"):
        with Image.open(path) as out:
            print(f"{path.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}  {path.stat().st_size:,} B")


if __name__ == "__main__":
    main()
