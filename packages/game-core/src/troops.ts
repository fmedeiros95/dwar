import {
  unitCodes,
  movementSpeeds,
  legacyUnitSpeed,
  type Troops,
  worldSpeedMultiplier,
} from '@dwar/game-config';

export function troopDuration(
  from: { x: number; y: number },
  to: { x: number; y: number },
  troops: Troops,
  worldSpeed: number,
  unitSpeed = 1000,
): number {
  const slowest = Math.max(
    ...unitCodes.filter((code) => troops[code] > 0).map((code) => movementSpeeds[code]),
  );
  if (!Number.isFinite(slowest)) throw new Error('Selecione pelo menos uma unidade.');
  // O tempo de viagem depende da velocidade do mundo e da velocidade das tropas, que se combinam.
  const multiplier = worldSpeedMultiplier(worldSpeed) * worldSpeedMultiplier(unitSpeed);
  return Math.max(
    1,
    Math.round((Math.hypot(to.x - from.x, to.y - from.y) * slowest) / multiplier / legacyUnitSpeed),
  );
}
