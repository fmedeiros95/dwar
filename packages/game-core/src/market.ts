import {
  merchantCapacity,
  legacyUnitSpeed,
  type Resources,
  worldSpeedMultiplier,
} from '@dwar/game-config';
export function requiredMerchants(resources: Resources): number {
  return Math.ceil((resources.wood + resources.stone + resources.iron) / merchantCapacity);
}
export function tradeDuration(
  from: { x: number; y: number },
  to: { x: number; y: number },
  speed: number,
  mode: 'normal' | 'offer',
): number {
  const multiplier = worldSpeedMultiplier(speed);
  return Math.max(
    1,
    Math.round(
      (Math.hypot(to.x - from.x, to.y - from.y) * 360) /
        multiplier /
        (mode === 'normal' ? legacyUnitSpeed + 1 : 0.3),
    ),
  );
}
