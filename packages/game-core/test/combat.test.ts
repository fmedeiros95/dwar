import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  battle,
  distributeLosses,
  emptyTroops,
  loyaltyAt,
  morale,
  plunder,
  unitCodes,
  type Resources,
} from '../src/index.js';
import { combatRules, wallBonuses } from '@dwar/game-config';
import { seeded } from './helpers.js';

const troops = (overrides: Partial<Record<(typeof unitCodes)[number], number>>) => ({
  ...emptyTroops(),
  ...overrides,
});
const total = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);

describe('moral', () => {
  it('sem pontos de um dos lados vale 100', () => {
    assert.equal(morale(0, 500), 100);
    assert.equal(morale(500, 0), 100);
  });

  it('pontos iguais ou atacante menor: 100', () => {
    assert.equal(morale(1000, 1000), 100);
    assert.equal(morale(100, 1000), 100);
  });

  it('atacante muito maior que o defensor perde moral, mas nunca abaixo de 35', () => {
    assert.equal(morale(1000, 100), 55);
    assert.equal(morale(1_000_000, 10), 35);
  });
});

describe('lealdade', () => {
  const t0 = new Date('2026-01-01T00:00:00Z');
  const later = (hours: number) => new Date(t0.getTime() + hours * 3_600_000);

  it('recupera 0,5 por hora (arredondado para baixo) e escala com a velocidade', () => {
    assert.equal(loyaltyAt(25, t0, later(1), 1000), 25);
    assert.equal(loyaltyAt(25, t0, later(2), 1000), 26);
    assert.equal(loyaltyAt(25, t0, later(2), 2000), 27);
  });

  it('nunca passa de 100 e tempo negativo não tira lealdade', () => {
    assert.equal(loyaltyAt(99, t0, later(1000), 1000), 100);
    assert.equal(loyaltyAt(25, later(5), t0, 1000), 25);
  });
});

describe('batalha', () => {
  it('atacante forte contra defesa fraca vence e elimina todos os defensores', () => {
    const result = battle(troops({ axe: 500 }), troops({ spear: 10 }), 0, null, 0, 100);
    assert.equal(result.winner, 'attacker');
    assert.equal(result.defenderLosses.spear, 10);
    assert.ok(result.attackerLosses.axe < 500);
  });

  it('perdas exatas quando o atacante vence: (defesa / ataque)^1,5 do contingente', () => {
    // ataque 100 × 40 = 4000; defesa (50 × 15 + 100 básico) = 850; perda = round(100 × (850/4000)^1,5)
    const result = battle(troops({ axe: 100 }), troops({ spear: 50 }), 0, null, 0, 100);
    assert.equal(result.attackerLosses.axe, 10);
    assert.equal(result.defenderLosses.spear, 50);
    assert.equal(result.survivors.axe, 90);
    assert.equal(result.lootCapacity, 90 * 10);
  });

  it('perdas exatas quando o defensor vence: (ataque / defesa)^1,5 do contingente', () => {
    // ataque 5 × 40 = 200; defesa (20 × 50 + 100) = 1100; perda = round(20 × (200/1100)^1,5)
    const result = battle(troops({ axe: 5 }), troops({ sword: 20 }), 0, null, 0, 100);
    assert.equal(result.winner, 'defender');
    assert.equal(result.attackerLosses.axe, 5);
    assert.equal(result.defenderLosses.sword, 2);
  });

  it('a muralha multiplica a defesa pelo bônus do nível (nível 10: +44%)', () => {
    // sem muralha: 850; com muralha 10: 850 × 1,44 = 1224; perda = round(100 × (1224/4000)^1,5)
    const result = battle(troops({ axe: 100 }), troops({ spear: 50 }), 10, null, 0, 100);
    assert.equal(result.attackerLosses.axe, 17);
  });

  it('durante o combate os aríetes reduzem a muralha efetiva do defensor', () => {
    const wall = 10;
    // aríetes suficientes para derrubar exatamente 2 níveis (a metade, 5, é o piso)
    const rams = 2 * combatRules.ramBase * combatRules.ramFactor ** wall;
    assert.equal(Math.round(rams / (combatRules.ramBase * combatRules.ramFactor ** wall)), 2);
    const result = battle(
      troops({ axe: 400, ram: rams }),
      troops({ spear: 50 }),
      wall,
      null,
      0,
      100,
    );
    const attackPower = 400 * 40 + rams * 2;
    const defensePower = (50 * 15 + combatRules.basicDefense) * (1 + wallBonuses[wall - 2]!);
    assert.equal(result.winner, 'attacker');
    assert.equal(result.attackerLosses.axe, Math.round(400 * (defensePower / attackPower) ** 1.5));
  });

  it('defesa forte repele um ataque pequeno e o atacante perde tudo', () => {
    const result = battle(troops({ axe: 5 }), troops({ sword: 400 }), 10, null, 0, 100);
    assert.equal(result.winner, 'defender');
    assert.equal(result.attackerLosses.axe, 5);
    assert.ok(result.defenderLosses.sword < 400);
  });

  it('sem atacantes não há batalha vencida: o defensor fica com a aldeia', () => {
    const result = battle(emptyTroops(), troops({ spear: 5 }), 0, null, 0, 100);
    assert.equal(result.winner, 'defender');
    assert.equal(total(result.defenderLosses), 0);
  });

  it('sorte e moral alteram o resultado na direção esperada', () => {
    const att = troops({ axe: 100 }),
      def = troops({ spear: 100 });
    const base = battle(att, def, 0, null, 0, 100);
    const lucky = battle(att, def, 0, null, 25, 100);
    const unlucky = battle(att, def, 0, null, -25, 100);
    const lowMorale = battle(att, def, 0, null, 0, 40);
    assert.ok(total(lucky.defenderLosses) >= total(base.defenderLosses));
    assert.ok(total(unlucky.attackerLosses) >= total(base.attackerLosses));
    assert.ok(total(lowMorale.attackerLosses) >= total(base.attackerLosses));
  });

  it('a muralha dá vantagem ao defensor', () => {
    const att = troops({ axe: 120 }),
      def = troops({ spear: 100 });
    const open = battle(att, def, 0, null, 0, 100);
    const walled = battle(att, def, 20, null, 0, 100);
    assert.ok(total(walled.attackerLosses) >= total(open.attackerLosses));
  });

  it('aríetes derrubam a muralha, mas nunca abaixo de zero', () => {
    const result = battle(troops({ axe: 300, ram: 50 }), troops({ spear: 5 }), 10, null, 0, 100);
    assert.ok(result.wallAfter < 10);
    assert.ok(result.wallAfter >= 0);
  });

  it('catapultas respeitam o nível mínimo do edifício', () => {
    const result = battle(
      troops({ axe: 500, catapult: 500 }),
      troops({ spear: 1 }),
      0,
      { code: 'main', level: 3 },
      0,
      100,
    );
    assert.equal(result.demolition?.before, 3);
    assert.ok(result.demolition!.after >= 1);
    assert.ok(result.demolition!.after < 3);
  });

  it('só espiões: não matam defensores', () => {
    const result = battle(troops({ spy: 5 }), troops({ spear: 50, spy: 0 }), 0, null, 0, 100);
    assert.equal(total(result.defenderLosses), 0);
    assert.equal(result.winner, 'attacker');
  });

  it('espiões morrem contra uma contra-espionagem forte', () => {
    const result = battle(troops({ spy: 2 }), troops({ spy: 50 }), 0, null, 0, 100);
    assert.equal(result.survivors.spy, 0);
    assert.equal(result.winner, 'defender');
  });

  it('a capacidade de saque soma o que cada sobrevivente carrega', () => {
    const result = battle(troops({ light: 100 }), troops({}), 0, null, 0, 100);
    assert.equal(result.lootCapacity, result.survivors.light * 80);
  });

  it('invariantes em 300 batalhas aleatórias: perdas ≤ tropas, sobreviventes = tropas − perdas', () => {
    const random = seeded(2026);
    const pick = () => Math.floor(random() * 400);
    for (let i = 0; i < 300; i++) {
      const att = troops({
        axe: pick(),
        light: pick(),
        ram: Math.floor(random() * 40),
        catapult: Math.floor(random() * 40),
        spy: Math.floor(random() * 10),
      });
      const def = troops({
        spear: pick(),
        sword: pick(),
        archer: pick(),
        spy: Math.floor(random() * 10),
      });
      const wall = Math.floor(random() * 21);
      const result = battle(
        att,
        def,
        wall,
        random() < 0.5 ? { code: 'barracks', level: 1 + Math.floor(random() * 10) } : null,
        Math.floor(random() * 51) - 25,
        35 + Math.floor(random() * 66),
      );
      for (const code of unitCodes) {
        assert.ok(result.attackerLosses[code] >= 0 && result.attackerLosses[code] <= att[code]);
        assert.ok(result.defenderLosses[code] >= 0 && result.defenderLosses[code] <= def[code]);
        assert.equal(result.survivors[code], att[code] - result.attackerLosses[code]);
      }
      assert.ok(result.wallAfter >= 0 && result.wallAfter <= wall);
      assert.ok(result.lootCapacity >= 0);
    }
  });
});

describe('saque', () => {
  const stock: Resources = { wood: 1000, stone: 500, iron: 250 };
  const sum = (r: Resources) => r.wood + r.stone + r.iron;

  it('leva tudo o que cabe quando a capacidade sobra', () => {
    assert.deepEqual(plunder(stock, 0, 10_000), stock);
  });

  it('respeita a capacidade e divide proporcionalmente', () => {
    const loot = plunder(stock, 0, 700);
    assert.equal(sum(loot), 700);
    assert.ok(loot.wood > loot.stone && loot.stone > loot.iron);
  });

  it('o esconderijo protege a quantidade indicada de cada recurso', () => {
    const loot = plunder(stock, 300, 10_000);
    assert.deepEqual(loot, { wood: 700, stone: 200, iron: 0 });
  });

  it('nada para saquear devolve zeros', () => {
    assert.deepEqual(plunder({ wood: 0, stone: 0, iron: 0 }, 0, 500), {
      wood: 0,
      stone: 0,
      iron: 0,
    });
  });

  it('nunca leva mais do que existe nem mais do que a capacidade (200 casos)', () => {
    const random = seeded(7);
    for (let i = 0; i < 200; i++) {
      const resources = {
        wood: Math.floor(random() * 5000),
        stone: Math.floor(random() * 5000),
        iron: Math.floor(random() * 5000),
      };
      const hidden = Math.floor(random() * 800);
      const capacity = Math.floor(random() * 6000);
      const loot = plunder(resources, hidden, capacity);
      const available = (n: number) => Math.max(0, n - hidden);
      assert.ok(loot.wood <= available(resources.wood));
      assert.ok(loot.stone <= available(resources.stone));
      assert.ok(loot.iron <= available(resources.iron));
      assert.equal(
        sum(loot),
        Math.min(
          capacity,
          available(resources.wood) + available(resources.stone) + available(resources.iron),
        ),
      );
    }
  });
});

describe('distribuição de perdas de apoio', () => {
  const rows = [
    { id: 1, quantity: 30 },
    { id: 2, quantity: 30 },
    { id: 3, quantity: 40 },
  ];

  it('a soma das perdas é exatamente a perda total', () => {
    for (const loss of [0, 1, 7, 50, 99, 100]) {
      assert.equal(
        distributeLosses(loss, rows).reduce((n, row) => n + row.lost, 0),
        loss,
      );
    }
  });

  it('ninguém perde mais do que tem', () => {
    for (const row of distributeLosses(100, rows)) assert.ok(row.lost <= row.quantity);
  });

  it('o desempate é estável: o resto vai para a maior fração e depois para o menor id', () => {
    const result = distributeLosses(1, [
      { id: 2, quantity: 10 },
      { id: 1, quantity: 10 },
    ]);
    assert.deepEqual(
      result.map((row) => [row.id, row.lost]),
      [
        [2, 0],
        [1, 1],
      ],
    );
  });

  it('sem contingentes não há o que distribuir', () => {
    assert.deepEqual(distributeLosses(5, []), []);
  });
});
