import { and, asc, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { villages, worlds, type Transaction } from '@dwar/database';
import { buildingDuration, chooseBarbarianUpgrade } from '@dwar/game-core';
import { settleVillage } from './village-engine.js';

type World = typeof worlds.$inferSelect;
type Village = typeof villages.$inferSelect;

/**
 * Quando a próxima evolução de uma bárbara acontece: o mesmo tempo que levaria uma obra normal
 * dessa construção, com o Edifício principal e a velocidade do mundo da própria aldeia.
 */
function nextGrowthAt(village: Village, world: World, now: Date): Date | null {
  const upgrade = chooseBarbarianUpgrade(
    village.buildings,
    village.points,
    village.populationUsed,
    world.barbarianMaxPoints,
    () => 0,
  );
  if (!upgrade) return null;
  const seconds = buildingDuration(
    upgrade.code,
    village.buildings[upgrade.code],
    village.buildings.main,
    world.buildSpeed,
  );
  return new Date(now.getTime() + seconds * 1000);
}

/** Agenda a evolução de uma aldeia bárbara recém-criada (ou que ganhou margem para crescer). */
export function scheduleGrowth(village: Village, world: World, now: Date): Date | null {
  return world.barbarianMaxPoints > 0 && village.playerId === null
    ? nextGrowthAt(village, world, now)
    : null;
}

/** Sobe um nível de uma aldeia bárbara e agenda o próximo, sem nunca passar do limite do mundo. */
export async function growBarbarian(
  tx: Transaction,
  villageId: number,
  world: World,
  now: Date,
): Promise<boolean> {
  const [found] = await tx.select().from(villages).where(eq(villages.id, villageId));
  if (!found || found.playerId !== null) return false;
  // Fecha a produção até agora antes de mexer nos níveis.
  const village = await settleVillage(tx, found, world, now);
  const upgrade =
    world.barbarianMaxPoints > 0
      ? chooseBarbarianUpgrade(
          village.buildings,
          village.points,
          village.populationUsed,
          world.barbarianMaxPoints,
          () => Math.random(),
        )
      : null;
  if (!upgrade) {
    await tx.update(villages).set({ growthAt: null }).where(eq(villages.id, village.id));
    return false;
  }
  const buildings = { ...village.buildings, [upgrade.code]: upgrade.targetLevel };
  const grown = {
    ...village,
    buildings,
    points: village.points + upgrade.points,
    populationUsed: village.populationUsed + upgrade.population,
  };
  await tx
    .update(villages)
    .set({
      buildings,
      points: grown.points,
      populationUsed: grown.populationUsed,
      growthAt: nextGrowthAt(grown, world, now),
    })
    .where(eq(villages.id, village.id));
  return true;
}

/** Evolui as bárbaras de um mundo cujo horário já chegou. */
export async function processBarbarianGrowth(tx: Transaction, world: World, now: Date) {
  if (world.barbarianMaxPoints <= 0) return 0;
  const due = await tx
    .select({ id: villages.id })
    .from(villages)
    .where(
      and(
        eq(villages.worldId, world.id),
        isNull(villages.playerId),
        isNotNull(villages.growthAt),
        lte(villages.growthAt, now),
      ),
    )
    .orderBy(asc(villages.growthAt), asc(villages.id))
    .limit(200);
  let grown = 0;
  for (const { id } of due) if (await growBarbarian(tx, id, world, now)) grown += 1;
  return grown;
}
