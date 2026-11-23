import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  caravanAbsentChoice,
  caravanCargo,
  caravanDefault,
  caravanSplit,
  caravanSplitError,
  caravanUnload,
  lotTotal,
} from '../src/caravan.js';

const cargo = { wood: 1000, stone: 600, iron: 400 };

test('recurso inteiro numa carroça não paga pedágio', () => {
  const lots = caravanSplit(cargo, { wood: 1000, stone: 0, iron: 0 });
  assert.deepEqual(lots.sun, { wood: 1000, stone: 0, iron: 0 });
  assert.deepEqual(lots.moon, { wood: 0, stone: 600, iron: 400 });
});

test('a parte menor de cada recurso aberto paga um quarto', () => {
  const lots = caravanSplit(cargo, { wood: 800, stone: 100, iron: 200 });
  assert.deepEqual(lots.sun, { wood: 800, stone: 75, iron: 200 });
  assert.deepEqual(lots.moon, { wood: 150, stone: 500, iron: 150 });
});

test('nenhuma divisão cria recurso, e a do caravaneiro é válida e sem pedágio', () => {
  for (let wood = 0; wood <= 1000; wood += 50) {
    const lots = caravanSplit(cargo, { wood, stone: 300, iron: 0 });
    assert.ok(lotTotal(lots.sun) + lotTotal(lots.moon) <= 2000);
  }
  assert.deepEqual(caravanDefault(cargo), { wood: 1000, stone: 0, iron: 0 });
  assert.equal(caravanSplitError(cargo, caravanDefault(cargo)), null);
});

test('divisão inválida é recusada', () => {
  assert.ok(caravanSplitError(cargo, { wood: 1001, stone: 0, iron: 0 }));
  assert.ok(caravanSplitError(cargo, { wood: -1, stone: 0, iron: 0 }));
  assert.ok(caravanSplitError(cargo, { wood: 0.5, stone: 0, iron: 0 }));
  assert.ok(caravanSplitError(cargo, { wood: 0, stone: 0, iron: 0 }));
  assert.ok(caravanSplitError(cargo, cargo));
  assert.ok(caravanSplitError(cargo, { wood: 1, stone: 0, iron: 0 }), 'migalha não é carroça');
  assert.ok(
    caravanSplitError(cargo, { wood: 500, stone: 300, iron: 200 }),
    'iguais não há escolha',
  );
  assert.equal(caravanSplitError(cargo, { wood: 600, stone: 300, iron: 160 }), null);
});

test('ausente leva o que a flâmula pediu; sem flâmula, a mais pesada', () => {
  const lots = caravanSplit(cargo, { wood: 1000, stone: 0, iron: 0 });
  assert.equal(caravanAbsentChoice(lots, 'iron'), 'moon');
  assert.equal(caravanAbsentChoice(lots, 'wood'), 'sun');
  assert.equal(caravanAbsentChoice({ ...lots, sun: { wood: 1, stone: 0, iron: 0 } }, null), 'moon');
});

test('a carga acompanha os armazéns e o que não cabe espera', () => {
  const small = caravanCargo(1000, 1000, () => 0.5);
  const large = caravanCargo(40000, 40000, () => 0.5);
  assert.ok(Math.abs(lotTotal(small) - 600) < 40);
  assert.ok(lotTotal(large) > lotTotal(small) * 30);
  const { unloaded, left } = caravanUnload(
    { wood: 950.4, stone: 0, iron: 2000 },
    { wood: 100, stone: 100, iron: 100 },
    1000,
  );
  assert.deepEqual(unloaded, { wood: 49, stone: 100, iron: 0 });
  assert.deepEqual(left, { wood: 51, stone: 0, iron: 100 });
});
