import { buildings, type BuildingCode, type BuildingLevels } from '@dwar/game-config';
import { addedPoints, buildingPopulation, populationCapacity } from './index.js';

/** Construções que uma aldeia bárbara pode evoluir (as mesmas do "evoluir" do Speed Wars). */
export const barbarianBuildings: readonly BuildingCode[] = [
  'main',
  'barracks',
  'stable',
  'workshop',
  'market',
  'wood',
  'stone',
  'iron',
  'farm',
  'storage',
  'wall',
];

export type BarbarianUpgrade = {
  code: BuildingCode;
  targetLevel: number;
  points: number;
  population: number;
};

/**
 * Próxima evolução de uma aldeia bárbara, ou null se nada mais cabe. Só entram construções que
 * ainda não chegaram ao nível máximo, cujos requisitos já estão cumpridos, que cabem na
 * população e que **não fazem os pontos ultrapassarem o limite**. Entre as que cabem, as de nível
 * mais baixo têm mais chance, para a aldeia crescer de forma equilibrada.
 */
export function chooseBarbarianUpgrade(
  levels: BuildingLevels,
  points: number,
  populationUsed: number,
  maxPoints: number,
  random: () => number,
): BarbarianUpgrade | null {
  const free = populationCapacity(levels) - populationUsed;
  const candidates = barbarianBuildings.flatMap((code) => {
    const definition = buildings[code];
    const level = levels[code];
    if (level >= definition.maxLevel) return [];
    const unmet = Object.entries(definition.requirements).some(
      ([required, minimum]) => levels[required as BuildingCode] < (minimum ?? 0),
    );
    if (unmet) return [];
    const gained = addedPoints(code, level);
    if (points + gained > maxPoints) return [];
    const population = buildingPopulation(code, level + 1);
    // A fazenda é o que libera população: ela nunca fica presa por falta dela.
    if (code !== 'farm' && population > free) return [];
    return [{ code, targetLevel: level + 1, points: gained, population, weight: 1 / (level + 1) }];
  });
  if (!candidates.length) return null;
  let roll = random() * candidates.reduce((sum, item) => sum + item.weight, 0);
  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) return { ...item };
  }
  return { ...candidates.at(-1)! };
}
