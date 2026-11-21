import { units, type UnitCode, worldSpeedMultiplier } from '@dwar/game-config';

export function recruitmentDuration(
  code: UnitCode,
  buildingLevel: number,
  worldSpeed: number,
): number {
  const multiplier = worldSpeedMultiplier(worldSpeed);
  if (code === 'noble') return Math.max(1, Math.floor(units.noble.baseTime / multiplier));
  // actions/barracks.php (also stable.php/workshop.php), with a one-second minimum.
  return Math.max(1, Math.floor(units[code].baseTime / multiplier / buildingLevel ** 0.2));
}

/**
 * Quantas unidades de um lote já ficaram prontas. A unidade k termina em `startsAt + k × unitSeconds`;
 * por isso o lote vai sendo entregue aos poucos e não só no fim.
 */
export function deliveredUnits(
  startsAtMs: number,
  unitSeconds: number,
  quantity: number,
  nowMs: number,
): number {
  if (nowMs <= startsAtMs || unitSeconds <= 0) return 0;
  return Math.min(quantity, Math.floor((nowMs - startsAtMs) / (unitSeconds * 1000)));
}
