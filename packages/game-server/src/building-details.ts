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

export function buildingDetails(
  code: BuildingCode,
  levels: BuildingLevels,
  productionSpeed: number,
  populationUsed: number,
): BuildingView['details'] {
  const level = levels[code];
  const next = level < buildings[code].maxLevel ? level + 1 : null;
  const rates = productionRates(levels, productionSpeed);
  const rows: BuildingView['details'] = [];
  if (code === 'wood' || code === 'stone' || code === 'iron') {
    rows.push({
      label: 'Produção atual',
      value: rates[code],
      unit: 'por hora',
      icon: code,
    });
    if (next)
      rows.push({
        label: `Produção no nível ${next}`,
        value: productionRates({ ...levels, [code]: next }, productionSpeed)[code],
        unit: 'por hora',
        icon: code,
      });
  } else if (code === 'farm') {
    rows.push({
      label: 'População atual',
      value: populationUsed,
      unit: `/ ${populationCapacity(levels)} habitantes`,
      icon: 'peasants',
    });
    if (next)
      rows.push({
        label: `Capacidade no nível ${next}`,
        value: populationCapacity({ ...levels, farm: next }),
        unit: 'habitantes',
        icon: 'peasants',
      });
  } else if (code === 'mill') {
    const percent = (n: number) => Math.round(millEffect.populationBonusPerLevel * n * 100);
    rows.push({
      label: 'Bônus de população atual',
      value: percent(level),
      unit: '%',
      icon: 'peasants',
    });
    if (next)
      rows.push({
        label: `Bônus no nível ${next}`,
        value: percent(next),
        unit: '%',
        icon: 'peasants',
      });
  } else if (code === 'treasury') {
    const troops = (n: number) => Math.round(treasuryEffect.troopDiscountPerLevel * n * 100);
    const coins = (n: number) => Math.round(treasuryEffect.coinDiscountPerLevel * n * 100);
    rows.push(
      { label: 'Desconto em tropas atual', value: troops(level), unit: '%' },
      { label: 'Desconto em moedas atual', value: coins(level), unit: '%' },
    );
    if (next)
      rows.push(
        { label: `Desconto em tropas no nível ${next}`, value: troops(next), unit: '%' },
        { label: `Desconto em moedas no nível ${next}`, value: coins(next), unit: '%' },
      );
  } else if (code === 'storage' || code === 'hide') {
    const table = code === 'storage' ? storageCapacity : hideCapacity;
    const label = code === 'storage' ? 'Capacidade' : 'Recursos protegidos';
    rows.push({
      label: `${label} atual`,
      value: table[level] ?? 0,
      unit: 'de cada recurso',
      icon: 'storage',
    });
    if (next)
      rows.push({
        label: `${label} no nível ${next}`,
        value: table[next] ?? 0,
        unit: 'de cada recurso',
        icon: 'storage',
      });
  } else if (code === 'wall' && level > 0) {
    rows.push({
      label: 'Defesa atual',
      value: Math.ceil((wallDefense[level] ?? 0) / 10),
      unit: '%',
    });
    if (next)
      rows.push({
        label: `Defesa no nível ${next}`,
        value: Math.ceil((wallDefense[next] ?? 0) / 10),
        unit: '%',
      });
  }
  return rows;
}
