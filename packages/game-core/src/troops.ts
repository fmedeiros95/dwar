import { unitCodes, movementSpeeds, legacyUnitSpeed, type Troops } from '@dwar/game-config';

export function troopDuration(
  from: { x: number; y: number },
  to: { x: number; y: number },
  troops: Troops,
  worldSpeed: number,
): number {
  const slowest = Math.max(
    ...unitCodes.filter((code) => troops[code] > 0).map((code) => movementSpeeds[code]),
  );
  if (!Number.isFinite(slowest)) throw new Error('Selecione pelo menos uma unidade.');
  return Math.max(
    1,
    Math.round((Math.hypot(to.x - from.x, to.y - from.y) * slowest) / worldSpeed / legacyUnitSpeed),
  );
}
