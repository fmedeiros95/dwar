import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, villages, constructionEvents } from '@dwar/database';
import type { BuildingCode } from '@dwar/game-config';
import { buildingCost, buildingPopulation, capacity } from '@dwar/game-core';
import type { VillageSnapshot } from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage, settleVillage, snapshot } from './village-engine.js';

export async function enqueueConstruction(
  accountId: number,
  worldId: number,
  villageId: number,
  code: BuildingCode,
  requestId: string,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const owned = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    const [existing] = await tx
      .select()
      .from(constructionEvents)
      .where(
        and(
          eq(constructionEvents.villageId, villageId),
          eq(constructionEvents.requestId, requestId),
        ),
      );
    if (existing) {
      if (existing.buildingCode !== code)
        throw new GameError('Esta solicitação já foi usada em outra construção.', 409);
      return snapshot(tx, village, world, now);
    }
    const before = await snapshot(tx, village, world, now);
    const building = before.buildings.find((item) => item.code === code);
    if (!building) throw new GameError('Edifício inválido.');
    if (!building.canBuild)
      throw new GameError(building.unavailableReason ?? 'Construção indisponível.');
    const last = before.queue.at(-1);
    const startsAt = last ? new Date(last.endsAt) : now;
    const endsAt = new Date(startsAt.getTime() + building.durationSeconds * 1000);
    await tx.insert(constructionEvents).values({
      worldId,
      villageId,
      buildingCode: code,
      targetLevel: building.queuedLevel + 1,
      startsAt,
      endsAt,
      cost: building.cost,
      population: building.population,
      requestId,
    });
    const updated = {
      ...village,
      wood: village.wood - building.cost.wood,
      stone: village.stone - building.cost.stone,
      iron: village.iron - building.cost.iron,
      populationUsed: village.populationUsed + building.population,
    };
    await tx
      .update(villages)
      .set({
        wood: updated.wood,
        stone: updated.stone,
        iron: updated.iron,
        populationUsed: updated.populationUsed,
      })
      .where(eq(villages.id, villageId));
    return snapshot(tx, updated, world, now);
  });
}

export async function cancelConstruction(
  accountId: number,
  worldId: number,
  villageId: number,
  eventId: number,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const now = new Date();
    const village = await settleVillage(
      tx,
      await ownedVillage(tx, accountId, worldId, villageId),
      world,
      now,
    );
    const [event] = await tx
      .select()
      .from(constructionEvents)
      .where(
        and(
          eq(constructionEvents.id, eventId),
          eq(constructionEvents.villageId, villageId),
          eq(constructionEvents.worldId, worldId),
        ),
      );
    if (!event) throw new GameError('Construção não encontrada.', 404);
    if (event.cancelledAt) return snapshot(tx, village, world, now);
    if (event.completedAt) throw new GameError('Esta construção já foi concluída.', 409);
    const queue = await tx
      .select()
      .from(constructionEvents)
      .where(
        and(
          eq(constructionEvents.villageId, villageId),
          isNull(constructionEvents.completedAt),
          isNull(constructionEvents.cancelledAt),
        ),
      )
      .orderBy(asc(constructionEvents.endsAt), asc(constructionEvents.id));
    // The legacy refunds the highest reserved level of the same building. Removing
    // an earlier entry shifts subsequent levels down without changing paid durations.
    const lastOfType = queue.filter((item) => item.buildingCode === event.buildingCode).at(-1)!;
    const refund = lastOfType.cost;
    const updated = {
      ...village,
      wood: Math.min(capacity(village.buildings), village.wood + refund.wood),
      stone: Math.min(capacity(village.buildings), village.stone + refund.stone),
      iron: Math.min(capacity(village.buildings), village.iron + refund.iron),
      populationUsed: village.populationUsed - lastOfType.population,
    };
    await tx
      .update(constructionEvents)
      .set({ cancelledAt: now })
      .where(eq(constructionEvents.id, eventId));
    let cursor = now;
    const levels = { ...village.buildings };
    const remaining = queue.filter((item) => item.id !== eventId);
    for (const [index, item] of remaining.entries()) {
      const code = item.buildingCode as BuildingCode;
      const targetLevel = ++levels[code];
      // Keep the currently active entry's elapsed work. All waiting entries stay
      // sequential, correcting the legacy overlap when cancelling a waiting entry.
      const startsAt = index === 0 && item.startsAt < now ? item.startsAt : cursor;
      const endsAt = new Date(startsAt.getTime() + item.endsAt.getTime() - item.startsAt.getTime());
      await tx
        .update(constructionEvents)
        .set({
          startsAt,
          endsAt,
          targetLevel,
          cost: buildingCost(code, targetLevel - 1),
          population: buildingPopulation(code, targetLevel),
        })
        .where(eq(constructionEvents.id, item.id));
      cursor = endsAt;
    }
    await tx
      .update(villages)
      .set({
        wood: updated.wood,
        stone: updated.stone,
        iron: updated.iron,
        populationUsed: updated.populationUsed,
      })
      .where(eq(villages.id, villageId));
    return snapshot(tx, updated, world, now);
  });
}
