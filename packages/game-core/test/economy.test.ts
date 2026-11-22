import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  accrueResources,
  addedPoints,
  buildingCodes,
  buildingCost,
  buildingDuration,
  buildingPoints,
  buildingPopulation,
  capacity,
  coinMintCost,
  deliveredUnits,
  missingRequirements,
  populationCapacity,
  productionRates,
  recruitmentDuration,
  requiredMerchants,
  requiredNobleCoins,
  resourceCodes,
  scaleCost,
  tradeDuration,
  troopCost,
  troopDuration,
  villagePoints,
  type BuildingLevels,
  type Resources,
} from '../src/index.js';
import { farmCapacity } from '@dwar/game-config';
import { buildings, emptyTroopsFor, units } from './helpers.js';

const levels = (overrides: Partial<BuildingLevels> = {}): BuildingLevels => ({
  ...(Object.fromEntries(buildingCodes.map((code) => [code, 0])) as BuildingLevels),
  ...overrides,
});

describe('construções', () => {
  it('o custo cresce a cada nível', () => {
    for (const code of buildingCodes) {
      for (const resource of resourceCodes) {
        assert.ok(
          buildingCost(code, 5)[resource] >= buildingCost(code, 4)[resource],
          `${code}/${resource}`,
        );
      }
    }
  });

  it('o custo do primeiro nível é o custo-base vezes o fator', () => {
    const { baseCost, costFactor } = buildings.main;
    assert.equal(buildingCost('main', 0).wood, Math.round(baseCost.wood * costFactor.wood));
  });

  it('o edifício principal acelera a obra e o mundo mais rápido também', () => {
    const slow = buildingDuration('barracks', 3, 1, 1000);
    assert.ok(buildingDuration('barracks', 3, 10, 1000) < slow);
    assert.ok(buildingDuration('barracks', 3, 1, 2000) < slow);
  });

  it('pontos: o nível 1 vale o valor-base e cada nível seguinte multiplica por 1,2 (arredondado para cima)', () => {
    for (const code of buildingCodes) {
      const { basePoints } = buildings[code];
      // Quirk herdado do Speed Wars: (14 / 1,2) × 1,2 = 14,000000000000002, e o ceil sobe para 15.
      // Só a Tesouraria (base 14) cai nisso, no nível 1. Mudar isso altera pontos já gravados.
      const expectedLevel1 = code === 'treasury' ? basePoints + 1 : basePoints;
      assert.equal(buildingPoints(code, 1), expectedLevel1, code);
      assert.equal(buildingPoints(code, 2), Math.ceil(basePoints * 1.2), code);
      assert.equal(buildingPoints(code, 5), Math.ceil(basePoints * 1.2 ** 4), code);
    }
  });

  it('duração exata: base × 1,2^nível × 0,896281^principal ÷ velocidade', () => {
    const { baseTime } = buildings.barracks;
    assert.equal(buildingDuration('barracks', 0, 0, 1000), Math.round(baseTime));
    assert.equal(buildingDuration('barracks', 3, 0, 1000), Math.round(baseTime * 1.2 ** 3));
    assert.equal(buildingDuration('barracks', 0, 10, 1000), Math.round(baseTime * 0.896281 ** 10));
    assert.equal(buildingDuration('barracks', 0, 0, 4000), Math.round(baseTime / 4));
  });

  it('a duração nunca é menor que 1 segundo', () => {
    assert.equal(buildingDuration('main', 0, 30, 1_000_000), 1);
  });

  it('a população do nível 0 é 0 e a do nível 1 é a base', () => {
    for (const code of buildingCodes) {
      assert.equal(buildingPopulation(code, 0), 0);
      assert.equal(buildingPopulation(code, 1), buildings[code].basePopulation);
    }
  });

  it('pontos: nível 0 vale 0 e a soma da aldeia bate com cada construção', () => {
    assert.equal(buildingPoints('main', 0), 0);
    assert.equal(villagePoints(levels()), 0);
    const sample = levels({ main: 3, wood: 4, wall: 2 });
    assert.equal(
      villagePoints(sample),
      buildingPoints('main', 3) + buildingPoints('wood', 4) + buildingPoints('wall', 2),
    );
  });

  it('pontos ganhos ao evoluir são a diferença entre níveis consecutivos e nunca negativos', () => {
    for (const code of buildingCodes) {
      for (let level = 0; level < 10; level++) {
        assert.equal(
          addedPoints(code, level),
          buildingPoints(code, level + 1) - buildingPoints(code, level),
        );
        assert.ok(addedPoints(code, level) >= 0, `${code} ${level}`);
      }
    }
  });

  it('requisitos: lista o que falta e fica vazia quando cumpridos', () => {
    for (const code of buildingCodes) {
      const required = Object.entries(buildings[code].requirements);
      assert.equal(missingRequirements(code, levels()).length, required.length, code);
      const met = levels(Object.fromEntries(required) as Partial<BuildingLevels>);
      assert.deepEqual(missingRequirements(code, met), [], code);
    }
  });
});

describe('recursos', () => {
  const start: Resources = { wood: 100, stone: 100, iron: 100 };
  const t0 = new Date('2026-01-01T00:00:00Z');
  const hours = (n: number) => new Date(t0.getTime() + n * 3_600_000);
  const farm = levels({ wood: 10, stone: 10, iron: 10, storage: 10 });

  it('acumula proporcional ao tempo e à taxa de produção', () => {
    const rates = productionRates(farm, 1000);
    const result = accrueResources(start, farm, 1000, t0, hours(1));
    for (const resource of resourceCodes) {
      assert.ok(Math.abs(result[resource] - (100 + rates[resource])) < 1e-9);
    }
  });

  it('a velocidade do mundo multiplica a produção', () => {
    const base = productionRates(farm, 1000);
    const fast = productionRates(farm, 3000);
    for (const resource of resourceCodes) assert.equal(fast[resource], base[resource] * 3);
  });

  it('nunca passa da capacidade do armazém', () => {
    const result = accrueResources(start, farm, 1000, t0, hours(100_000));
    for (const resource of resourceCodes) assert.equal(result[resource], capacity(farm));
  });

  it('tempo negativo não produz nem consome', () => {
    assert.deepEqual(accrueResources(start, farm, 1000, hours(5), t0), start);
  });

  it('não altera o objeto recebido', () => {
    const copy = { ...start };
    accrueResources(start, farm, 1000, t0, hours(3));
    assert.deepEqual(start, copy);
  });

  it('o Moleiro amplia a população em 2% por nível, arredondando para baixo', () => {
    const base = populationCapacity(levels({ farm: 10 }));
    assert.ok(base > 0);
    assert.equal(populationCapacity(levels({ farm: 10, mill: 10 })), Math.floor(base * 1.2));
    assert.equal(populationCapacity(levels()), 0);
  });

  it('o bônus do Moleiro sempre arredonda para baixo, em todos os níveis da fazenda', () => {
    for (let farm = 1; farm <= 30; farm++) {
      for (const mill of [1, 3, 7, 15]) {
        const base = farmCapacity[farm]!;
        assert.equal(
          populationCapacity(levels({ farm, mill })),
          Math.floor(base * (1 + 0.02 * mill)),
          `fazenda ${farm}, moleiro ${mill}`,
        );
      }
    }
  });
});

describe('Tesouraria', () => {
  it('sem Tesouraria o custo é o da unidade', () => {
    assert.deepEqual(troopCost('spear', levels()), units.spear.cost);
  });

  it('desconta 1% por nível nas tropas', () => {
    assert.equal(troopCost('spear', levels({ treasury: 10 })).wood, Math.round(50 * 0.9));
  });

  it('desconta 2% por nível na cunhagem de moedas', () => {
    const cost = coinMintCost(levels({ treasury: 10 }));
    assert.deepEqual(cost, { wood: 14400, stone: 16000, iron: 16000 });
  });

  it('scaleCost multiplica cada recurso', () => {
    assert.deepEqual(scaleCost({ wood: 1, stone: 2, iron: 3 }, 4), { wood: 4, stone: 8, iron: 12 });
  });
});

describe('recrutamento', () => {
  it('o nobre ignora o nível do edifício', () => {
    assert.equal(recruitmentDuration('noble', 1, 1000), recruitmentDuration('noble', 30, 1000));
  });

  it('níveis maiores nunca demoram mais', () => {
    assert.ok(recruitmentDuration('spear', 20, 1000) <= recruitmentDuration('spear', 1, 1000));
  });

  it('o mínimo é 1 segundo', () => {
    assert.equal(recruitmentDuration('spear', 30, 10_000_000), 1);
  });

  it('entrega o lote aos poucos e nunca além da quantidade', () => {
    assert.equal(deliveredUnits(0, 10, 5, 25_000), 2);
    assert.equal(deliveredUnits(0, 10, 5, 50_000), 5);
    assert.equal(deliveredUnits(0, 10, 5, 9_000_000), 5);
  });

  it('antes do início, ou com tempo zero por unidade, não entrega nada', () => {
    assert.equal(deliveredUnits(1000, 10, 5, 1000), 0);
    assert.equal(deliveredUnits(1000, 10, 5, 500), 0);
    assert.equal(deliveredUnits(0, 0, 5, 99_999), 0);
  });
});

describe('academia', () => {
  it('as moedas necessárias seguem os números triangulares', () => {
    assert.equal(requiredNobleCoins(0, 0, 0), 1);
    assert.equal(requiredNobleCoins(1, 0, 0), 3);
    assert.equal(requiredNobleCoins(1, 1, 1), 10);
    assert.equal(requiredNobleCoins(0, 2, 1), requiredNobleCoins(3, 0, 0));
  });
});

describe('mercado', () => {
  it('cada mercador leva 1000 e o resto exige outro', () => {
    assert.equal(requiredMerchants({ wood: 0, stone: 0, iron: 0 }), 0);
    assert.equal(requiredMerchants({ wood: 1, stone: 0, iron: 0 }), 1);
    assert.equal(requiredMerchants({ wood: 400, stone: 300, iron: 300 }), 1);
    assert.equal(requiredMerchants({ wood: 400, stone: 300, iron: 301 }), 2);
  });

  it('a viagem entre o mesmo ponto dura 1 segundo', () => {
    const here = { x: 500, y: 500 };
    assert.equal(tradeDuration(here, here, 1000, 'normal'), 1);
  });

  it('distância 3-4-5: 5 × 360 / (velocidade legada + 1)', () => {
    const from = { x: 0, y: 0 },
      to = { x: 3, y: 4 };
    assert.equal(tradeDuration(from, to, 1000, 'normal'), Math.round(1800 / 2.019));
    assert.equal(tradeDuration(from, to, 1000, 'offer'), 6000);
    assert.equal(tradeDuration(from, to, 2000, 'offer'), 3000);
  });
});

describe('viagem de tropas', () => {
  const from = { x: 0, y: 0 },
    to = { x: 10, y: 0 };

  it('usa a unidade mais lenta do grupo', () => {
    const slowest = { ...emptyTroopsFor(), spear: 1, ram: 1 };
    const onlyRam = { ...emptyTroopsFor(), ram: 1 };
    assert.equal(troopDuration(from, to, slowest, 1000), troopDuration(from, to, onlyRam, 1000));
  });

  it('duração exata: distância × velocidade da unidade ÷ velocidade legada', () => {
    const spear = { ...emptyTroopsFor(), spear: 1 };
    // lanceiro: 18 min/campo × 10 campos ÷ 1,019
    assert.equal(troopDuration(from, to, spear, 1000), Math.round(180 / 1.019));
    assert.equal(troopDuration(from, to, spear, 2000), Math.round(90 / 1.019));
  });

  it('exige pelo menos uma unidade', () => {
    assert.throws(() => troopDuration(from, to, emptyTroopsFor(), 1000), /pelo menos uma unidade/);
  });

  it('mundo e tropas mais rápidos reduzem o tempo', () => {
    const troops = { ...emptyTroopsFor(), spear: 1 };
    const normal = troopDuration(from, to, troops, 1000);
    assert.ok(troopDuration(from, to, troops, 2000) < normal);
    assert.ok(troopDuration(from, to, troops, 1000, 2000) < normal);
  });
});
