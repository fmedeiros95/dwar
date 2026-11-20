import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import {
  db,
  worlds,
  players,
  villages,
  constructionEvents,
  researchEvents,
  recruitmentEvents,
} from '@dwar/database';
import type { WorldEntry } from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, settleVillage, settleWorldEvents, type WorldRow } from './village-engine.js';

export function listWorlds() {
  return db.select().from(worlds).orderBy(asc(worlds.name));
}

export async function readWorldBySlug(slug: string): Promise<WorldRow> {
  const [world] = await db.select().from(worlds).where(eq(worlds.slug, slug));
  if (!world) throw new GameError('Mundo não encontrado.', 404);
  return world;
}

export async function enterWorld(accountId: number, worldId: number): Promise<WorldEntry> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    let [player] = await tx
      .select()
      .from(players)
      .where(and(eq(players.accountId, accountId), eq(players.worldId, worldId)));
    if (!player) [player] = await tx.insert(players).values({ accountId, worldId }).returning();
    if (!player) throw new GameError('Não foi possível entrar no mundo.', 500);
    const [village] = await tx
      .select({ id: villages.id })
      .from(villages)
      .where(and(eq(villages.playerId, player.id), eq(villages.worldId, worldId)))
      .orderBy(asc(villages.id))
      .limit(1);
    return { world, villageId: village?.id ?? null };
  });
}

export async function updateWorldSpeed(
  worldId: number,
  settings: { buildSpeed: number; productionSpeed: number },
): Promise<WorldRow> {
  if (
    ![settings.buildSpeed, settings.productionSpeed].every(
      (value) => Number.isSafeInteger(value) && value > 0 && value <= 2147483647,
    )
  )
    throw new GameError('As velocidades devem ser números inteiros positivos.');
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const now = new Date();
    // Close the old production interval before changing the multiplier. Pending
    // orders retain their paid durations; new orders use the updated speed.
    const owned = await tx.select().from(villages).where(eq(villages.worldId, worldId));
    for (const village of owned) await settleVillage(tx, village, world, now);
    const [updated] = await tx
      .update(worlds)
      .set(settings)
      .where(eq(worlds.id, worldId))
      .returning();
    return updated!;
  });
}

export async function updateWorldBarbarians(
  worldId: number,
  barbarianVillagesPerPlayer: number,
): Promise<WorldRow> {
  if (
    !Number.isInteger(barbarianVillagesPerPlayer) ||
    barbarianVillagesPerPlayer < 0 ||
    barbarianVillagesPerPlayer > 20
  )
    throw new GameError('Use de 0 a 20 aldeias bárbaras por jogador.');
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const [updated] = await tx
      .update(worlds)
      .set({ barbarianVillagesPerPlayer })
      .where(eq(worlds.id, worldId))
      .returning();
    return updated!;
  });
}

export async function processWorldEvents(): Promise<number> {
  const available = await listWorlds();
  let processed = 0;
  for (const candidate of available) {
    processed += await db.transaction(async (tx) => {
      const world = await lockWorld(tx, candidate.id);
      const now = new Date();
      const resolvedEvents = await settleWorldEvents(tx, world, now);
      const due = await tx
        .select({ villageId: constructionEvents.villageId })
        .from(constructionEvents)
        .where(
          and(
            eq(constructionEvents.worldId, world.id),
            isNull(constructionEvents.completedAt),
            isNull(constructionEvents.cancelledAt),
            lte(constructionEvents.endsAt, now),
          ),
        )
        .orderBy(asc(constructionEvents.endsAt), asc(constructionEvents.id))
        .limit(200);
      const dueResearch = await tx
        .select({ villageId: researchEvents.villageId })
        .from(researchEvents)
        .where(
          and(
            eq(researchEvents.worldId, world.id),
            isNull(researchEvents.completedAt),
            lte(researchEvents.endsAt, now),
          ),
        )
        .orderBy(asc(researchEvents.endsAt), asc(researchEvents.id))
        .limit(200);
      const dueRecruitment = await tx
        .select({ villageId: recruitmentEvents.villageId })
        .from(recruitmentEvents)
        .where(
          and(
            eq(recruitmentEvents.worldId, world.id),
            isNull(recruitmentEvents.completedAt),
            isNull(recruitmentEvents.cancelledAt),
            // a próxima unidade do lote (a de número delivered + 1) já ficou pronta
            sql`${recruitmentEvents.startsAt} + (${recruitmentEvents.unitSeconds} * (${recruitmentEvents.deliveredQuantity} + 1)) * interval '1 second' <= ${now}`,
          ),
        )
        .orderBy(asc(recruitmentEvents.startsAt), asc(recruitmentEvents.id))
        .limit(200);
      for (const villageId of new Set(
        [...due, ...dueResearch, ...dueRecruitment].map((event) => event.villageId),
      )) {
        const [village] = await tx
          .select()
          .from(villages)
          .where(and(eq(villages.id, villageId), eq(villages.worldId, world.id)));
        if (village) await settleVillage(tx, village, world, now);
      }
      return resolvedEvents + due.length + dueResearch.length + dueRecruitment.length;
    });
  }
  return processed;
}
