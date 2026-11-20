import { technologies } from './technologies.js';

export const recruitmentBuildings = ['barracks', 'stable', 'workshop'] as const;
export type RecruitmentBuilding = (typeof recruitmentBuildings)[number];

// beta/inc/configs/units.php; noble costs follow the executable actions/noble.php.
export const units = {
  spear: {
    name: technologies.spear.name,
    building: 'barracks',
    cost: { wood: 50, stone: 30, iron: 10 },
    population: 1,
    baseTime: 1000,
  },
  sword: {
    name: technologies.sword.name,
    building: 'barracks',
    cost: { wood: 30, stone: 30, iron: 70 },
    population: 1,
    baseTime: 1500,
  },
  axe: {
    name: technologies.axe.name,
    building: 'barracks',
    cost: { wood: 60, stone: 30, iron: 40 },
    population: 1,
    baseTime: 1250,
  },
  archer: {
    name: technologies.archer.name,
    building: 'barracks',
    cost: { wood: 100, stone: 30, iron: 60 },
    population: 1,
    baseTime: 1300,
  },
  spy: {
    name: technologies.spy.name,
    building: 'stable',
    cost: { wood: 50, stone: 50, iron: 20 },
    population: 2,
    baseTime: 1250,
  },
  light: {
    name: technologies.light.name,
    building: 'stable',
    cost: { wood: 125, stone: 100, iron: 250 },
    population: 4,
    baseTime: 2400,
  },
  heavy: {
    name: technologies.heavy.name,
    building: 'stable',
    cost: { wood: 200, stone: 150, iron: 600 },
    population: 6,
    baseTime: 3600,
  },
  ram: {
    name: technologies.ram.name,
    building: 'workshop',
    cost: { wood: 300, stone: 200, iron: 200 },
    population: 5,
    baseTime: 1250,
  },
  catapult: {
    name: technologies.catapult.name,
    building: 'workshop',
    cost: { wood: 320, stone: 400, iron: 100 },
    population: 8,
    baseTime: 1250,
  },
  noble: {
    name: 'Nobre',
    building: 'noble',
    cost: { wood: 30000, stone: 40000, iron: 40000 },
    population: 100,
    baseTime: 12500,
  },
} as const;
export type UnitCode = keyof typeof units;
export const unitCodes = Object.keys(units) as UnitCode[];

// beta/inc/configs/units.php; actions/place.php uses these values directly.
export const movementSpeeds: Record<UnitCode, number> = {
  spear: 18,
  sword: 22,
  axe: 18,
  archer: 18,
  spy: 9,
  light: 10,
  heavy: 11,
  ram: 30,
  catapult: 30,
  noble: 35,
};
export type Troops = Record<UnitCode, number>;

export const coinCost = { wood: 18000, stone: 20000, iron: 20000 } as const;
