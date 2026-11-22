"""
Aldeias do mapa em PNG com transparência (60×60), sem a grama embutida.

As aldeias abandonadas (left_*n.jpg) e as de jogador (vil_*n.png) vieram com um ladrilho de grama
pintado por baixo. A grama impedia filtros e contornos limpos e fazia aparecer quadrados quando
o ladrilho do mapa ao lado era outro. Aqui a grama sai por cor (verde saturado), as bordas
ganham meio pixel de suavização e uma sombra de contato curta mantém as aldeias no chão.
As de jogador perdem também o círculo de cor do canto, substituído pelo brasão de dono.

Uso: python3 scripts/make-map-villages.py
"""
import colorsys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

folder = Path(__file__).resolve().parent.parent / 'apps/web/public/legacy/map/new'
target = folder.parent / 'cut'
target.mkdir(exist_ok=True)


def grassiness(r: int, g: int, b: int) -> float:
    """1 para grama, 0 para pedra, telhado, madeira e terra batida."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    hue = h * 360
    if not 55 <= hue <= 150:
        return 0.0
    # Verde pouco saturado é pedra musgosa ou sombra de telhado: fica.
    sat = min(1.0, max(0.0, (s - 0.22) / 0.18))
    dark = 1.0 if v > 0.18 else v / 0.18
    return sat * dark


def cut(source: Path, name: str, owner_slot: bool) -> None:
    image = Image.open(source).convert('RGBA')
    px = image.load()
    mask = Image.new('L', image.size, 0)
    mp = mask.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = px[x, y]
            mp[x, y] = int(255 * (1 - grassiness(r, g, b)) * (a / 255))
    # Tira ilhas de grama dentro das aldeias e pontos soltos fora delas.
    mask = mask.filter(ImageFilter.MedianFilter(3))
    # A primeira linha e a primeira coluna dos arquivos trazem um filete claro de emenda.
    ImageDraw.Draw(mask).rectangle((0, 0, image.width - 1, image.height - 1), outline=0, width=1)
    if owner_slot:
        # Círculo de dono antigo no canto superior esquerdo.
        ImageDraw.Draw(mask).ellipse((1, 1, 17, 17), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(0.5))
    village = image.copy()
    village.putalpha(mask)
    # Sombra de contato: a própria silhueta, deslocada para baixo e à direita (luz do alto à esquerda).
    shadow = Image.new('RGBA', image.size, (18, 22, 8, 0))
    shadow.putalpha(mask.point(lambda a: int(a * 0.45)).filter(ImageFilter.GaussianBlur(1.6)))
    out = Image.new('RGBA', image.size, (0, 0, 0, 0))
    out.alpha_composite(shadow, (1, 2))
    out.alpha_composite(village)
    out.save(target / name, optimize=True)


for tier in range(1, 7):
    cut(folder / f'left_{tier}n.jpg', f'left_{tier}.png', owner_slot=False)
    cut(folder / f'vil_{tier}n.png', f'vil_{tier}.png', owner_slot=True)
print(sorted(p.name for p in target.iterdir()))
