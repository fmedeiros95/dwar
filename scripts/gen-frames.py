#!/usr/bin/env python3
"""Gera apps/web/src/frames.css: madeira procedural, cantos de latão, fita e medalhão (SVG próprio).

Uso: python3 -I scripts/gen-frames.py
"""
from pathlib import Path
from urllib.parse import quote

def uri(svg: str) -> str:
    return "url(\"data:image/svg+xml," + quote(svg.strip(), safe="/:=,;()' ") .replace("'", "%27") + "\")"

wood = uri('''
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="72">
 <defs>
  <filter id="w" x="0" y="0" width="100%" height="100%">
   <feTurbulence type="fractalNoise" baseFrequency="0.0028 0.11" numOctaves="4" seed="7"/>
   <feColorMatrix values="0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0 0.03  0 0 0 2.1 -0.55"/>
  </filter>
  <filter id="k" x="0" y="0" width="100%" height="100%">
   <feTurbulence type="fractalNoise" baseFrequency="0.9 0.05" numOctaves="2" seed="2"/>
   <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.6  0 0 0 0 0.3  0 0 0 0.9 -0.5"/>
  </filter>
  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
   <stop offset="0" stop-color="#5a3a24"/><stop offset="1" stop-color="#3b2415"/>
  </linearGradient>
 </defs>
 <rect width="900" height="72" fill="url(#g)"/>
 <rect width="900" height="72" filter="url(#k)" opacity="0.35"/>
 <rect width="900" height="72" filter="url(#w)"/>
 <path d="M0 36.5H900" stroke="#140904" stroke-opacity="0.6" stroke-width="1.4"/>
 <path d="M0 37.6H900" stroke="#c89860" stroke-opacity="0.14"/>
</svg>''')

def corner(transform: str) -> str:
    return uri(f'''
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
 <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#f1d28a"/><stop offset="1" stop-color="#9a6d26"/></linearGradient></defs>
 <g transform="{transform}">
  <path d="M2 42 V12 C2 6 6 2 12 2 H42 V6.5 H13 C9.5 6.5 6.5 9.5 6.5 13 V42 Z" fill="url(#b)" stroke="#3a2208" stroke-width="1"/>
  <path d="M14 11 C21 11 22 15 28 15 M11 14 C11 21 15 22 15 28" fill="none" stroke="#3a2208" stroke-width="1.2" stroke-linecap="round" opacity=".65"/>
  <circle cx="12" cy="12" r="3.6" fill="url(#b)" stroke="#3a2208" stroke-width="1"/>
  <circle cx="12" cy="12" r="1.2" fill="#3a2208"/>
 </g>
</svg>''')

tl = corner("")
tr = corner("translate(44 0) scale(-1 1)")
bl = corner("translate(0 44) scale(1 -1)")
br = corner("translate(44 44) scale(-1 -1)")

ribbon = uri('''
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="36" viewBox="0 0 140 36">
 <defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#f1d28a"/><stop offset="1" stop-color="#b98b3d"/></linearGradient>
  <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#9a6d26"/><stop offset="1" stop-color="#6b4716"/></linearGradient></defs>
 <path d="M1 9 H30 V30 H1 L9 19.5 Z" fill="url(#d)" stroke="#3a2208"/>
 <path d="M139 9 H110 V30 H139 L131 19.5 Z" fill="url(#d)" stroke="#3a2208"/>
 <path d="M30 4 H110 V26 H30 Z" fill="url(#r)" stroke="#3a2208"/>
 <path d="M30 26 L38 32 V26 Z M110 26 L102 32 V26 Z" fill="#5a3a10" stroke="#3a2208"/>
 <path d="M30 6.5 H110" stroke="#fff6d0" stroke-opacity=".5"/>
</svg>''')

css = f'''
/* ---- Peças gráficas próprias (SVG gerado por scripts/gen-frames.py) ---- */
:root {{
  --wood: {wood};
  --ribbon: {ribbon};
  --corner-tl: {tl};
  --corner-tr: {tr};
  --corner-bl: {bl};
  --corner-br: {br};
}}
.shell-topbar {{
  background:
    linear-gradient(180deg, rgb(0 0 0 / 0.12), rgb(0 0 0 / 0.42)),
    var(--wood) left top / 900px 100% repeat-x,
    var(--oak);
}}
.gw-bar {{
  background:
    linear-gradient(180deg, rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.38)),
    var(--wood) left top / 900px 100% repeat-x,
    var(--oak);
}}
.game-window::before {{
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    var(--corner-tl) left 2px top 48px / 46px 46px no-repeat,
    var(--corner-tr) right 2px top 48px / 46px 46px no-repeat,
    var(--corner-bl) left 2px bottom 2px / 46px 46px no-repeat,
    var(--corner-br) right 2px bottom 2px / 46px 46px no-repeat;
}}
.tech-heading {{
  width: auto;
  min-width: 190px;
  max-width: 100%;
  height: 36px;
  padding: 0 34px;
  line-height: 29px;
  background: none;
  border-style: solid;
  border-width: 0 34px;
  border-image: var(--ribbon) 0 34 fill / 0 34px stretch;
  display: block;
  width: fit-content;
}}
.shell-avatar {{
  width: 40px;
  height: 40px;
  color: #f6e3b2;
  text-shadow: 0 1px 2px #000;
  background: radial-gradient(circle at 35% 30%, #a8382d, #4d150f 80%);
  border-radius: 50%;
  box-shadow:
    0 0 0 2px #c9a04e,
    0 0 0 3.5px #3a2208,
    inset 0 2px 5px rgb(0 0 0 / 0.55);
}}
'''
out = Path(__file__).resolve().parent.parent / 'apps/web/src/frames.css'
out.write_text(css)
print(len(css), 'bytes')
