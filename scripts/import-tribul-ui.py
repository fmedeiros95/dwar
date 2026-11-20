#!/usr/bin/env python3
"""Importa os adornos de interface do Tribul (barra de madeira, fita, moldura de avatar) como WebP.

Uso: python3 -I scripts/import-tribul-ui.py <pasta tribul/static/game_images> [destino]

Só lê imagens da origem. Requer Pillow.
"""

import sys
from pathlib import Path

from PIL import Image

if len(sys.argv) < 2:
    sys.exit(__doc__)

src = Path(sys.argv[1])
dst = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('apps/web/public/game/ui')
dst.mkdir(parents=True, exist_ok=True)

pieces = {
    'layout/separator.png': 'wood-bar.webp',
    'sidebar/section-title.png': 'ribbon.webp',
    'player/avatar-frame.png': 'avatar-frame.webp',
    'player/level-gem.png': 'gem.webp',
    'layout/hr.png': 'divider.webp',
}
for name, out in pieces.items():
    source = src / name
    if not source.is_file():
        sys.exit(f'Faltou {source}')
    Image.open(source).convert('RGBA').save(dst / out, 'WEBP', lossless=True, method=4)
    print(out, (dst / out).stat().st_size, 'bytes')
