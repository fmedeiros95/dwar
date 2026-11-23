import type { CaravanLot, CaravanResource, Resources, VillageSnapshot } from '@dwar/api-client';
import { currentResources } from '../shared/current-resources.js';
import { numbers } from '../shared/index.js';

export const resourceCodes: CaravanResource[] = ['wood', 'stone', 'iron'];
export const resourceName = { wood: 'madeira', stone: 'argila', iron: 'ferro' } as const;
export const lotName = { sun: 'carroça do Sol', moon: 'carroça da Lua' } as const;
export const otherLot = (lot: CaravanLot): CaravanLot => (lot === 'sun' ? 'moon' : 'sun');
export const lotTotal = (lot: Resources) => lot.wood + lot.stone + lot.iron;

/** Espelho de caravanSplit (game-core) para a prévia enquanto se divide; o servidor refaz a conta. */
export function previewSplit(cargo: Resources, sun: Resources) {
  const lots = {
    sun: { wood: 0, stone: 0, iron: 0 },
    moon: { wood: 0, stone: 0, iron: 0 },
  } as Record<CaravanLot, Resources>;
  const toll = { wood: 0, stone: 0, iron: 0 } as Resources;
  for (const code of resourceCodes) {
    const a = sun[code];
    const b = cargo[code] - a;
    toll[code] = Math.floor((Math.min(a, b) * 25) / 100);
    lots.sun[code] = a < b ? a - toll[code] : a;
    lots.moon[code] = a < b ? b : b - toll[code];
  }
  return { lots, toll };
}

export function describeLoad(load: Resources): string {
  const parts = resourceCodes
    .filter((code) => load[code] > 0)
    .map((code) => `${numbers.format(load[code])} de ${resourceName[code]}`);
  return parts.length > 1
    ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}`
    : (parts[0] ?? 'nada');
}

export const leadPercent = 60;
/** Espelho de caravanSplitError: as duas carroças precisam ser a melhor em alguma coisa. */
export function splitHasChoice(cargo: Resources, sun: Resources) {
  const leads = (part: (code: CaravanResource) => number) =>
    resourceCodes.some((code) => part(code) * 100 >= cargo[code] * leadPercent);
  return leads((code) => sun[code]) && leads((code) => cargo[code] - sun[code]);
}

export type LotUse = {
  key: string;
  tone: 'yes' | 'near' | 'wait';
  text: string;
  /** O que falta nesta carroça para a obra caber: a mesa sabe mirar nisso. */
  missing?: { code: CaravanResource; amount: number }[];
};

/** Menor mudança na divisão que põe na carroça o que falta, já contado o pedágio; null se não dá. */
export function aimSplit(
  cargo: Resources,
  sun: Resources,
  lot: CaravanLot,
  missing: { code: CaravanResource; amount: number }[],
): Resources | null {
  const next = { ...sun };
  for (const { code, amount } of missing) {
    const goal = previewSplit(cargo, sun).lots[lot][code] + amount;
    let found = false;
    for (let part = 0; part <= cargo[code]; part++) {
      const value = lot === 'sun' ? part : cargo[code] - part;
      if (previewSplit(cargo, { ...next, [code]: value }).lots[lot][code] >= goal) {
        next[code] = value;
        found = true;
        break;
      }
    }
    if (!found) return null;
  }
  return next;
}

/**
 * O que a carroça permite fazer na sua aldeia: só com o seu estado, nunca o do rival. Conta o que
 * está no armazém agora e o que couber nele.
 */
export function usesOf(snapshot: VillageSnapshot, load: Resources, clock: number): LotUse[] {
  const have = currentResources(snapshot, clock);
  const cap = snapshot.village.capacity;
  const stock = Object.fromEntries(
    resourceCodes.map((code) => [code, Math.min(cap, have[code] + load[code])]),
  ) as Resources;
  const pays = (cost: Resources, bank: Resources) =>
    resourceCodes.every((code) => bank[code] >= cost[code]);
  const uses: LotUse[] = [];
  // Obras que hoje só esperam recursos e passam a caber: as maiores primeiro, e juntas se der.
  const queueFull = snapshot.queue.length >= snapshot.world.maxBuildQueue;
  const pending = snapshot.buildings.filter(
    (item) =>
      item.queuedLevel < item.maxLevel &&
      !item.canBuild &&
      item.requirements.every((need) => need.met) &&
      (item.unavailableReason === 'Recursos insuficientes.' || queueFull) &&
      !pays(item.cost, have),
  );
  const unlocked = pending
    .filter((item) => pays(item.cost, stock))
    .sort((a, b) => lotTotal(b.cost) - lotTotal(a.cost));
  let bank = { ...stock };
  let taken = 0;
  for (const item of unlocked) {
    if (taken >= 3) break;
    const together = pays(item.cost, bank);
    const label = `${item.name} ${item.queuedLevel + 1}`;
    uses.push({
      key: item.code,
      tone: 'yes',
      text:
        taken === 0
          ? `Você já consegue evoluir: ${label}`
          : together
            ? `e ainda ${label}`
            : `ou, no lugar, ${label}`,
    });
    if (together)
      bank = {
        wood: bank.wood - item.cost.wood,
        stone: bank.stone - item.cost.stone,
        iron: bank.iron - item.cost.iron,
      };
    taken += 1;
  }
  // A obra que fica mais perto, com o que ainda falta.
  const near = pending
    .filter((item) => !pays(item.cost, stock) && resourceCodes.every((c) => item.cost[c] <= cap))
    .map((item) => {
      const missing = resourceCodes
        .filter((code) => item.cost[code] > stock[code])
        .map((code) => ({ code, amount: item.cost[code] - stock[code] }));
      return {
        item,
        missing,
        left:
          missing.reduce((sum, part) => sum + part.amount, 0) / Math.max(1, lotTotal(item.cost)),
        helps: resourceCodes.some((code) => load[code] > 0 && item.cost[code] > have[code]),
      };
    })
    .filter((entry) => entry.helps)
    .sort((a, b) => a.left - b.left)[0];
  if (near && uses.length < 3)
    uses.push({
      key: `near-${near.item.code}`,
      tone: 'near',
      missing: near.missing,
      text: `Para ${near.item.name} ${near.item.queuedLevel + 1} faltariam ${near.missing
        .map((part) => `${numbers.format(part.amount)} de ${resourceName[part.code]}`)
        .join(' e ')}`,
    });
  // Tropas: a unidade pesquisada que mais ganha com esta carroça.
  const recruits = snapshot.units
    .filter((unit) => unit.researched && unit.code !== 'noble')
    .map((unit) => {
      const count = (b: Resources) =>
        Math.min(
          ...resourceCodes.map((c) => (unit.cost[c] ? Math.floor(b[c] / unit.cost[c]) : 1e9)),
        );
      return { unit, more: count(stock) - count(have) };
    })
    .filter((entry) => entry.more >= 5)
    .sort((a, b) => b.more * lotTotal(b.unit.cost) - a.more * lotTotal(a.unit.cost))[0];
  if (recruits && uses.length < 4)
    uses.push({
      key: 'troops',
      tone: 'yes',
      text: `${uses.length ? 'Ou recruta' : 'Recruta'} mais ${numbers.format(recruits.more)} ${recruits.unit.name}`,
    });
  const over = resourceCodes.filter((code) => have[code] + load[code] > cap);
  if (over.length)
    uses.push({
      key: 'over',
      tone: 'wait',
      text: `${over
        .map((code) => `${numbers.format(have[code] + load[code] - cap)} de ${resourceName[code]}`)
        .join(' e ')} não cabem hoje e esperam na carroça`,
    });
  if (!uses.length)
    uses.push({ key: 'none', tone: 'wait', text: 'Nada novo hoje; fica de reserva' });
  return uses;
}
