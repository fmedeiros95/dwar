import {
  coinCost,
  resourceCodes,
  treasuryEffect,
  units,
  type BuildingLevels,
  type Resources,
  type UnitCode,
} from '@dwar/game-config';

function discounted(base: Resources, discount: number): Resources {
  return Object.fromEntries(
    resourceCodes.map((resource) => [resource, Math.round(base[resource] * (1 - discount))]),
  ) as Resources;
}

/** Custo em recursos de uma unidade, já com o desconto da Tesouraria (−1% por nível). */
export function troopCost(code: UnitCode, levels: BuildingLevels): Resources {
  return discounted(
    units[code].cost,
    treasuryEffect.troopDiscountPerLevel * (levels.treasury ?? 0),
  );
}

/** Custo da cunhagem de uma moeda, já com o desconto da Tesouraria (−2% por nível). */
export function coinMintCost(levels: BuildingLevels): Resources {
  return discounted(coinCost, treasuryEffect.coinDiscountPerLevel * (levels.treasury ?? 0));
}

/** Multiplica um custo unitário por uma quantidade. */
export function scaleCost(cost: Resources, quantity: number): Resources {
  return {
    wood: cost.wood * quantity,
    stone: cost.stone * quantity,
    iron: cost.iron * quantity,
  };
}
