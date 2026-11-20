import type { BuildingCode, Resources } from './buildings.js';

type TechnologyDefinition = {
  name: string;
  cost: Resources;
  durationSeconds: number;
  requirements: Partial<Record<BuildingCode, number>>;
  initiallyResearched: boolean;
};

// actions/smith.php, beta/inc/configs/techs.php and the villages SQL defaults.
export const technologies = {
  spear: {
    name: 'Lanceiro',
    cost: { wood: 0, stone: 0, iron: 0 },
    durationSeconds: 0,
    requirements: {},
    initiallyResearched: true,
  },
  sword: {
    name: 'Espadachim',
    cost: { wood: 200, stone: 240, iron: 320 },
    durationSeconds: 90,
    requirements: { smith: 1 },
    initiallyResearched: false,
  },
  axe: {
    name: 'Bárbaro',
    cost: { wood: 700, stone: 840, iron: 820 },
    durationSeconds: 180,
    requirements: { smith: 2 },
    initiallyResearched: false,
  },
  archer: {
    name: 'Arqueiro',
    cost: { wood: 640, stone: 560, iron: 740 },
    durationSeconds: 180,
    requirements: { barracks: 5, smith: 2 },
    initiallyResearched: false,
  },
  spy: {
    name: 'Explorador',
    cost: { wood: 560, stone: 480, iron: 480 },
    durationSeconds: 180,
    requirements: { stable: 1 },
    initiallyResearched: false,
  },
  light: {
    name: 'Cavalaria leve',
    cost: { wood: 2200, stone: 2400, iron: 2000 },
    durationSeconds: 180,
    requirements: { stable: 3 },
    initiallyResearched: false,
  },
  heavy: {
    name: 'Cavalaria pesada',
    cost: { wood: 3000, stone: 2400, iron: 2000 },
    durationSeconds: 180,
    requirements: { stable: 10, smith: 15 },
    initiallyResearched: false,
  },
  ram: {
    name: 'Aríete',
    cost: { wood: 1200, stone: 1600, iron: 800 },
    durationSeconds: 180,
    requirements: { workshop: 1 },
    initiallyResearched: false,
  },
  catapult: {
    name: 'Catapulta',
    cost: { wood: 1600, stone: 2000, iron: 1200 },
    durationSeconds: 180,
    requirements: { workshop: 2, smith: 12 },
    initiallyResearched: false,
  },
} satisfies Record<string, TechnologyDefinition>;

export type TechnologyCode = keyof typeof technologies;
export const technologyCodes = Object.keys(technologies) as TechnologyCode[];
