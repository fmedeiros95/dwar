const paintedPortraits = new Set([
  'spear',
  'sword',
  'axe',
  'archer',
  'spy',
  'light',
  'heavy',
  'ram',
  'catapult',
  'noble',
]);

/** Retrato pintado de 28 px para as telas compactas. */
export function unitIconSrc(code: string): string {
  return paintedPortraits.has(code)
    ? `/game/troops/miniatures/${code}.webp`
    : `/legacy/unit/unit_${code}.png`;
}
export function unitIconSrcSet(code: string): string | undefined {
  return paintedPortraits.has(code)
    ? `${unitIconSrc(code)} 1x, /game/troops/miniatures/${code}@2x.webp 2x`
    : undefined;
}

/** Retrato pintado de 128 px para os cartões maiores. */
export function unitPortraitSrc(code: string): string {
  return paintedPortraits.has(code) ? `/game/troops/painted/${code}.webp` : unitIconSrc(code);
}
