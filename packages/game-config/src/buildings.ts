export type Resources = { wood: number; stone: number; iron: number };
export const resourceCodes = ['wood', 'stone', 'iron'] as const;
export type BuildingDefinition = {
  name: string;
  description: string;
  baseCost: Resources;
  costFactor: Resources;
  basePopulation: number;
  populationFactor: number;
  baseTime: number;
  basePoints: number;
  maxLevel: number;
  requirements: Partial<Record<BuildingCode, number>>;
};
export const buildings = {
  main: {
    name: 'Edifício principal',
    description: 'Coordena as obras e reduz o tempo de construção.',
    baseCost: {
      wood: 90,
      stone: 80,
      iron: 70,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 5,
    populationFactor: 1.17,
    baseTime: 1080,
    basePoints: 10,
    maxLevel: 30,
    requirements: {},
  },
  barracks: {
    name: 'Quartel',
    description: 'Forma a infantaria da sua aldeia.',
    baseCost: {
      wood: 200,
      stone: 170,
      iron: 90,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 7,
    populationFactor: 1.17,
    baseTime: 1800,
    basePoints: 16,
    maxLevel: 25,
    requirements: {
      main: 3,
    },
  },
  stable: {
    name: 'Estábulo',
    description: 'Prepara a cavalaria para marchar.',
    baseCost: {
      wood: 270,
      stone: 240,
      iron: 260,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.28,
      iron: 1.26,
    },
    basePopulation: 8,
    populationFactor: 1.17,
    baseTime: 6000,
    basePoints: 20,
    maxLevel: 20,
    requirements: {
      main: 10,
      barracks: 5,
      smith: 5,
    },
  },
  workshop: {
    name: 'Oficina',
    description: 'Produz máquinas de cerco.',
    baseCost: {
      wood: 300,
      stone: 240,
      iron: 260,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.28,
      iron: 1.26,
    },
    basePopulation: 8,
    populationFactor: 1.16,
    baseTime: 6000,
    basePoints: 24,
    maxLevel: 15,
    requirements: {
      main: 10,
      smith: 10,
    },
  },
  noble: {
    name: 'Academia',
    description: 'Prepara a expansão do seu domínio.',
    baseCost: {
      wood: 15000,
      stone: 20000,
      iron: 10000,
    },
    costFactor: {
      wood: 1,
      stone: 1,
      iron: 1,
    },
    basePopulation: 80,
    populationFactor: 1,
    baseTime: 64800,
    basePoints: 512,
    maxLevel: 1,
    requirements: {
      main: 20,
      smith: 20,
      market: 10,
    },
  },
  smith: {
    name: 'Ferreiro',
    description: 'Desenvolve as tecnologias das tropas.',
    baseCost: {
      wood: 220,
      stone: 180,
      iron: 240,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 40,
    populationFactor: 1.17,
    baseTime: 6000,
    basePoints: 19,
    maxLevel: 20,
    requirements: {
      main: 5,
      barracks: 1,
    },
  },
  place: {
    name: 'Praça de reunião',
    description: 'Organiza as tropas e expedições.',
    baseCost: {
      wood: 10,
      stone: 40,
      iron: 30,
    },
    costFactor: {
      wood: 1.2,
      stone: 1.2,
      iron: 1.2,
    },
    basePopulation: 0,
    populationFactor: 1.17,
    baseTime: 2000,
    basePoints: 0,
    maxLevel: 1,
    requirements: {},
  },
  market: {
    name: 'Mercado',
    description: 'Permite transportar e trocar recursos.',
    baseCost: {
      wood: 100,
      stone: 190,
      iron: 100,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 20,
    populationFactor: 1.17,
    baseTime: 2700,
    basePoints: 10,
    maxLevel: 25,
    requirements: {
      main: 3,
      storage: 2,
    },
  },
  wood: {
    name: 'Bosque',
    description: 'Produz a madeira necessária para expandir a aldeia.',
    baseCost: {
      wood: 50,
      stone: 60,
      iron: 40,
    },
    costFactor: {
      wood: 1.25,
      stone: 1.275,
      iron: 1.245,
    },
    basePopulation: 5,
    populationFactor: 1.136,
    baseTime: 900,
    basePoints: 6,
    maxLevel: 30,
    requirements: {},
  },
  stone: {
    name: 'Poço de argila',
    description: 'Extrai argila para novas construções.',
    baseCost: {
      wood: 65,
      stone: 50,
      iron: 40,
    },
    costFactor: {
      wood: 1.27,
      stone: 1.265,
      iron: 1.24,
    },
    basePopulation: 5,
    populationFactor: 1.136,
    baseTime: 900,
    basePoints: 6,
    maxLevel: 30,
    requirements: {},
  },
  iron: {
    name: 'Mina de ferro',
    description: 'Fornece ferro para edifícios e tropas.',
    baseCost: {
      wood: 75,
      stone: 65,
      iron: 70,
    },
    costFactor: {
      wood: 1.25,
      stone: 1.275,
      iron: 1.24,
    },
    basePopulation: 5,
    populationFactor: 1.136,
    baseTime: 1080,
    basePoints: 6,
    maxLevel: 30,
    requirements: {},
  },
  farm: {
    name: 'Fazenda',
    description: 'Amplia a população disponível na aldeia.',
    baseCost: {
      wood: 45,
      stone: 40,
      iron: 30,
    },
    costFactor: {
      wood: 1.3,
      stone: 1.32,
      iron: 1.29,
    },
    basePopulation: 0,
    populationFactor: 1,
    baseTime: 1800,
    basePoints: 5,
    maxLevel: 30,
    requirements: {},
  },
  storage: {
    name: 'Armazém',
    description: 'Aumenta a capacidade de guardar recursos.',
    baseCost: {
      wood: 60,
      stone: 50,
      iron: 40,
    },
    costFactor: {
      wood: 1.265,
      stone: 1.27,
      iron: 1.245,
    },
    basePopulation: 0,
    populationFactor: 1,
    baseTime: 1224,
    basePoints: 6,
    maxLevel: 30,
    requirements: {},
  },
  hide: {
    name: 'Esconderijo',
    description: 'Protege parte dos recursos da aldeia.',
    baseCost: {
      wood: 50,
      stone: 60,
      iron: 50,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 2,
    populationFactor: 1.18,
    baseTime: 2160,
    basePoints: 5,
    maxLevel: 10,
    requirements: {},
  },
  wall: {
    name: 'Muralha',
    description: 'Reforça a defesa da aldeia.',
    baseCost: {
      wood: 50,
      stone: 55,
      iron: 30,
    },
    costFactor: {
      wood: 1.26,
      stone: 1.275,
      iron: 1.26,
    },
    basePopulation: 5,
    populationFactor: 1.18,
    baseTime: 3600,
    basePoints: 8,
    maxLevel: 20,
    requirements: {
      barracks: 1,
    },
  },
} as const;
export type BuildingCode = keyof typeof buildings;
export const buildingCodes = Object.keys(buildings) as BuildingCode[];
export type BuildingLevels = Record<BuildingCode, number>;
