#!/usr/bin/env python3
"""Importa e otimiza os assets visuais do projeto Tribul para apps/web/public/game.

Uso: python3 -I scripts/import-tribul-assets.py <pasta tribul/static/game_images> [destino] [manifesto.json]

Só lê imagens do diretório de origem (nada é executado de lá). Preserva os JPEGs da aldeia,
converte as outras peças para WebP e registra os níveis, fases e variantes no manifesto.
Requer Pillow.
"""

import json
import re
import sys
from pathlib import Path
from shutil import copyfile

from PIL import Image

if len(sys.argv) < 2:
    sys.exit(__doc__)

src = Path(sys.argv[1])
dst = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('apps/web/public/game')
if not (src / 'town').is_dir():
    sys.exit(f'Origem inválida: {src}')

saved = {'in': 0, 'out': 0}


def save_webp(image: Image.Image, target: Path, quality: int = 86, lossless: bool = False):
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=quality, lossless=lossless, method=3)
    saved['out'] += target.stat().st_size


def convert(source: Path, target: Path, *, reencode: bool = False, **kwargs):
    saved['in'] += source.stat().st_size
    if not reencode and target.exists():
        current = target.stat()
        if current.st_size > 0 and current.st_mtime >= source.stat().st_mtime:
            saved['out'] += current.st_size  # já convertido: permite retomar
            return
    with Image.open(source) as image:
        save_webp(image.convert('RGBA' if source.suffix == '.png' else 'RGB'), target, **kwargs)


# Fundos da aldeia (1600x1000): preserva os JPEGs da origem sem uma segunda compressão.
for name, out in [('town-backing', 'backing'), ('town-backing-winter', 'backing-winter'), ('town-backing-halloween', 'backing-halloween')]:
    source = src / 'town' / f'{name}.jpg'
    target = dst / 'town' / f'{out}.jpg'
    target.parent.mkdir(parents=True, exist_ok=True)
    copyfile(source, target)
    saved['in'] += source.stat().st_size
    saved['out'] += target.stat().st_size

# Edifícios: níveis de arte, fases de obra (25/50/75), estrada, inverno e tema de Halloween.
sprite = re.compile(r'^(\d+)_(\d+|road)(?:-(25|50|75))?(?:-(winter|halloween-theme))?\.png$')
manifest = {}
for folder in sorted((src / 'town' / 'buildings').iterdir(), key=lambda p: int(p.name)):
    building = folder.name
    entry = {
        'tiers': set(),
        'road': False,
        'roadWinter': False,
        'phases': set(),
        'winterSprites': set(),
        'halloween': False,
    }
    for file in sorted(folder.iterdir()):
        match = sprite.match(file.name)
        if file.name == 'thumbnail.png':
            convert(file, dst / 'buildings' / building / 'thumb.webp', lossless=True)
            continue
        if not match:
            continue
        _, tier, phase, theme = match.groups()
        stem = file.name[:-4]
        # Reexporta a partir do PNG mesmo quando já há um WebP de uma versão anterior.
        convert(file, dst / 'buildings' / building / f'{stem}.webp', reencode=True, quality=95)
        if tier == 'road':
            entry['roadWinter' if theme == 'winter' else 'road'] = True
        else:
            entry['tiers'].add(int(tier))
            if theme == 'winter':
                entry['winterSprites'].add(f'{tier}-{phase}' if phase else tier)
        if phase:
            entry['phases'].add(int(phase))
        entry['halloween'] |= theme == 'halloween-theme'
    manifest[building] = {
        'tiers': sorted(entry['tiers']),
        'road': entry['road'],
        'roadWinter': entry['roadWinter'],
        'phases': sorted(entry['phases']),
        'winterSprites': sorted(entry['winterSprites']),
        'halloween': entry['halloween'],
    }

# Recursos (ícones grandes 36px e pequenos 29px).
for file in sorted((src / 'resources').glob('*.png')):
    convert(file, dst / 'resources' / (file.stem + '.webp'), lossless=True)

# Retratos de tropas: sprite 480x23 com 20 retratos de 24px, fatiado em arquivos individuais.
troops = Image.open(src / 'town' / 'troops-small.png').convert('RGBA')
saved['in'] += (src / 'town' / 'troops-small.png').stat().st_size
for index in range(troops.width // 24):
    portrait = troops.crop((index * 24, 0, index * 24 + 24, troops.height))
    target = dst / 'troops' / f'{index + 1}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    portrait.save(target, optimize=True)
    saved['out'] += target.stat().st_size

# Mapa: textura do chão, figuras de marcha, marcadores de aldeia.
convert(src / 'map_objects' / 'textures' / 'backing.jpg', dst / 'map' / 'ground.webp', quality=88)
convert(src / 'map_objects' / 'textures' / 'winter_backing.jpg', dst / 'map' / 'ground-winter.webp', quality=88)
for rel in ['map/route/route-figures.png', 'map/route/cross.png', 'map/map-flags.png', 'map/town-icons.png']:
    convert(src / rel, dst / 'map' / (Path(rel).stem + '.webp'), lossless=True)

manifest_path = Path(sys.argv[3]) if len(sys.argv) > 3 else Path('apps/web/src/features/village/overview/tribul-manifest.json')
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps({'buildings': manifest}, indent=1) + '\n')
print(f'{saved["in"] / 1e6:.1f} MB -> {saved["out"] / 1e6:.1f} MB em {dst}')
