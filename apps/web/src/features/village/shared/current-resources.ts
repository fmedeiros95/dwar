import type { VillageSnapshot } from '@dwar/api-client';
import { resources } from './format.js';

export type Have = Record<(typeof resources)[number]['code'], number>;

/** Recursos disponíveis agora, projetando a produção desde o último snapshot do servidor. */
export function currentResources(snapshot: VillageSnapshot, clock: number): Have {
  const elapsedHours = Math.max(0, clock - new Date(snapshot.serverTime).getTime()) / 3_600_000;
  const { village } = snapshot;
  return Object.fromEntries(
    resources.map(({ code }) => [
      code,
      Math.min(
        village.capacity,
        Math.floor(
          village.resources[code] +
            (village.resourceRemainders?.[code] ?? 0) +
            village.productionPerHour[code] * elapsedHours,
        ),
      ),
    ]),
  ) as Have;
}
