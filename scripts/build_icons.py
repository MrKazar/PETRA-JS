"""Icônes Android de chaque thème (l'icône du téléphone suit le thème choisi dans l'appli).

Écrit, pour chaque thème autre que militaire / spartiate (qui garde ic_launcher) :
  mipmap-<densité>/ic_launcher_<thème>{,_round,_foreground,_background}.png
  mipmap-anydpi-v26/ic_launcher_<thème>{,_round}.xml
  desktop/build/icons/<thème>.png  (icône de la fenêtre et de la barre des tâches de PCTRA)
À lancer après scripts/build_themes.py.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"
RES = ROOT / "android" / "app" / "src" / "main" / "res"
DESKTOP = ROOT / "desktop" / "build" / "icons"
DESKTOP_SIZE = 256
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
    # Thèmes secrets (PETRA 1.3.14)
    "loup": ("emblem-loup.webp", (6, 11, 26), 0.92),
    "phalange": ("emblem-phalange.webp", (13, 6, 5), 0.92),
    "phenix": ("emblem-phenix.webp", (18, 6, 4), 0.92),
    "nuit": ("emblem-nuit.webp", (4, 6, 26), 0.92),
    "miroir": ("emblem-miroir.webp", (15, 17, 19), 0.92),
    "citrouille": ("emblem-citrouille.webp", (18, 10, 22), 0.92),
    "leonidas": ("emblem-leonidas.webp", (18, 10, 6), 0.92),
    "immortel": ("emblem-immortel.webp", (244, 241, 234), 0.92),
    # Thèmes de palier (niveau d'XP) : fond = 1re couleur du thème (src/ui/theme.ts)
    "olympe": ("emblem-olympe.webp", (243, 239, 230), 0.78),
    "arene": ("emblem-arene.webp", (23, 17, 11), 0.78),
    "acier": ("emblem-acier.webp", (11, 14, 18), 0.78),
    "jade": ("emblem-jade.webp", (7, 10, 9), 0.78),
    "crepuscule": ("emblem-crepuscule.webp", (20, 10, 16), 0.78),
    "abysse": ("emblem-abysse.webp", (5, 13, 20), 0.78),
    "givre": ("emblem-givre.webp", (238, 244, 248), 0.78),
    "lave": ("emblem-lave.webp", (10, 7, 6), 0.78),
    "sakura": ("emblem-sakura.webp", (251, 243, 244), 0.78),
    "carbone": ("emblem-carbone.webp", (12, 12, 12), 0.78),
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


def tile(n, emblem, bg, scale, shape="square"):
    """Icône complète (fond arrondi ou rond + emblème), dessinée en grand puis réduite."""
    big = n * 4
    m = round(big * 8 / 192)
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    dr = ImageDraw.Draw(layer)
    box = [m, m, big - m, big - m]
    if shape == "circle":
        dr.ellipse(box, fill=bg + (255,))
    else:
        dr.rounded_rectangle(box, radius=big // 8, fill=bg + (255,))
    layer.alpha_composite(emblem_on(big, emblem, scale * 0.78))
    return layer.resize((n, n), Image.LANCZOS)


def main():
    DESKTOP.mkdir(parents=True, exist_ok=True)
    for t, (file, bg, scale) in THEMES.items():
        if not (IMG / file).exists():
            continue  # anciens thèmes retirés (police, gendarmerie, forces) : leurs icônes Android restent
        emblem = Image.open(IMG / file).convert("RGBA")
        for d, n in DENSITIES.items():
            folder = RES / f"mipmap-{d}"
            Image.new("RGBA", (n, n), bg + (255,)).save(folder / f"ic_launcher_{t}_background.png")
            emblem_on(n, emblem, scale).save(folder / f"ic_launcher_{t}_foreground.png")
            for name, shape in (("", "square"), ("_round", "circle")):
                tile(n, emblem, bg, scale, shape).save(folder / f"ic_launcher_{t}{name}.png")
        tile(DESKTOP_SIZE, emblem, bg, scale).save(DESKTOP / f"{t}.png")
        for name in ("", "_round"):
            (RES / "mipmap-anydpi-v26" / f"ic_launcher_{t}{name}.xml").write_text(ADAPTIVE.format(t=t), encoding="utf-8")
        print("icônes", t)


if __name__ == "__main__":
    main()
