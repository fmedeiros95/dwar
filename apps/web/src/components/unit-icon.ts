/**
 * Retrato de cada unidade do DWar, entre os 20 retratos do sprite importado do Tribul
 * (public/game/troops/N.png, na ordem do sprite). Ajuste aqui se preferir outro retrato.
 */
const portrait: Record<string, number> = {
  spear: 1,
  sword: 2,
  axe: 14,
  archer: 15,
  spy: 9,
  light: 7,
  heavy: 8,
  ram: 12,
  catapult: 13,
  noble: 11,
};

/** Retrato com a moldura única do jogo (scripts/make-unit-portraits.py), 28 px. */
export function unitIconSrc(code: string): string {
  return portrait[code] ? `/game/troops/framed/${code}.png` : `/legacy/unit/unit_${code}.png`;
}
export function unitIconSrcSet(code: string): string | undefined {
  return portrait[code]
    ? `/game/troops/framed/${code}.png 1x, /game/troops/framed/${code}@2x.png 2x`
    : undefined;
}
