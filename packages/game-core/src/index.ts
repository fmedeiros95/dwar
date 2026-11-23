import {
  buildings,
  buildingCodes,
  resourceCodes,
  production,
  storageCapacity,
  farmCapacity,
  millEffect,
  type BuildingCode,
  type BuildingDefinition,
  type BuildingLevels,
  type Resources,
  worldSpeedMultiplier,
} from '@dwar/game-config';

export { buildingCodes, resourceCodes };
export type { BuildingCode, BuildingLevels, Resources };
export {
  placeVillage,
  initialPlacement,
  quadrantOf,
  quadrants,
  worldCenter,
  type Placement,
  type PlacementStream,
  type Quadrant,
} from './placement.js';
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
  const multiplier = worldSpeedMultiplier(speed);
  return Math.max(
    1,
    Math.round(
      ((buildings[code].baseTime * 1.2 ** currentLevel) / multiplier) *
        0.896281 ** headquartersLevel,
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

/**
 * Pontos de uma construção no nível dado: nível 0 vale 0, o nível 1 vale o valor-base e cada
 * nível seguinte multiplica por 1,2 (arredondado para cima). Fórmula de get_points do Speed Wars.
 */
export function buildingPoints(code: BuildingCode, level: number): number {
  if (level <= 0) return 0;
  const { basePoints } = buildings[code];
  return Math.ceil((basePoints / 1.2) * 1.2 ** level);
}

/**
 * Pontos da aldeia: a soma dos pontos de cada construção no nível atual. É sempre recalculada a
 * partir dos níveis (nunca acumulada), então não se afasta do correto por erro de arredondamento.
 * Os pontos do jogador são a soma dos pontos das suas aldeias.
 */
export function villagePoints(levels: BuildingLevels): number {
  return buildingCodes.reduce((sum, code) => sum + buildingPoints(code, levels[code]), 0);
}

export const initialPoints = villagePoints;

/** Pontos que a aldeia ganha ao subir a construção do nível atual para o seguinte. */
export function addedPoints(code: BuildingCode, currentLevel: number): number {
  return buildingPoints(code, currentLevel + 1) - buildingPoints(code, currentLevel);
}

export function capacity(levels: BuildingLevels): number {
  return storageCapacity[levels.storage] ?? 0;
}
/** Capacidade da fazenda, ampliada pelo Moleiro (+2% por nível). */
export function populationCapacity(levels: BuildingLevels): number {
  const base = farmCapacity[levels.farm] ?? 0;
  return Math.floor(base * (1 + millEffect.populationBonusPerLevel * (levels.mill ?? 0)));
}

export function productionRates(levels: BuildingLevels, speed: number): Resources {
  const multiplier = worldSpeedMultiplier(speed);
  return Object.fromEntries(
    resourceCodes.map((resource) => [resource, (production[levels[resource]] ?? 0) * multiplier]),
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
export { recruitmentDuration, deliveredUnits } from './recruitment.js';
export {
  chooseBarbarianUpgrade,
  barbarianBuildings,
  type BarbarianUpgrade,
} from './barbarian-growth.js';

export { requiredNobleCoins } from './academy.js';
export { troopCost, coinMintCost, scaleCost } from './treasury.js';

export { requiredMerchants, tradeDuration } from './market.js';
export { troopDuration } from './troops.js';
export {
  messageTokens,
  messageHttpUrl,
  messageListItems,
  messageColor,
  messageSize,
  messageTags,
  type MessageToken,
  type MessageTag,
} from './message-format.js';

export { battle, morale, loyaltyAt, plunder, distributeLosses, emptyTroops } from './combat.js';
export { militaryRank } from './military-rank.js';
export { normalizeRights, noRights, founderRights, canManageMember } from './tribe-rights.js';
export {
  caravanRules,
  caravanLots,
  caravanToll,
  caravanSplit,
  caravanSplitError,
  caravanDefault,
  caravanAbsentChoice,
  caravanCargo,
  caravanUnload,
  otherLot,
  lotTotal,
  type CaravanLot,
  type CaravanLots,
} from './caravan.js';
