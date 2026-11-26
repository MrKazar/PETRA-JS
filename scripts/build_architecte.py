"""Emblème du thème Architecte (réservé au développeur) : le casque PETRA tracé comme un plan.

Fond bleu de plan avec quadrillage, contour du casque et de la montagne en traits blancs,
lignes de construction, graduations, cotes et cachet doré « DEV ». Écrit public/img/emblem-architecte.webp.
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "img"
S = 2048  # dessin en grand puis réduit (traits nets)
OUT = 512
C = S / 2
R = S * 0.47

BLUE_IN = (18, 72, 140)
BLUE_OUT = (6, 26, 58)
WHITE = (232, 244, 255)
CYAN = (120, 210, 255)
GOLD = (240, 190, 80)


def font(size, bold=True):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def disc_mask(r):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).ellipse([C - r, C - r, C + r, C + r], fill=255)
    return m


def blueprint():
    # Fond : dégradé radial bleu de plan.
    bg = Image.new("RGB", (S, S), BLUE_OUT)
    px = bg.load()
    for y in range(0, S, 4):
        for x in range(0, S, 4):
            d = min(1.0, math.hypot(x - C, y - C) / R)
            t = d ** 1.6
            col = tuple(round(BLUE_IN[i] * (1 - t) + BLUE_OUT[i] * t) for i in range(3))
            for yy in range(y, min(y + 4, S)):
                for xx in range(x, min(x + 4, S)):
                    px[xx, yy] = col
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Quadrillage fin et principal.
    for i in range(0, S, 32):
        a = 40 if i % 128 else 80
        d.line([(i, 0), (i, S)], fill=WHITE + (a,), width=2 if i % 128 else 3)
        d.line([(0, i), (S, i)], fill=WHITE + (a,), width=2 if i % 128 else 3)
    bg = bg.convert("RGBA")
    bg.alpha_composite(layer)
    return bg


def outline(mask, width):
    """Contour d'un masque : dilaté moins érodé."""
    big = mask.filter(ImageFilter.MaxFilter(width * 2 + 1))
    small = mask.filter(ImageFilter.MinFilter(3))
    return ImageChops.subtract(big, small)


def main():
    img = blueprint()
    lines = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lines)

    # Lignes de construction : axes en pointillés et cercles.
    def dashed(p0, p1, dash=28, gap=20, fill=CYAN + (150,), w=4):
        x0, y0 = p0
        x1, y1 = p1
        L = math.hypot(x1 - x0, y1 - y0)
        n = int(L // (dash + gap)) + 1
        for k in range(n):
            a = k * (dash + gap) / L
            b = min(1, (k * (dash + gap) + dash) / L)
            d.line([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], fill=fill, width=w)

    dashed((C, C - R * 0.92), (C, C + R * 0.92))
    dashed((C - R * 0.92, C), (C + R * 0.92, C))
    for rr, a in ((R * 0.62, 120), (R * 0.80, 90)):
        d.ellipse([C - rr, C - rr, C + rr, C + rr], outline=CYAN + (a,), width=4)
    # Diagonales de construction (30°) qui passent par les sommets du triangle.
    for ang in (30, 150):
        t = math.radians(ang)
        dashed((C - math.cos(t) * R * 0.85, C + math.sin(t) * R * 0.85), (C + math.cos(t) * R * 0.85, C - math.sin(t) * R * 0.85), fill=CYAN + (90,), w=3)

    # Casque PETRA en traits blancs, à partir de la silhouette de l'emblème d'origine.
    em = Image.open(IMG / "emblem.webp").convert("RGBA")
    k = 0.70
    em = em.resize((round(S * k), round(S * k)), Image.LANCZOS)
    mask = Image.new("L", (S, S), 0)
    mask.paste(em.getchannel("A").point(lambda v: 255 if v > 110 else 0), (round(C - em.width / 2), round(C - em.height / 2 - S * 0.02)))
    # Fermeture : bouche les petits trous de la texture d'origine, garde les fentes du casque.
    mask = mask.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.MinFilter(13)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    edge = outline(mask, 5)
    glow = edge.filter(ImageFilter.GaussianBlur(14))
    lines.alpha_composite(Image.merge("RGBA", (Image.new("L", (S, S), CYAN[0]), Image.new("L", (S, S), CYAN[1]), Image.new("L", (S, S), CYAN[2]), glow.point(lambda v: min(255, v * 2)))))
    lines.alpha_composite(Image.merge("RGBA", (Image.new("L", (S, S), WHITE[0]), Image.new("L", (S, S), WHITE[1]), Image.new("L", (S, S), WHITE[2]), edge)))
    # Léger voile à l'intérieur de la silhouette (le casque se lit d'un coup d'œil).
    lines.alpha_composite(Image.merge("RGBA", (Image.new("L", (S, S), 200), Image.new("L", (S, S), 230), Image.new("L", (S, S), 255), mask.point(lambda v: 22 if v else 0))))

    d = ImageDraw.Draw(lines)
    # Cote horizontale sous le dessin.
    bb = mask.getbbox()
    y = bb[3] + S * 0.035
    d.line([(bb[0], y), (bb[2], y)], fill=WHITE + (220,), width=4)
    for x in (bb[0], bb[2]):
        d.line([(x, y - 22), (x, y + 22)], fill=WHITE + (220,), width=4)
        d.polygon([(x, y), (x + (34 if x == bb[0] else -34), y - 12), (x + (34 if x == bb[0] else -34), y + 12)], fill=WHITE + (220,))
    f = font(64)
    label = "MRKAZAR"
    w = d.textlength(label, font=f)
    d.rectangle([C - w / 2 - 18, y - 40, C + w / 2 + 18, y + 40], fill=BLUE_IN + (255,))
    d.text((C - w / 2, y - 38), label, font=f, fill=WHITE + (255,))

    # Bague : double cercle, graduations tous les 5°, plus longues tous les 30°.
    ring = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse([C - R, C - R, C + R, C + R], outline=WHITE + (255,), width=14)
    r2 = R - 104
    rd.ellipse([C - r2, C - r2, C + r2, C + r2], outline=WHITE + (230,), width=6)
    for deg in range(0, 360, 5):
        if 35 < deg < 145:
            continue  # bas de la bague : place du texte
        t = math.radians(deg)
        long = deg % 30 == 0
        a, b = R - 14, R - (60 if long else 34)
        rd.line([(C + math.cos(t) * a, C + math.sin(t) * a), (C + math.cos(t) * b, C + math.sin(t) * b)], fill=WHITE + (255 if long else 170,), width=8 if long else 4)
    # Texte courbé dans la bague.
    ft = font(70)
    text = "ARCHITECTE DE PETRA"
    rt = R - 50
    total = sum(rd.textlength(ch, font=ft) for ch in text) * 1.08
    # Le long du bas, lu de gauche à droite : l'angle décroît (repère écran, y vers le bas).
    ang = 90 + math.degrees(total / rt) / 2
    for ch in text:
        cw = rd.textlength(ch, font=ft) * 1.08
        mid = ang - math.degrees(cw / 2 / rt)
        g = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
        ImageDraw.Draw(g).text((70 - cw / 1.08 / 2, 70 - 44), ch, font=ft, fill=WHITE + (240,))
        g = g.rotate(90 - mid, resample=Image.BICUBIC)
        t = math.radians(mid)
        ring.alpha_composite(g, (round(C + math.cos(t) * rt - 70), round(C + math.sin(t) * rt - 70)))
        ang -= math.degrees(cw / rt)

    img.alpha_composite(lines)
    img.alpha_composite(ring)

    # Cachet doré « DEV » en haut à droite.
    seal = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    sx, sy, sr = C + R * 0.60, C - R * 0.60, R * 0.20
    sd.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(120, 78, 18, 255), outline=GOLD + (255,), width=12)
    sd.ellipse([sx - sr * 0.80, sy - sr * 0.80, sx + sr * 0.80, sy + sr * 0.80], outline=GOLD + (220,), width=5)
    for deg in range(0, 360, 20):
        t = math.radians(deg)
        sd.polygon([(sx + math.cos(t) * sr, sy + math.sin(t) * sr), (sx + math.cos(t + 0.09) * sr * 1.14, sy + math.sin(t + 0.09) * sr * 1.14), (sx + math.cos(t + 0.18) * sr, sy + math.sin(t + 0.18) * sr)], fill=GOLD + (255,))
    fs = font(92)
    tw = sd.textlength("DEV", font=fs)
    sd.text((sx - tw / 2, sy - 56), "DEV", font=fs, fill=(255, 226, 150, 255))
    shadow = seal.getchannel("A").filter(ImageFilter.GaussianBlur(16))
    img.alpha_composite(Image.merge("RGBA", (Image.new("L", (S, S), 0),) * 3 + (shadow.point(lambda v: v // 2),)))
    img.alpha_composite(seal)

    # Découpe ronde (avec le cachet qui dépasse un peu).
    cut = disc_mask(R + 8)
    cut = ImageChops.lighter(cut, seal.getchannel("A"))
    img.putalpha(ImageChops.multiply(img.getchannel("A"), cut))
    img = img.resize((OUT, OUT), Image.LANCZOS)
    img.save(IMG / "emblem-architecte.webp", quality=92)
    print("emblem-architecte.webp")


if __name__ == "__main__":
    main()
