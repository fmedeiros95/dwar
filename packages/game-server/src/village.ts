import { randomInt } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db, players, villages, activity } from '@dwar/database';
import { initialBuildings, initialResources, combatRules } from '@dwar/game-config';
import { initialPoints, initialPopulation, startingCoordinates } from '@dwar/game-core';
import type { VillageSnapshot } from '@dwar/api-client';
import { GameError } from './errors.js';
import { createBarbarian } from './barbarians.js';
import { lockWorld, ownedVillage, settleVillage, snapshot } from './village-engine.js';

export async function createVillage(
  accountId: number,
  username: string,
  worldId: number,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const [player] = await tx
      .select()
      .from(players)
      .where(and(eq(players.accountId, accountId), eq(players.worldId, worldId)));
    if (!player) throw new GameError('Entre no mundo antes de construir sua aldeia.', 403);
    const now = new Date();
    const [existing] = await tx
      .select()
      .from(villages)
      .where(and(eq(villages.playerId, player.id), eq(villages.worldId, worldId)))
      .orderBy(asc(villages.id))
      .limit(1);
    if (existing) return snapshot(tx, await settleVillage(tx, existing, world, now), world, now);
    const occupied = await tx
      .select({ x: villages.x, y: villages.y })
      .from(villages)
      .where(eq(villages.worldId, worldId));
    const { x, y } = startingCoordinates(occupied, (minimum, maximum) =>
      randomInt(minimum, maximum + 1),
    );
    const [village] = await tx
      .insert(villages)
      .values({
        worldId,
        playerId: player.id,
        name: `Aldeia de ${username}`,
        x,
        y,
        ...initialResources,
        buildings: { ...initialBuildings },
        points: initialPoints(initialBuildings),
        populationUsed: initialPopulation(initialBuildings),
        updatedAt: now,
      })
      .returning();
    if (!village) throw new GameError('Não foi possível fundar a aldeia.', 500);
    await tx.insert(activity).values({
      worldId,
      villageId: village.id,
      message: 'Sua aldeia foi fundada. Um novo domínio começa aqui.',
      occurredAt: now,
    });
    await createBarbarian(tx, worldId, now);
    await tx
      .update(players)
      .set({
        protectionUntil: new Date(
          now.getTime() +
            (player.lastConqueredAt
              ? combatRules.refoundationProtectionMinutes
              : combatRules.protectionMinutes) *
              60000,
        ),
      })
      .where(eq(players.id, player.id));
    return snapshot(tx, village, world, now);
  });
}

export async function readVillage(
  accountId: number,
  worldId: number,
  villageId?: number,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    return snapshot(tx, await settleVillage(tx, village, world, now), world, now);
  });
}

export async function renameVillage(
  accountId: number,
  worldId: number,
  villageId: number,
  name: string,
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
    await tx.update(villages).set({ name }).where(eq(villages.id, villageId));
    return snapshot(tx, { ...village, name }, world, now);
  });
}
