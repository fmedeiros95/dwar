import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildingCodes,
  canManageMember,
  chooseBarbarianUpgrade,
  founderRights,
  initialPlacement,
  messageColor,
  messageHttpUrl,
  messageSize,
  militaryRank,
  noRights,
  normalizeRights,
  placeVillage,
  quadrantOf,
  quadrants,
  villagePoints,
  type BuildingLevels,
} from '../src/index.js';
import { seeded } from './helpers.js';

const zeroLevels = () =>
  Object.fromEntries(buildingCodes.map((code) => [code, 0])) as BuildingLevels;

describe('patente militar', () => {
  it('0 pontos é a primeira patente', () => {
    assert.deepEqual(militaryRank(0), { tier: 0, title: 'TRAINEE' });
  });

  it('a fronteira de cada faixa é inclusiva', () => {
    assert.equal(militaryRank(549).tier, 0);
    assert.equal(militaryRank(550).tier, 1);
    assert.equal(militaryRank(1199).tier, 1);
    assert.equal(militaryRank(1200).tier, 2);
  });

  it('é monotônica e a última faixa não tem teto', () => {
    let previous = 0;
    for (let points = 0; points <= 9_000_000; points += 12_345) {
      const { tier } = militaryRank(points);
      assert.ok(tier >= previous);
      previous = tier;
    }
    assert.equal(militaryRank(8_000_000).title, 'GENERAL OF THE ARMY (GOA)');
    assert.equal(militaryRank(999_999_999).tier, militaryRank(8_000_000).tier);
  });
});

describe('permissões da tribo', () => {
  it('fundador inclui líder, e líder inclui todas as outras', () => {
    const rights = normalizeRights({ isFounder: true });
    assert.ok(Object.values(rights).every(Boolean));
    const leader = normalizeRights({ canLead: true });
    assert.equal(leader.isFounder, false);
    assert.ok(leader.canInvite && leader.canDiplomacy && leader.canMassMail);
    assert.ok(leader.canModerate && leader.canHiddenForum);
  });

  it('permissões isoladas não promovem ninguém', () => {
    const rights = normalizeRights({ canInvite: true });
    assert.equal(rights.canInvite, true);
    assert.equal(rights.canLead, false);
    assert.equal(rights.canMassMail, false);
  });

  it('sem nada informado ninguém tem permissão', () => {
    assert.ok(Object.values(noRights).every((value) => value === false));
    assert.ok(Object.values(founderRights).every((value) => value === true));
  });

  it('só líderes mexem em cargos e só fundadores mexem em fundadores', () => {
    const leader = normalizeRights({ canLead: true });
    assert.equal(canManageMember(noRights, noRights), false);
    assert.equal(canManageMember(leader, noRights), true);
    assert.equal(canManageMember(leader, founderRights), false);
    assert.equal(canManageMember(founderRights, founderRights), true);
  });
});

describe('formatação de mensagens', () => {
  it('só aceita http e https nos links', () => {
    assert.equal(messageHttpUrl('javascript:alert(1)'), null);
    assert.equal(messageHttpUrl('data:text/html,x'), null);
    assert.equal(messageHttpUrl('ftp://exemplo.com'), null);
    assert.equal(messageHttpUrl('https://exemplo.com/a'), 'https://exemplo.com/a');
    assert.equal(messageHttpUrl('exemplo.com'), 'https://exemplo.com/');
  });

  it('cores: nomes conhecidos e hexadecimais; o resto é ignorado', () => {
    assert.equal(messageColor('RED'), 'red');
    assert.equal(messageColor('#FfF'), '#fff');
    assert.equal(messageColor('#12345'), null);
    assert.equal(messageColor('red;background:url(x)'), null);
    assert.equal(messageColor(undefined), null);
  });

  it('tamanho vai de 8 a 24', () => {
    assert.equal(messageSize('7'), null);
    assert.equal(messageSize('8'), 8);
    assert.equal(messageSize('24'), 24);
    assert.equal(messageSize('25'), null);
    assert.equal(messageSize('abc'), null);
  });
});

describe('posicionamento de aldeias', () => {
  it('quadrantOf: os eixos pertencem ao norte e ao leste', () => {
    assert.equal(quadrantOf({ x: 500, y: 500 }), 'ne');
    assert.equal(quadrantOf({ x: 499, y: 500 }), 'nw');
    assert.equal(quadrantOf({ x: 500, y: 499 }), 'se');
    assert.equal(quadrantOf({ x: 499, y: 499 }), 'sw');
  });

  it('jogadores ficam sempre no quadrante menos povoado e nunca repetem ponto', () => {
    const random = seeded(99);
    const randomInteger = (min: number, max: number) =>
      min + Math.floor(random() * (max - min + 1));
    let state = initialPlacement();
    const occupied = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const counts = quadrants.map((q) => state[q].count);
      const result = placeVillage(state, occupied, 'player', randomInteger);
      assert.equal(state[result.quadrant].count, Math.min(...counts));
      assert.equal(quadrantOf(result.point), result.quadrant);
      const key = `${result.point.x},${result.point.y}`;
      assert.ok(!occupied.has(key), `ponto repetido ${key}`);
      assert.ok(result.point.x >= 0 && result.point.x <= 999);
      assert.ok(result.point.y >= 0 && result.point.y <= 999);
      occupied.add(key);
      state = result.state;
    }
  });

  it('não altera o estado recebido', () => {
    const state = initialPlacement();
    placeVillage(state, new Set(), 'player', (min) => min);
    assert.deepEqual(state, initialPlacement());
  });
});

describe('crescimento de aldeias bárbaras', () => {
  it('com limite de pontos zero nada pode crescer', () => {
    assert.equal(
      chooseBarbarianUpgrade(zeroLevels(), 0, 0, 0, () => 0),
      null,
    );
  });

  it('nunca ultrapassa o limite de pontos nem escolhe o que os requisitos barram', () => {
    const random = seeded(5);
    let levels = { ...zeroLevels(), main: 1, farm: 1, storage: 1 };
    let points = villagePoints(levels);
    const limit = points + 400;
    for (let step = 0; step < 200; step++) {
      const upgrade = chooseBarbarianUpgrade(levels, points, 0, limit, random);
      if (!upgrade) break;
      assert.ok(points + upgrade.points <= limit);
      assert.equal(upgrade.targetLevel, levels[upgrade.code] + 1);
      levels = { ...levels, [upgrade.code]: upgrade.targetLevel };
      points += upgrade.points;
      assert.equal(points, villagePoints(levels));
    }
    assert.ok(points <= limit);
  });
});
