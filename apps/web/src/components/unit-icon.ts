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

export function unitIconSrc(code: string): string {
  const index = portrait[code];
  return index ? `/game/troops/${index}.png` : `/legacy/unit/unit_${code}.png`;
}
