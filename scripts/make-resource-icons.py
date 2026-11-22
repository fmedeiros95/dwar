"""
Ícones de recurso do DWar em 16, 20 e 24 px (1x e 2x), a partir dos ícones pintados de 36 px
importados do Tribul (apps/web/public/game/resources/*B.webp).

Cada tamanho recebe tratamento próprio em vez de uma redução simples:
- recorte pela área pintada, para madeira, argila e ferro ocuparem o mesmo espaço;
- quanto menor o ícone, mais contraste, saturação e nitidez (a 16 px os detalhes somem);
- contorno escuro proporcional ao tamanho, que separa a peça das barras escuras e do papel.

Uso: python3 scripts/make-resource-icons.py
"""
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

root = Path(__file__).resolve().parent.parent / 'apps/web/public/game/resources'
target = root / 'icons'
target.mkdir(exist_ok=True)
sources = {'wood': 'woodB.webp', 'stone': 'clayB.webp', 'iron': 'ironB.webp'}
# O ferro pintado é o mais escuro dos três e some sobre a barra escura.
brightness = {'wood': 1.0, 'stone': 1.0, 'iron': 1.2}
# tamanho: (ocupação do quadro, contraste, saturação, nitidez, contorno em px na 1x)
treatment = {
    16: (1.0, 1.22, 1.18, 1.6, 1),
    20: (0.98, 1.14, 1.12, 1.35, 1),
    24: (0.96, 1.08, 1.06, 1.2, 1),
}


def rim(image: Image.Image, width: int, strength: int) -> Image.Image:
    """Contorno escuro por dilatação do alfa, atrás da pintura."""
    alpha = image.getchannel('A').point(lambda a: 255 if a > 40 else 0)
    grown = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1))
    outline = Image.new('RGBA', image.size, (22, 13, 6, 0))
    outline.putalpha(grown.point(lambda a: strength if a else 0))
    outline.alpha_composite(image)
    return outline


for code, name in sources.items():
    art = Image.open(root / name).convert('RGBA')
    art = art.crop(art.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
    # Ampliar antes de reduzir dá bordas mais limpas do que reduzir direto de 36 px.
    big = art.resize((art.width * 4, art.height * 4), Image.LANCZOS)
    for size, (fill, contrast, saturation, sharp, outline) in treatment.items():
        for scale in (1, 2):
            px = size * scale
            inner = px - 2 * outline * scale
            ratio = inner * fill / max(big.size)
            painted = big.resize((round(big.width * ratio), round(big.height * ratio)), Image.LANCZOS)
            rgb = painted.convert('RGB')
            rgb = ImageEnhance.Brightness(rgb).enhance(brightness[code])
            rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
            rgb = ImageEnhance.Color(rgb).enhance(saturation)
            rgb = ImageEnhance.Sharpness(rgb).enhance(sharp)
            painted = Image.merge('RGBA', (*rgb.split(), painted.getchannel('A')))
            frame = Image.new('RGBA', (px, px), (0, 0, 0, 0))
            frame.alpha_composite(
                painted, ((px - painted.width) // 2, (px - painted.height) // 2)
            )
            frame = rim(frame, outline * scale, 190 if size < 24 else 150)
            suffix = '' if scale == 1 else '@2x'
            frame.save(target / f'{code}-{size}{suffix}.png', optimize=True)
print(sorted(p.name for p in target.iterdir()))
