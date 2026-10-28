"""Icônes Android de chaque thème (l'icône du téléphone suit le thème choisi dans l'appli).

Écrit, pour chaque thème autre que militaire (qui garde ic_launcher) :
  mipmap-<densité>/ic_launcher_<thème>{,_round,_foreground,_background}.png
  mipmap-anydpi-v26/ic_launcher_<thème>{,_round}.xml
À lancer après scripts/build_themes.py.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
DENSITIES = {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

# thème -> (emblème, couleur de fond, part de l'icône occupée par l'emblème)
THEMES = {
    "police": ("emblem-police.webp", (14, 26, 51), 0.80),
    "gendarmerie": ("emblem-gendarmerie.webp", (11, 18, 38), 0.80),
    "forces": ("emblem-forces.webp", (18, 19, 18), 0.86),
    "minimal": ("emblem-minimal.webp", (255, 255, 255), 0.70),
    "vantablack": ("emblem-vantablack.webp", (0, 0, 0), 0.74),
    "pompier": ("emblem-pompier.webp", (24, 16, 14), 0.86),
    "neon": ("emblem-neon.webp", (10, 4, 20), 0.86),
}

ADAPTIVE = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_{t}_background" android:inset="16.7%" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_{t}_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
"""


def emblem_on(size, emblem, scale):
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    e = emblem.resize((round(size * scale),) * 2, Image.LANCZOS)
    out.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
    return out


def main():
    for t, (file, bg, scale) in THEMES.items():
        emblem = Image.open(IMG / file).convert("RGBA")
        for d, n in DENSITIES.items():
            folder = RES / f"mipmap-{d}"
            Image.new("RGBA", (n, n), bg + (255,)).save(folder / f"ic_launcher_{t}_background.png")
            emblem_on(n, emblem, scale).save(folder / f"ic_launcher_{t}_foreground.png")
            big = n * 4
            m = round(big * 8 / 192)
            for name, shape in (("", "square"), ("_round", "circle")):
                layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
                dr = ImageDraw.Draw(layer)
                box = [m, m, big - m, big - m]
                if shape == "circle":
                    dr.ellipse(box, fill=bg + (255,))
                else:
                    dr.rounded_rectangle(box, radius=big // 8, fill=bg + (255,))
                layer.alpha_composite(emblem_on(big, emblem, scale * 0.78))
                layer.resize((n, n), Image.LANCZOS).save(folder / f"ic_launcher_{t}{name}.png")
        for name in ("", "_round"):
            (RES / "mipmap-anydpi-v26" / f"ic_launcher_{t}{name}.xml").write_text(ADAPTIVE.format(t=t), encoding="utf-8")
        print("icônes", t)


if __name__ == "__main__":
    main()
