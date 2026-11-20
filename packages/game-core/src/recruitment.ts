import { units, type UnitCode } from '@dwar/game-config';

export function recruitmentDuration(
  code: UnitCode,
  buildingLevel: number,
  worldSpeed: number,
): number {
  if (code === 'noble') return Math.max(1, Math.floor(units.noble.baseTime / worldSpeed));
  // actions/barracks.php (also stable.php/workshop.php), with a one-second minimum.
  return Math.max(1, Math.floor(units[code].baseTime / worldSpeed / buildingLevel ** 0.2));
}
