import { randomInt } from 'node:crypto';
import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import {
  accounts,
  players,
  villages,
  worlds,
  troopMovements,
  unitPlacements,
  constructionEvents,
  marketOffers,
  battleReports,
  battleReportRecipients,
  activity,
  type Transaction,
} from '@dwar/database';
import {
  units,
  unitCodes,
  combatRules,
  catapultTargets,
  hideCapacity,
  type Troops,
  type BuildingCode,
  type BattleSide,
  type BattleRecord,
} from '@dwar/game-config';
import {
  battle,
  morale,
  loyaltyAt,
  plunder,
  distributeLosses,
  emptyTroops,
  resourceCodes,
  capacity,
  villagePoints,
  buildingPopulation,
} from '@dwar/game-core';
import { GameError } from './errors.js';
export type Village = typeof villages.$inferSelect;
export type World = typeof worlds.$inferSelect;
export type Movement = typeof troopMovements.$inferSelect;
export type SettleVillage = (
  tx: Transaction,
  village: Village,
  world: World,
  now: Date,
) => Promise<Village>;
/**
 * Situação de um alvo para quem ataca de `from`: moral, proteção de iniciante e a proporção de
 * pontos. Não lança erro, serve tanto à validação do ataque quanto ao popup do mapa.
 */
export async function assessTarget(tx: Transaction, from: Village, to: Village, now: Date) {
  if (to.playerId === null)
    return { morale: 100, protectedUntil: null as Date | null, pointRatioBlocked: false };
  const [defender] = await tx.select().from(players).where(eq(players.id, to.playerId));
  const totals = await tx
    .select({ playerId: villages.playerId, points: sql<number>`sum(${villages.points})::integer` })
    .from(villages)
    .where(eq(villages.worldId, from.worldId))
    .groupBy(villages.playerId);
  const att = totals.find((row) => row.playerId === from.playerId)?.points ?? 0,
    def = totals.find((row) => row.playerId === to.playerId)?.points ?? 0;
  return {
    morale: morale(att, def),
    protectedUntil: defender!.protectionUntil > now ? defender!.protectionUntil : null,
    pointRatioBlocked: att / combatRules.maxPointRatio > def,
  };
}
export async function attackConditions(tx: Transaction, from: Village, to: Village, now: Date) {
  if (from.playerId === null || from.playerId === to.playerId)
    throw new GameError('Não é possível atacar suas próprias aldeias.');
  const target = await assessTarget(tx, from, to, now);
  if (target.protectedUntil)
    throw new GameError(
      `Este jogador está sob proteção de iniciantes até ${target.protectedUntil.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`,
    );
  if (target.pointRatioBlocked)
    throw new GameError(
      `A proporção máxima entre atacante e defensor é ${combatRules.maxPointRatio}:1.`,
    );
  return { morale: target.morale };
}
export function checkedTarget(troops: Troops, code?: string) {
  if (troops.catapult > 0 && !catapultTargets.includes(code as BuildingCode))
    throw new GameError('Escolha um edifício válido para as catapultas.');
  return troops.catapult > 0 ? (code as BuildingCode) : null;
}
export async function releasePopulation(tx: Transaction, villageId: number, quantity: number) {
  if (!quantity) return;
  await tx
    .update(villages)
    .set({ populationUsed: sql`${villages.populationUsed}-${quantity}` })
    .where(eq(villages.id, villageId));
}
export function troopPopulation(troops: Troops) {
  return unitCodes.reduce((n, c) => n + troops[c] * units[c].population, 0);
}
export async function placeTroops(
  tx: Transaction,
  worldId: number,
  origin: number,
  location: number,
  troops: Troops,
) {
  for (const c of unitCodes)
    if (troops[c] > 0)
      await tx
        .insert(unitPlacements)
        .values({
          worldId,
          originVillageId: origin,
          locationVillageId: location,
          unitCode: c,
          quantity: troops[c],
        })
        .onConflictDoUpdate({
          target: [
            unitPlacements.originVillageId,
            unitPlacements.locationVillageId,
            unitPlacements.unitCode,
          ],
          set: { quantity: sql`${unitPlacements.quantity}+${troops[c]}` },
        });
}
async function side(
  tx: Transaction,
  village: Village,
  owner: number | null = village.playerId,
): Promise<BattleSide> {
  const [row] =
    owner === null
      ? []
      : await tx
          .select({ username: accounts.username })
          .from(players)
          .innerJoin(accounts, eq(players.accountId, accounts.id))
          .where(eq(players.id, owner));
  return {
    villageId: village.id,
    playerId: owner,
    name: village.name,
    username: row?.username ?? 'Aldeia abandonada',
    x: village.x,
    y: village.y,
  };
}
async function applyDamage(
  tx: Transaction,
  target: Village,
  code: BuildingCode,
  level: number,
  at: Date,
) {
  if (level === target.buildings[code]) return target;
  let population = target.populationUsed;
  for (let old = target.buildings[code]; old > level; old--)
    population -= buildingPopulation(code, old);
  const queued = await tx
    .select()
    .from(constructionEvents)
    .where(
      and(
        eq(constructionEvents.villageId, target.id),
        eq(constructionEvents.buildingCode, code),
        isNull(constructionEvents.completedAt),
        isNull(constructionEvents.cancelledAt),
      ),
    )
    .orderBy(asc(constructionEvents.startsAt), asc(constructionEvents.id));
  let next = level;
  for (const event of queued) {
    next++;
    const reserved = buildingPopulation(code, next);
    population += reserved - event.population;
    await tx
      .update(constructionEvents)
      .set({ targetLevel: next, population: reserved })
      .where(eq(constructionEvents.id, event.id));
  }
  const updated = {
    ...target,
    buildings: { ...target.buildings, [code]: level },
    points: villagePoints({ ...target.buildings, [code]: level }),
    populationUsed: population,
    updatedAt: at,
  };
  await tx
    .update(villages)
    .set({ buildings: updated.buildings, points: updated.points, populationUsed: population })
    .where(eq(villages.id, target.id));
  return updated;
}
async function conquer(
  tx: Transaction,
  world: World,
  movement: Movement,
  target: Village,
  now: Date,
) {
  const owned = await tx
    .select()
    .from(unitPlacements)
    .where(eq(unitPlacements.originVillageId, target.id));
  let freed = owned.reduce(
    (sum, row) => sum + row.quantity * units[row.unitCode as keyof Troops].population,
    0,
  );
  const travelling = await tx
    .select()
    .from(troopMovements)
    .where(
      and(
        eq(troopMovements.originVillageId, target.id),
        isNull(troopMovements.arrivedAt),
        eq(troopMovements.originLost, false),
      ),
    );
  for (const old of travelling) {
    freed += troopPopulation(old.troops);
    await tx
      .update(troopMovements)
      .set({ originLost: true, ...(old.kind === 'attack' ? {} : { arrivedAt: now }) })
      .where(eq(troopMovements.id, old.id));
  }
  await tx.delete(unitPlacements).where(eq(unitPlacements.originVillageId, target.id));
  await releasePopulation(tx, target.id, freed);
  await releasePopulation(tx, movement.originVillageId, units.noble.population);
  await tx
    .update(villages)
    .set({
      playerId: movement.ownerPlayerId,
      loyalty: combatRules.conqueredLoyalty,
      loyaltyUpdatedAt: now,
    })
    .where(eq(villages.id, target.id));
  if (target.playerId !== null) {
    const remaining = await tx
      .select({ id: villages.id })
      .from(villages)
      .where(eq(villages.playerId, target.playerId))
      .limit(1);
    if (!remaining.length)
      await tx.update(players).set({ lastConqueredAt: now }).where(eq(players.id, target.playerId));
  }
  await tx.insert(activity).values({
    worldId: world.id,
    villageId: target.id,
    message: 'A aldeia foi conquistada.',
    occurredAt: now,
  });
}
export async function resolveAttack(
  tx: Transaction,
  world: World,
  movement: Movement,
  settle: SettleVillage,
) {
  const at = movement.endsAt;
  const [rawFrom] = await tx
    .select()
    .from(villages)
    .where(eq(villages.id, movement.originVillageId));
  const [rawTarget] = await tx.select().from(villages).where(eq(villages.id, movement.toVillageId));
  const from = await settle(tx, rawFrom!, world, at);
  let target = await settle(tx, rawTarget!, world, at);
  // A target conquered by the sender during the march receives the command as support.
  if (target.playerId === movement.ownerPlayerId && !movement.originLost) {
    await placeTroops(tx, world.id, from.id, target.id, movement.troops);
    await tx
      .update(troopMovements)
      .set({ arrivedAt: at })
      .where(eq(troopMovements.id, movement.id));
    return;
  }
  const sides = await Promise.all([side(tx, from, movement.ownerPlayerId), side(tx, target)]);
  const totals = await tx
    .select({ id: villages.playerId, points: sql<number>`sum(${villages.points})::integer` })
    .from(villages)
    .where(eq(villages.worldId, world.id))
    .groupBy(villages.playerId);
  const moral =
    target.playerId === null
      ? 100
      : morale(
          totals.find((row) => row.id === movement.ownerPlayerId)?.points ?? 0,
          totals.find((row) => row.id === target.playerId)?.points ?? 0,
        );
  const placements = await tx
    .select()
    .from(unitPlacements)
    .where(eq(unitPlacements.locationVillageId, target.id))
    .orderBy(asc(unitPlacements.originVillageId));
  const defenders = emptyTroops();
  for (const row of placements) defenders[row.unitCode as keyof Troops] += row.quantity;
  const luck = randomInt(-25, 26),
    beforeBuildings = { ...target.buildings };
  const outcome = battle(
    movement.troops,
    defenders,
    target.buildings.wall,
    movement.targetBuilding
      ? { code: movement.targetBuilding, level: target.buildings[movement.targetBuilding] }
      : null,
    luck,
    moral,
  );
  const support = new Map<number, { troops: Troops; losses: Troops }>();
  for (const c of unitCodes) {
    const rows = placements.filter((row) => row.unitCode === c);
    const losses = distributeLosses(
      outcome.defenderLosses[c],
      rows.map((row) => ({ id: row.originVillageId, quantity: row.quantity })),
    );
    for (const row of losses) {
      if (row.lost) {
        await tx
          .update(unitPlacements)
          .set({ quantity: row.quantity - row.lost })
          .where(
            and(
              eq(unitPlacements.originVillageId, row.id),
              eq(unitPlacements.locationVillageId, target.id),
              eq(unitPlacements.unitCode, c),
            ),
          );
        await releasePopulation(tx, row.id, row.lost * units[c].population);
      }
      if (row.id !== target.id && row.quantity > 0) {
        const record = support.get(row.id) ?? { troops: emptyTroops(), losses: emptyTroops() };
        record.troops[c] = row.quantity;
        record.losses[c] = row.lost;
        support.set(row.id, record);
      }
    }
  }
  if (!movement.originLost)
    await releasePopulation(tx, from.id, troopPopulation(outcome.attackerLosses));
  // Population changes from combat must be reloaded before changing buildings.
  const [afterLosses] = await tx.select().from(villages).where(eq(villages.id, target.id));
  target = afterLosses!;
  target = await applyDamage(tx, target!, 'wall', outcome.wallAfter, at);
  if (outcome.demolition && outcome.demolition.code !== 'wall')
    target = await applyDamage(tx, target, outcome.demolition.code, outcome.demolition.after, at);
  const max = capacity(target.buildings);
  const available = {
    wood: Math.min(max, target.wood),
    stone: Math.min(max, target.stone),
    iron: Math.min(max, target.iron),
  };
  const loot = plunder(available, hideCapacity[target.buildings.hide] ?? 0, outcome.lootCapacity);
  const resources = {
    wood: available.wood - loot.wood,
    stone: available.stone - loot.stone,
    iron: available.iron - loot.iron,
  };
  let remaining = outcome.lootCapacity - resourceCodes.reduce((sum, c) => sum + loot[c], 0);
  if (remaining > 0) {
    const offers = await tx
      .select()
      .from(marketOffers)
      .where(
        and(
          eq(marketOffers.villageId, target.id),
          isNull(marketOffers.acceptedAt),
          isNull(marketOffers.cancelledAt),
        ),
      )
      .orderBy(asc(marketOffers.createdAt), asc(marketOffers.id));
    for (const offer of offers) {
      if (remaining <= 0) break;
      const c = offer.sellResource as keyof typeof loot,
        taken = Math.min(remaining, offer.sellAmount);
      loot[c] += taken;
      remaining -= taken;
      resources[c] = Math.min(max, resources[c] + offer.sellAmount - taken);
      await tx.update(marketOffers).set({ cancelledAt: at }).where(eq(marketOffers.id, offer.id));
    }
  }
  const loyalty =
    outcome.survivors.noble > 0 && !movement.originLost && outcome.winner === 'attacker'
      ? {
          before: loyaltyAt(target.loyalty, target.loyaltyUpdatedAt, at, world.buildSpeed),
          after: 0,
          conquered: false,
        }
      : null;
  if (loyalty) {
    loyalty.after =
      loyalty.before - randomInt(combatRules.loyaltyMinimum, combatRules.loyaltyMaximum + 1);
    loyalty.conquered = loyalty.after <= 0;
    await tx
      .update(villages)
      .set({ loyalty: Math.max(0, loyalty.after), loyaltyUpdatedAt: at })
      .where(eq(villages.id, target.id));
  }
  const spyPercentage =
    movement.troops.spy > 0 ? Math.ceil((outcome.survivors.spy * 100) / movement.troops.spy) : 0;
  const intel: BattleRecord['intel'] = spyPercentage > 0 ? {} : null;
  if (intel && spyPercentage >= 50) intel.resources = { ...resources };
  if (intel && spyPercentage >= 70) intel.buildings = { ...target.buildings };
  if (intel && spyPercentage >= 90) {
    const outside = await tx
      .select()
      .from(unitPlacements)
      .where(
        and(
          eq(unitPlacements.originVillageId, target.id),
          ne(unitPlacements.locationVillageId, target.id),
        ),
      );
    intel.outsideTroops = emptyTroops();
    for (const row of outside) intel.outsideTroops[row.unitCode as keyof Troops] += row.quantity;
    const marching = await tx
      .select({ troops: troopMovements.troops })
      .from(troopMovements)
      .where(
        and(
          eq(troopMovements.originVillageId, target.id),
          isNull(troopMovements.arrivedAt),
          eq(troopMovements.originLost, false),
        ),
      );
    for (const row of marching)
      for (const code of unitCodes) intel.outsideTroops[code] += row.troops[code];
  }
  await tx
    .update(villages)
    .set({ ...resources, updatedAt: at })
    .where(eq(villages.id, target.id));
  if (loyalty?.conquered) {
    await conquer(tx, world, movement, target, at);
    outcome.survivors.noble--;
    await placeTroops(tx, world.id, from.id, target.id, outcome.survivors);
    // No return on conquest: keep the expedition's cargo in the conquered village.
    await tx
      .update(villages)
      .set(Object.fromEntries(resourceCodes.map((c) => [c, Math.min(max, resources[c] + loot[c])])))
      .where(eq(villages.id, target.id));
  } else if (!movement.originLost && unitCodes.some((c) => outcome.survivors[c] > 0)) {
    await tx.insert(troopMovements).values({
      worldId: world.id,
      originVillageId: from.id,
      fromVillageId: target.id,
      toVillageId: from.id,
      ownerPlayerId: movement.ownerPlayerId,
      kind: 'return',
      troops: outcome.survivors,
      loot,
      startsAt: at,
      endsAt: new Date(at.getTime() + movement.endsAt.getTime() - movement.startsAt.getTime()),
    });
  }
  const result: BattleRecord = {
    from: sides[0]!,
    to: sides[1]!,
    winner: outcome.winner,
    attacker: movement.troops,
    attackerLosses: outcome.attackerLosses,
    defender: defenders,
    defenderLosses: outcome.defenderLosses,
    showDefense: outcome.showDefense,
    luck,
    morale: moral,
    loot,
    lootCapacity: outcome.lootCapacity,
    wall: { before: beforeBuildings.wall, after: outcome.wallAfter },
    demolition: outcome.demolition,
    loyalty,
    intel,
  };
  const [report] = await tx
    .insert(battleReports)
    .values({
      worldId: world.id,
      movementId: movement.id,
      fromVillageId: from.id,
      toVillageId: target.id,
      occurredAt: at,
      result,
    })
    .returning();
  const recipients = new Map<
    number,
    { role: 'attacker' | 'defender' | 'support'; supportTroops?: Troops; supportLosses?: Troops }
  >();
  for (const [origin, record] of support) {
    const [home] = await tx
      .select({ playerId: villages.playerId })
      .from(villages)
      .where(eq(villages.id, origin));
    if (home?.playerId) {
      const existing = recipients.get(home.playerId) ?? {
        role: 'support' as const,
        supportTroops: emptyTroops(),
        supportLosses: emptyTroops(),
      };
      for (const c of unitCodes) {
        existing.supportTroops![c] += record.troops[c];
        existing.supportLosses![c] += record.losses[c];
      }
      recipients.set(home.playerId, existing);
    }
  }
  recipients.set(movement.ownerPlayerId, { role: 'attacker' });
  if (result.to.playerId !== null) recipients.set(result.to.playerId, { role: 'defender' });
  for (const [playerId, access] of recipients)
    await tx
      .insert(battleReportRecipients)
      .values({ worldId: world.id, reportId: report!.id, playerId, ...access });
  await tx.update(troopMovements).set({ arrivedAt: at }).where(eq(troopMovements.id, movement.id));
  await tx.insert(activity).values([
    {
      worldId: world.id,
      villageId: from.id,
      message: `O ataque a ${target.name} foi concluído.`,
      occurredAt: at,
    },
    {
      worldId: world.id,
      villageId: target.id,
      message: 'A aldeia foi atacada. Consulte o relatório de combate.',
      occurredAt: at,
    },
  ]);
}
