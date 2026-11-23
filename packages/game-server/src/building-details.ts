import {
  buildings,
  hideCapacity,
  millEffect,
  treasuryEffect,
  storageCapacity,
  wallDefense,
  type BuildingCode,
  type BuildingLevels,
} from '@dwar/game-config';
import type { BuildingView } from '@dwar/api-client';
import { populationCapacity, productionRates } from '@dwar/game-core';

type Stat = BuildingView['details'][number];

/**
 * Indicadores do edifício: o valor no nível atual, no próximo nível (null no máximo) e no nível
 * máximo. `plan` é o ganho da próxima obra que dá para pedir, contado depois do que já está na fila.
 * A interface só mostra; toda conta fica aqui.
 */
export function buildingDetails(
  code: BuildingCode,
  levels: BuildingLevels,
  productionSpeed: number,
  populationUsed: number,
  queuedLevel: number = levels[code],
): BuildingView['details'] {
  const level = levels[code];
  const maxLevel = buildings[code].maxLevel;
  const next = level < maxLevel ? level + 1 : null;
  /** Monta um indicador a partir do valor em um nível qualquer. */
  const stat = (
    label: string,
    unit: string,
    at: (level: number) => number,
    icon?: string,
  ): Stat => ({
    label,
    unit,
    current: at(level),
    next: next === null ? null : at(next),
    max: at(maxLevel),
    plan: queuedLevel < maxLevel ? { current: at(queuedLevel), next: at(queuedLevel + 1) } : null,
    ...(icon ? { icon } : {}),
  });
  if (code === 'wood' || code === 'stone' || code === 'iron')
    return [
      stat(
        'Produção',
        'por hora',
        (n) => productionRates({ ...levels, [code]: n }, productionSpeed)[code],
        code,
      ),
    ];
  if (code === 'farm')
    return [
      stat(
        'Capacidade de população',
        'habitantes',
        (n) => populationCapacity({ ...levels, farm: n }),
        'peasants',
      ),
      {
        label: 'População em uso',
        unit: 'habitantes',
        current: populationUsed,
        next: null,
        max: populationCapacity(levels),
        plan: null,
        icon: 'peasants',
      },
    ];
  if (code === 'mill')
    return [
      stat(
        'Bônus de população',
        '%',
        (n) => Math.round(millEffect.populationBonusPerLevel * n * 100),
        'peasants',
      ),
    ];
  if (code === 'treasury')
    return [
      stat('Desconto em tropas', '%', (n) =>
        Math.round(treasuryEffect.troopDiscountPerLevel * n * 100),
      ),
      stat('Desconto em moedas', '%', (n) =>
        Math.round(treasuryEffect.coinDiscountPerLevel * n * 100),
      ),
    ];
  if (code === 'storage')
    return [stat('Capacidade', 'de cada recurso', (n) => storageCapacity[n] ?? 0, 'storage')];
  if (code === 'hide')
    return [stat('Recursos protegidos', 'de cada recurso', (n) => hideCapacity[n] ?? 0, 'storage')];
  if (code === 'wall' && level > 0)
    return [stat('Bônus de defesa', '%', (n) => Math.ceil((wallDefense[n] ?? 0) / 10))];
  return [];
}
