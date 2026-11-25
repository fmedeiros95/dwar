"""
Retratos de unidade com moldura única (28 px e 56 px para telas 2x).

Os bustos importados do Tribul têm 24×23 px e fundo transparente. Eles entram em 1:1 (sem
ampliação, que os borrava) sobre um fundo de couro com luz vinda do alto à esquerda, a mesma da
aldeia, e um filete bronze. Os retratos pintados dos cartões maiores ficam em
`public/game/troops/painted/` (ver docs/direcao-de-arte.md, seção 7).

Uso: python3 scripts/make-unit-portraits.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

troops = Path(__file__).resolve().parent.parent / 'apps/web/public/game/troops'
target = troops / 'framed'
target.mkdir(exist_ok=True)
# Mesmo mapeamento de apps/web/src/components/unit-icon.ts.
portrait = {
    'spear': 1, 'sword': 2, 'axe': 14, 'archer': 15, 'spy': 9,
    'light': 7, 'heavy': 8, 'ram': 12, 'catapult': 13, 'noble': 11,
}


def frame(scale: int) -> Image.Image:
    size = 28 * scale
    radius = 4 * scale
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    # Couro: luz quente no alto à esquerda caindo para sombra no canto oposto.
    leather = Image.new('RGBA', (size, size))
    px = leather.load()
    for y in range(size):
        for x in range(size):
            t = min(1.0, ((x / size) * 0.55 + (y / size) * 0.75))
            r = int(78 - 52 * t)
            g = int(56 - 38 * t)
            b = int(34 - 24 * t)
            px[x, y] = (r, g, b, 255)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius, fill=255)
    base.paste(leather, (0, 0), mask)
    return base, mask


def border(image: Image.Image, scale: int) -> Image.Image:
    size = image.width
    radius = 4 * scale
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius, outline=(155, 106, 34, 255), width=scale)
    # Brilho do filete onde a luz bate (alto e esquerda).
    shine = Image.new('RGBA', image.size, (0, 0, 0, 0))
    ImageDraw.Draw(shine).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius, outline=(255, 217, 138, 150), width=scale
    )
    fade = Image.linear_gradient('L').rotate(45, expand=False).resize(image.size)
    fade = fade.point(lambda v: max(0, 255 - v * 2))
    shine.putalpha(Image.composite(shine.getchannel('A'), Image.new('L', image.size, 0), fade))
    image.alpha_composite(shine)
    return image


for code, index in portrait.items():
    bust = Image.open(troops / f'{index}.png').convert('RGBA')
    for scale in (1, 2):
        canvas, mask = frame(scale)
        figure = bust if scale == 1 else bust.resize((bust.width * 2, bust.height * 2), Image.NEAREST)
        # Sombra de contato curta, para o busto não flutuar no couro.
        shadow = Image.new('RGBA', figure.size, (0, 0, 0, 0))
        shadow.putalpha(figure.getchannel('A').point(lambda a: int(a * 0.55)))
        shadow = shadow.filter(ImageFilter.GaussianBlur(scale))
        left = (canvas.width - figure.width) // 2
        top = canvas.height - figure.height
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        layer.alpha_composite(shadow, (left + scale, top))
        layer.alpha_composite(figure, (left, top))
        clipped = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        clipped.paste(layer, (0, 0), Image.composite(layer.getchannel('A'), Image.new('L', canvas.size, 0), mask))
        canvas.alpha_composite(clipped)
        canvas = border(canvas, scale)
        canvas.save(target / f'{code}{"" if scale == 1 else "@2x"}.png', optimize=True)
print(sorted(p.name for p in target.iterdir()))
