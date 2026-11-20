import { randomInt } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db, villages, type Transaction } from '@dwar/database';
import { initialBuildings, initialResources } from '@dwar/game-config';
import { initialPoints, initialPopulation, startingCoordinates } from '@dwar/game-core';
import { lockWorld } from './village-engine.js';

// v0.15.1 sws/lib/functions.php::create_village: count_create_left=1;
// abandoned villages use the same starting state as ordinary foundations.
export async function createBarbarian(tx: Transaction, worldId: number, now: Date) {
  const occupied = await tx
    .select({ x: villages.x, y: villages.y })
    .from(villages)
    .where(eq(villages.worldId, worldId));
  const coordinates = startingCoordinates(occupied, (min, max) => randomInt(min, max + 1));
  const [village] = await tx
    .insert(villages)
    .values({
      worldId,
      playerId: null,
      foundedAsBarbarian: true,
      name: 'Aldeia fantasma',
      ...coordinates,
      ...initialResources,
      buildings: { ...initialBuildings },
      points: initialPoints(initialBuildings),
      populationUsed: initialPopulation(initialBuildings),
      updatedAt: now,
    })
    .returning();
  return village!;
}

export async function createBarbarianVillages(
  tx: Transaction,
  worldId: number,
  now: Date,
  quantity: number,
) {
  const created = [];
  for (let i = 0; i < quantity; i++) created.push(await createBarbarian(tx, worldId, now));
  return created;
}

// Backfill existing worlds once; conquered barbarian foundations still count.
export async function fillBarbarianFoundations(tx: Transaction, worldId: number, now: Date) {
  const [counts] = await tx
    .select({
      foundations: sql<number>`count(*) filter (where not ${villages.foundedAsBarbarian})::integer`,
      barbarians: sql<number>`count(*) filter (where ${villages.foundedAsBarbarian})::integer`,
    })
    .from(villages)
    .where(eq(villages.worldId, worldId));
  return createBarbarianVillages(
    tx,
    worldId,
    now,
    Math.max(0, counts!.foundations - counts!.barbarians),
  );
}

export async function populateBarbarianVillages(worldId: number, quantity?: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const now = new Date();
    return quantity === undefined
      ? fillBarbarianFoundations(tx, worldId, now)
      : createBarbarianVillages(tx, worldId, now, quantity);
  });
}
