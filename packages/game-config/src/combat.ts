import type { UnitCode, Troops } from './units.js';
import type { BuildingCode, BuildingLevels, Resources } from './buildings.js';
// Combat rules: moral enabled, 40-50 point loyalty drop per attack with a surviving noble.
export const combatStats: Record<
  UnitCode,
  {
    attack: number;
    footDefense: number;
    cavalryDefense: number;
    archerDefense: number;
    carry: number;
    group: 'foot' | 'cavalry' | 'archer';
  }
> = {
  spear: {
    attack: 10,
    footDefense: 15,
    cavalryDefense: 45,
    archerDefense: 20,
    carry: 25,
    group: 'foot',
  },
  sword: {
    attack: 25,
    footDefense: 50,
    cavalryDefense: 15,
    archerDefense: 40,
    carry: 15,
    group: 'foot',
  },
  axe: {
    attack: 40,
    footDefense: 10,
    cavalryDefense: 5,
    archerDefense: 10,
    carry: 10,
    group: 'foot',
  },
  archer: {
    attack: 15,
    footDefense: 50,
    cavalryDefense: 40,
    archerDefense: 5,
    carry: 10,
    group: 'foot',
  },
  spy: {
    attack: 0,
    footDefense: 2,
    cavalryDefense: 1,
    archerDefense: 2,
    carry: 0,
    group: 'cavalry',
  },
  light: {
    attack: 130,
    footDefense: 30,
    cavalryDefense: 40,
    archerDefense: 30,
    carry: 80,
    group: 'cavalry',
  },
  heavy: {
    attack: 150,
    footDefense: 200,
    cavalryDefense: 80,
    archerDefense: 180,
    carry: 50,
    group: 'cavalry',
  },
  ram: {
    attack: 2,
    footDefense: 20,
    cavalryDefense: 50,
    archerDefense: 20,
    carry: 0,
    group: 'foot',
  },
  catapult: {
    attack: 100,
    footDefense: 100,
    cavalryDefense: 50,
    archerDefense: 100,
    carry: 0,
    group: 'foot',
  },
  noble: {
    attack: 30,
    footDefense: 100,
    cavalryDefense: 50,
    archerDefense: 100,
    carry: 0,
    group: 'foot',
  },
};
export const combatRules = {
  basicDefense: 100,
  spyFactor: 2,
  minimumMorale: 35,
  maxPointRatio: 20,
  loyaltyMinimum: 40,
  loyaltyMaximum: 50,
  loyaltyPerHour: 0.5,
  conqueredLoyalty: 25,
  protectionMinutes: 25,
  refoundationProtectionMinutes: 12.5,
  cancelSeconds: 120,
  ramBase: 4,
  ramFactor: 1.09,
  catapultBase: 195,
  catapultFactor: 1.115,
} as const;
export const wallBonuses = [
  0, 0.04, 0.08, 0.12, 0.16, 0.2, 0.24, 0.29, 0.34, 0.39, 0.44, 0.49, 0.55, 0.6, 0.66, 0.72, 0.79,
  0.85, 0.92, 0.95, 0.99,
];
export const catapultTargets: BuildingCode[] = [
  'main',
  'barracks',
  'stable',
  'workshop',
  'noble',
  'smith',
  'place',
  'market',
  'wood',
  'stone',
  'iron',
  'farm',
  'storage',
  'wall',
];
export const minimumBuildingLevels: Partial<BuildingLevels> = {
  main: 1,
  farm: 1,
  storage: 1,
  hide: 1,
  place: 1,
};
export type BattleSide = {
  villageId: number;
  playerId: number | null;
  name: string;
  username: string;
  x: number;
  y: number;
};
/** Conteúdo de um relatório que não é batalha: remessa de recursos ou chegada de apoio. */
export type NoticePayload =
  | {
      kind: 'trade';
      mode: 'normal' | 'offer';
      /** Papel de quem recebe este aviso: quem enviou ou quem recebeu os recursos. */
      role: 'sender' | 'receiver';
      from: BattleSide;
      to: BattleSide;
      resources: Resources;
    }
  | {
      kind: 'support';
      role: 'sender' | 'receiver';
      from: BattleSide;
      to: BattleSide;
      troops: Troops;
    };
export type BattleRecord = {
  from: BattleSide;
  to: BattleSide;
  winner: 'attacker' | 'defender' | 'draw';
  attacker: Troops;
  attackerLosses: Troops;
  defender: Troops;
  defenderLosses: Troops;
  showDefense: boolean;
  luck: number;
  morale: number;
  loot: Resources;
  lootCapacity: number;
  wall: { before: number; after: number };
  demolition: { code: BuildingCode; before: number; after: number } | null;
  loyalty: { before: number; after: number; conquered: boolean } | null;
  intel: { resources?: Resources; buildings?: BuildingLevels; outsideTroops?: Troops } | null;
};
