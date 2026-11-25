import {
  insufficientCoins,
  insufficientResources,
  type Resources,
  type VillageSnapshot,
} from '@dwar/api-client';
import { resources } from './format.js';

/** Atualiza opções que mudam só com o tempo. Filas e demais ações vêm do servidor. */
export function projectVillage(snapshot: VillageSnapshot, have: Resources, clock: number) {
  const canAfford = (cost: Resources) => resources.every(({ code }) => have[code] >= cost[code]);
  const buildings = snapshot.buildings.map((building) =>
    building.resourcesAvailableAt && canAfford(building.cost)
      ? { ...building, canBuild: true, unavailableReason: null, resourcesAvailableAt: null }
      : building,
  );
  const technologies = snapshot.technologies.map((technology) =>
    technology.status === 'unavailable' &&
    technology.unavailableReason === insufficientResources &&
    canAfford(technology.cost)
      ? { ...technology, status: 'available' as const, unavailableReason: null }
      : technology,
  );

  const academy = { ...snapshot.academy };
  const noble = snapshot.units.find((unit) => unit.code === 'noble');
  if (academy.recruitResourcesAvailableAt && noble && canAfford(noble.cost)) {
    academy.canRecruit = academy.coinsMissing === 0;
    academy.recruitUnavailableReason = academy.canRecruit ? null : insufficientCoins;
    academy.recruitResourcesAvailableAt = null;
  }
  if (academy.mintResourcesAvailableAt && canAfford(academy.coinCost)) {
    academy.canMint = true;
    academy.mintUnavailableReason = null;
    academy.mintResourcesAvailableAt = null;
  }

  const freePopulation = snapshot.village.populationCapacity - snapshot.village.populationUsed;
  const units = snapshot.units.map((unit) => {
    if (unit.code === 'noble')
      return {
        ...unit,
        unavailableReason: academy.recruitUnavailableReason,
        maxRecruitable: academy.canRecruit ? 1 : 0,
      };
    if (unit.unavailableReason && unit.unavailableReason !== insufficientResources) return unit;
    if (!canAfford(unit.cost)) return unit;
    return {
      ...unit,
      unavailableReason: null,
      maxRecruitable: Math.min(
        99999,
        Math.floor(freePopulation / unit.population),
        ...resources.map(({ code }) =>
          unit.cost[code] === 0 ? Infinity : Math.floor(have[code] / unit.cost[code]),
        ),
      ),
    };
  });

  const { loyaltyRecovery } = snapshot.village;
  const loyalty = loyaltyRecovery
    ? Math.floor(
        Math.min(
          100,
          loyaltyRecovery.base +
            (Math.max(0, clock - Date.parse(loyaltyRecovery.since)) / 3_600_000) *
              loyaltyRecovery.perHour,
        ),
      )
    : snapshot.village.loyalty;

  return {
    ...snapshot,
    village: { ...snapshot.village, loyalty },
    buildings,
    technologies,
    units,
    academy,
  };
}
