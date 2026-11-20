import {
  buildings,
  buildingCodes,
  resourceCodes,
  production,
  storageCapacity,
  farmCapacity,
  type BuildingCode,
  type BuildingDefinition,
  type BuildingLevels,
  type Resources,
} from '@dwar/game-config';

export { buildingCodes, resourceCodes };
export type { BuildingCode, BuildingLevels, Resources };
export { startingCoordinates } from './starting-coordinates.js';
export { technologyCodes, type TechnologyCode } from '@dwar/game-config';

export function buildingCost(code: BuildingCode, currentLevel: number): Resources {
  const definition = buildings[code];
  return Object.fromEntries(
    resourceCodes.map((resource) => [
      resource,
      Math.round(
        definition.baseCost[resource] * definition.costFactor[resource] ** (currentLevel + 1),
      ),
    ]),
  ) as Resources;
}

export function buildingDuration(
  code: BuildingCode,
  currentLevel: number,
  headquartersLevel: number,
  speed: number,
): number {
  return Math.max(
    1,
    Math.round(
      ((buildings[code].baseTime * 1.2 ** currentLevel) / speed) * 0.896281 ** headquartersLevel,
    ),
  );
}

export function buildingPopulation(code: BuildingCode, targetLevel: number): number {
  const definition = buildings[code];
  if (targetLevel <= 0) return 0;
  if (targetLevel === 1) return definition.basePopulation;
  return Math.round(
    definition.basePopulation * definition.populationFactor ** (targetLevel - 1) -
      definition.basePopulation * definition.populationFactor ** (targetLevel - 2),
  );
}

export function initialPopulation(levels: BuildingLevels): number {
  // Preserve the initial village calculation used by create_village.php.
  return buildingCodes.reduce(
    (sum, code) =>
      levels[code] === 0
        ? sum
        : sum +
          Math.round(
            buildings[code].basePopulation *
              Math.round(buildings[code].populationFactor ** (levels[code] - 1)),
          ),
    0,
  );
}

export function initialPoints(levels: BuildingLevels): number {
  return buildingCodes.reduce(
    (sum, code) =>
      levels[code] === 0
        ? sum
        : sum + Math.round(buildings[code].basePoints * Math.round(1.2 ** (levels[code] - 1))),
    0,
  );
}

export function addedPoints(code: BuildingCode, currentLevel: number): number {
  const base = buildings[code].basePoints;
  return Math.round(base * 1.2 ** currentLevel - base * 1.2 ** (currentLevel - 1));
}

export function capacity(levels: BuildingLevels): number {
  return storageCapacity[levels.storage] ?? 0;
}
export function populationCapacity(levels: BuildingLevels): number {
  return farmCapacity[levels.farm] ?? 0;
}

export function productionRates(levels: BuildingLevels, speed: number): Resources {
  return Object.fromEntries(
    resourceCodes.map((resource) => [resource, (production[levels[resource]] ?? 0) * speed]),
  ) as Resources;
}

export function accrueResources(
  resources: Resources,
  levels: BuildingLevels,
  speed: number,
  from: Date,
  until: Date,
): Resources {
  const hours = Math.max(0, until.getTime() - from.getTime()) / 3_600_000;
  const rates = productionRates(levels, speed);
  // Retain fractional resources in storage: polling cannot manufacture rounding gains.
  return Object.fromEntries(
    resourceCodes.map((resource) => [
      resource,
      Math.min(capacity(levels), resources[resource] + rates[resource] * hours),
    ]),
  ) as Resources;
}

export function missingRequirements(code: BuildingCode, levels: BuildingLevels): string[] {
  const definition: BuildingDefinition = buildings[code];
  return Object.entries(definition.requirements)
    .filter(([required, level]) => levels[required as BuildingCode] < level)
    .map(([required, level]) => `${buildings[required as BuildingCode].name} nível ${level}`);
}

export {
  unitCodes,
  recruitmentBuildings,
  type UnitCode,
  type RecruitmentBuilding,
} from '@dwar/game-config';
export { recruitmentDuration } from './recruitment.js';

export { requiredNobleCoins } from './academy.js';

export { requiredMerchants, tradeDuration } from './market.js';
export { troopDuration } from './troops.js';
export { messageTokens, messageHttpUrl, type MessageToken } from './message-format.js';

export { battle, morale, loyaltyAt, plunder, distributeLosses, emptyTroops } from './combat.js';
export { militaryRank } from './military-rank.js';
