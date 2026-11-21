export {
  type Resources,
  resourceCodes,
  type BuildingDefinition,
  buildings,
  type BuildingCode,
  buildingCodes,
  type BuildingLevels,
} from './buildings.js';

export {
  production,
  storageCapacity,
  farmCapacity,
  hideCapacity,
  wallDefense,
} from './production-tables.js';

export { initialBuildings, initialResources, worldDefaults } from './world-defaults.js';
export { worldSpeedMultiplier } from './world-speed.js';

export { technologies, technologyCodes, type TechnologyCode } from './technologies.js';

export {
  units,
  movementSpeeds,
  type Troops,
  coinCost,
  unitCodes,
  recruitmentBuildings,
  type UnitCode,
  type RecruitmentBuilding,
} from './units.js';

export { merchantCapacity, merchantCounts, legacyUnitSpeed } from './market.js';

export { defaultMapSettings, type MapSettings } from './map.js';

export {
  combatStats,
  combatRules,
  wallBonuses,
  catapultTargets,
  minimumBuildingLevels,
  type BattleSide,
  type BattleRecord,
} from './combat.js';
export { avatarLimits } from './profile.js';
