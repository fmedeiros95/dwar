import type { BuildingLevels, Resources } from './buildings.js';

export const initialBuildings: BuildingLevels = {
  main: 5,
  barracks: 0,
  stable: 0,
  workshop: 0,
  noble: 0,
  smith: 0,
  place: 1,
  market: 0,
  wood: 6,
  stone: 6,
  iron: 5,
  farm: 3,
  storage: 2,
  hide: 1,
  wall: 0,
};
export const initialResources: Resources = { wood: 500, stone: 500, iron: 500 };
export const worldDefaults = {
  slug: 'br1',
  name: 'Mundo Beta',
  rulesVersion: 'v1',
  buildSpeed: 1200,
  productionSpeed: 1000,
  maxBuildQueue: 5,
} as const;
