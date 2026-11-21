import { eq, sql } from 'drizzle-orm';
import { db, villages, worlds, type Transaction } from '@dwar/database';
import { initialBuildings, initialResources } from '@dwar/game-config';
import { initialPoints, initialPopulation } from '@dwar/game-core';
import { lockWorld } from './village-engine.js';
import { nextVillagePosition } from './placement.js';
import { scheduleGrowth } from './barbarian-growth.js';

// Posição pela espiral do Speed Wars (fluxo próprio das bárbaras); mesmo estado inicial de uma fundação.
export async function createBarbarian(tx: Transaction, worldId: number, now: Date) {
  const coordinates = await nextVillagePosition(tx, worldId, 'barbarian');
  const [world] = await tx.select().from(worlds).where(eq(worlds.id, worldId));
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
  const growthAt = scheduleGrowth(village!, world!, now);
  if (!growthAt) return village!;
  await tx.update(villages).set({ growthAt }).where(eq(villages.id, village!.id));
  return { ...village!, growthAt };
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
  const [world] = await tx.select().from(worlds).where(eq(worlds.id, worldId));
  return createBarbarianVillages(
    tx,
    worldId,
    now,
    Math.max(0, counts!.foundations * world!.barbarianVillagesPerPlayer - counts!.barbarians),
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
