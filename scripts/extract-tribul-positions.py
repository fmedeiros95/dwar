#!/usr/bin/env python3
"""Extrai do CSS do Tribul (game.css, lido só como texto) as posições dos edifícios na aldeia.

Uso: python3 -I scripts/extract-tribul-positions.py <game.css> [saída.json]

Para cada edifício e nível de arte gera: contêiner (left/top/z/largura/altura), deslocamento do
sprite, estrada e área clicável; e a posição do selo de nível (progress-bar) de cada edifício.
"""

import json
import re
import sys
from pathlib import Path

if len(sys.argv) < 2:
    sys.exit(__doc__)

css = Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace')
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(
    'apps/web/src/features/village/overview/tribul-positions.json'
)
css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def props(body: str) -> dict:
    result = {}
    for decl in body.split(';'):
        if ':' not in decl:
            continue
        key, value = decl.split(':', 1)
        key, value = key.strip(), value.strip()
        if key in ('left', 'top', 'width', 'height', 'z-index'):
            number = re.match(r'^-?\d+', value)
            if number:
                result[{'z-index': 'z'}.get(key, key)] = int(number.group())
    return result


buildings: dict = {}
labels: dict = {}
for selector, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
    selector = selector.strip()
    if ',' in selector or selector.startswith('body.'):
        continue
    if m := re.fullmatch(r'#building-(\d+)-container\.level-(\d+) \.building', selector):
        slot = buildings.setdefault(m[1], {}).setdefault(m[2], {})
        slot['sprite'] = props(body)
    elif m := re.fullmatch(r'#building-(\d+)-container\.level-(\d+) \.road', selector):
        slot = buildings.setdefault(m[1], {}).setdefault(m[2], {})
        slot['road'] = props(body)
    elif m := re.fullmatch(r'#building-(\d+)-container\.level-(\d+)', selector):
        slot = buildings.setdefault(m[1], {}).setdefault(m[2], {})
        slot['container'] = props(body)
    elif m := re.fullmatch(r'#selectable-(\d+)\.level-(\d+)', selector):
        slot = buildings.setdefault(m[1], {}).setdefault(m[2], {})
        slot['hit'] = props(body)
    elif m := re.fullmatch(r'#town \.progress-bar\.progress-bar-(\d+)', selector):
        labels[m[1]] = props(body)

result = {
    'scene': {'width': 1600, 'height': 1000},
    'buildings': {k: buildings[k] for k in sorted(buildings, key=int)},
    'labels': {k: labels[k] for k in sorted(labels, key=int)},
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=1) + '\n')
levels = sum(len(v) for v in buildings.values())
print(f'{len(buildings)} edifícios, {levels} níveis, {len(labels)} rótulos -> {out}')
