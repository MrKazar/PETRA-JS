"""Génère les emblèmes des thèmes (public/img/emblem-<thème>.webp) à partir de l'emblème d'origine.

Le casque et la montagne de PETRA restent dans chaque logo : seuls la matière et l'insigne autour changent.
Dessins originaux (aucun insigne officiel reproduit).
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"
SS = 4  # suréchantillonnage pour des bords nets
N = 512


def recolor(src: Image.Image, dark, light, contrast=1.0) -> Image.Image:
    """Repeint l'emblème en gardant sa texture : la luminance va de `dark` à `light`."""
    lum = ImageOps.autocontrast(src.convert("L"))
    if contrast != 1.0:
        lum = lum.point(lambda v: max(0, min(255, int(128 + (v - 128) * contrast))))
    out = ImageOps.colorize(lum, dark, light).convert("RGBA")
    out.putalpha(src.getchannel("A"))
    return out


def canvas():
    return Image.new("RGBA", (N * SS, N * SS), (0, 0, 0, 0))


def finish(img: Image.Image) -> Image.Image:
    return img.resize((N, N), Image.LANCZOS)


def paste_center(base: Image.Image, emblem: Image.Image, size: int, dy=0):
    e = emblem.resize((size, size), Image.LANCZOS)
    base.alpha_composite(e, ((N - size) // 2, (N - size) // 2 + dy))


def star(cx, cy, r, points=5, inner=0.45, rot=-90):
    pts = []
    for i in range(points * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180 / points)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def police(src):
    """Écusson bleu nuit bordé d'argent, étoile au sommet, emblème chromé."""
    c = canvas()
    d = ImageDraw.Draw(c)
    s = SS
    shield = [(256, 14), (496, 84), (482, 318), (256, 504), (30, 318), (16, 84)]
    big = [(x * s, y * s) for x, y in shield]
    d.polygon(big, fill=(200, 208, 222, 255))
    inset = [(256, 36), (474, 100), (462, 308), (256, 478), (50, 308), (38, 100)]
    d.polygon([(x * s, y * s) for x, y in inset], fill=(18, 32, 64, 255))
    inner = [(256, 50), (460, 110), (449, 302), (256, 462), (63, 302), (52, 110)]
    d.line([(x * s, y * s) for x, y in inner + inner[:1]], fill=(120, 140, 175, 255), width=3 * s)
    d.polygon([(x * s, y * s) for x, y in star(256, 86, 20)], fill=(214, 220, 232, 255))
    img = finish(c)
    paste_center(img, recolor(src, (70, 82, 104), (238, 242, 248), 1.2), 262, dy=12)
    return img


def gendarmerie(src):
    """Médaillon rond bleu nuit à double anneau argent, ruban tricolore au sommet, trois étoiles."""
    c = canvas()
    d = ImageDraw.Draw(c)
    s = SS
    d.ellipse([28 * s, 40 * s, 484 * s, 496 * s], fill=(196, 202, 212, 255))
    d.ellipse([42 * s, 54 * s, 470 * s, 482 * s], fill=(14, 24, 48, 255))
    d.ellipse([60 * s, 72 * s, 452 * s, 464 * s], outline=(150, 160, 182, 255), width=3 * s)
    # Ruban tricolore en chevron au sommet du médaillon
    for i, col in enumerate(((58, 90, 140, 255), (232, 231, 222, 255), (165, 64, 64, 255))):
        x0 = 214 + i * 28
        d.polygon([(x * s, y * s) for x, y in [(x0, 22), (x0 + 28, 22), (x0 + 28, 70), (x0 + 14, 60), (x0, 70)]], fill=col)
    for cx in (206, 256, 306):
        d.polygon([(x * s, y * s) for x, y in star(cx, 430 if cx == 256 else 420, 11)], fill=(168, 52, 52, 255))
    img = finish(c)
    paste_center(img, recolor(src, (86, 94, 112), (236, 238, 242), 1.15), 300, dy=-2)
    return img


def forces_speciales(src):
    """Dague verticale derrière l'emblème, ailes stylisées, tons sable sur noir mat."""
    c = canvas()
    d = ImageDraw.Draw(c)
    s = SS
    blade = (58, 60, 54, 255)
    edge = (150, 140, 112, 255)
    # Lame
    d.polygon([(x * s, y * s) for x, y in [(256, 500), (238, 150), (256, 96), (274, 150)]], fill=edge)
    d.polygon([(x * s, y * s) for x, y in [(256, 486), (244, 154), (256, 112), (268, 154)]], fill=blade)
    # Garde et pommeau
    d.rounded_rectangle([170 * s, 76 * s, 342 * s, 96 * s], radius=8 * s, fill=edge)
    d.rectangle([248 * s, 34 * s, 264 * s, 78 * s], fill=edge)
    d.ellipse([240 * s, 14 * s, 272 * s, 46 * s], fill=edge)
    # Ailes : plumes en dégradé de longueur
    for side in (-1, 1):
        for i in range(5):
            y = 250 + i * 26
            x0 = 256 + side * 90
            x1 = 256 + side * (250 - i * 30)
            pts = [(x0, y), (x1, y - 44 + i * 6), (x1 - side * 10, y - 26 + i * 6), (x0, y + 18)]
            d.polygon([(x * s, yy * s) for x, yy in pts], fill=(92, 86, 68, 255) if i % 2 else (118, 110, 86, 255))
    img = finish(c)
    paste_center(img, recolor(src, (40, 38, 32), (214, 198, 156), 1.3), 330, dy=30)
    return img


def pompier(src):
    """Médaillon rouge cerclé de laiton, emblème doré."""
    c = canvas()
    d = ImageDraw.Draw(c)
    s = SS
    d.ellipse([20 * s, 20 * s, 492 * s, 492 * s], fill=(212, 162, 76, 255))
    d.ellipse([38 * s, 38 * s, 474 * s, 474 * s], fill=(122, 20, 20, 255))
    d.ellipse([58 * s, 58 * s, 454 * s, 454 * s], outline=(232, 190, 110, 255), width=4 * s)
    img = finish(c)
    paste_center(img, recolor(src, (60, 18, 14), (246, 214, 150), 1.25), 320)
    return img


def neon(src):
    """Pixel art néon violet : emblème pixelisé, cadre carré en escalier, halo lumineux."""
    px = 64  # grille de pixels
    g = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    # Cadre en escalier (coins crantés), violet profond bordé de magenta
    for inset, col in ((2, (255, 70, 220, 255)), (4, (24, 6, 44, 255))):
        a, b = inset, px - 1 - inset
        d.polygon([(a + 3, a), (b - 3, a), (b, a + 3), (b, b - 3), (b - 3, b), (a + 3, b), (a, b - 3), (a, a + 3)], fill=col)
    d.rectangle([7, 7, px - 8, px - 8], outline=(150, 70, 255, 255))
    # Emblème réduit à 40 px, deux tons néon
    lum = ImageOps.autocontrast(src.convert("L")).resize((48, 48), Image.LANCZOS)
    alpha = src.getchannel("A").resize((48, 48), Image.LANCZOS)
    e = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    for y in range(48):
        for x in range(48):
            if alpha.getpixel((x, y)) > 90:
                v = lum.getpixel((x, y))
                e.putpixel((x, y), (255, 120, 240, 255) if v > 150 else (176, 92, 255, 255) if v > 70 else (70, 24, 130, 255))
    g.alpha_composite(e, (8, 8))
    big = g.resize((N, N), Image.NEAREST)
    glow = big.filter(ImageFilter.GaussianBlur(14))
    out = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(big)
    return out


def minimal(src):
    """Emblème seul, à plat, noir sur fond clair."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    paste_center(img, recolor(src, (0, 0, 0), (58, 58, 58), 1.0), 470)
    return img


def vantablack(src):
    """Silhouette noire absolue avec un liseré de lumière, comme un objet qui absorbe tout."""
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    e = src.resize((470, 470), Image.LANCZOS)
    alpha = e.getchannel("A")
    rim = Image.new("RGBA", e.size, (210, 210, 210, 0))
    rim.putalpha(alpha.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(3)).point(lambda v: int(v * 0.55)))
    glow = Image.new("RGBA", e.size, (255, 255, 255, 0))
    glow.putalpha(alpha.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.18)))
    body = recolor(src.resize((470, 470), Image.LANCZOS), (0, 0, 0), (22, 22, 22), 1.0)
    off = ((N - 470) // 2, (N - 470) // 2)
    for layer in (glow, rim, body):
        img.alpha_composite(layer, off)
    return img


def main():
    src = Image.open(IMG / "emblem.webp").convert("RGBA")
    for name, fn in (("police", police), ("gendarmerie", gendarmerie), ("forces", forces_speciales), ("minimal", minimal), ("vantablack", vantablack), ("pompier", pompier), ("neon", neon)):
        out = IMG / f"emblem-{name}.webp"
        fn(src).save(out, "WEBP", quality=90, method=6)
        print("écrit", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
