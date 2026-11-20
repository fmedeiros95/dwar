import { and, asc, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import {
  worlds,
  players,
  villages,
  constructionEvents,
  researchEvents,
  recruitmentEvents,
  troopMovements,
  tradeShipments,
  unitPlacements,
  activity,
  type Transaction,
} from '@dwar/database';
import {
  buildings,
  technologies,
  type TechnologyCode,
  units,
  type UnitCode,
  type BuildingCode,
} from '@dwar/game-config';
import {
  accrueResources,
  loyaltyAt,
  addedPoints,
  buildingCodes,
  buildingCost,
  buildingDuration,
  buildingPopulation,
  capacity,
  missingRequirements,
  populationCapacity,
  productionRates,
  resourceCodes,
} from '@dwar/game-core';
import type { VillageSnapshot } from '@dwar/api-client';
import { buildingDetails } from './building-details.js';
import { technologyViews } from './research.js';
import { academyView } from './academy.js';
import { unitViews, settleRecruitment } from './recruitment.js';
import { settleTransports } from './market.js';
import { settleTroopArrivals } from './rally.js';
import { GameError } from './errors.js';

export type WorldRow = typeof worlds.$inferSelect;
export type VillageRow = typeof villages.$inferSelect;

/**
 * The shared kernel every domain module builds on: locking a world for a
 * consistent view, resolving the caller's village, settling the passage of
 * time for a village (construction/research completion and production
 * accrual) and assembling the VillageSnapshot DTO returned to the client.
 */

export async function lockWorld(tx: Transaction, worldId: number): Promise<WorldRow> {
  // All world mutations, including worker recovery, follow the same ordering lock.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${worldId}::text))`);
  const [world] = await tx.select().from(worlds).where(eq(worlds.id, worldId));
  if (!world) throw new GameError('Mundo não encontrado.', 404);
  return world;
}

export async function ownedVillage(
  tx: Transaction,
  accountId: number,
  worldId: number,
  villageId?: number,
): Promise<VillageRow & { playerId: number }> {
  const [result] = await tx
    .select({ village: villages })
    .from(villages)
    .innerJoin(
      players,
      and(eq(players.id, villages.playerId), eq(players.worldId, villages.worldId)),
    )
    .where(
      and(
        eq(players.accountId, accountId),
        eq(villages.worldId, worldId),
        villageId ? eq(villages.id, villageId) : undefined,
      ),
    )
    .orderBy(asc(villages.id))
    .limit(1);
  if (!result || !result.village.playerId)
    throw new GameError('Entre neste mundo para fundar sua aldeia.', 404);
  return { ...result.village, playerId: result.village.playerId };
}

async function settleVillageBase(
  tx: Transaction,
  village: VillageRow,
  world: WorldRow,
  now: Date,
): Promise<VillageRow> {
  const due = await tx
    .select()
    .from(constructionEvents)
    .where(
      and(
        eq(constructionEvents.villageId, village.id),
        isNull(constructionEvents.completedAt),
        isNull(constructionEvents.cancelledAt),
        lte(constructionEvents.endsAt, now),
      ),
    )
    .orderBy(asc(constructionEvents.endsAt), asc(constructionEvents.id));
  let current = { ...village, buildings: { ...village.buildings } };
  for (const event of due) {
    const code = event.buildingCode as BuildingCode;
    if (!buildingCodes.includes(code) || current.buildings[code] + 1 !== event.targetLevel) {
      throw new GameError(
        'A fila desta aldeia precisa de revisão. Consulte os registros do servidor.',
        500,
      );
    }
    const resources = accrueResources(
      current,
      current.buildings,
      world.productionSpeed,
      current.updatedAt,
      event.endsAt,
    );
    const points = current.points + addedPoints(code, current.buildings[code]);
    current = {
      ...current,
      ...resources,
      points,
      buildings: { ...current.buildings, [code]: event.targetLevel },
      updatedAt: event.endsAt,
    };
    await tx
      .update(constructionEvents)
      .set({ completedAt: now })
      .where(eq(constructionEvents.id, event.id));
    await tx.insert(activity).values({
      worldId: world.id,
      villageId: village.id,
      message: `${buildings[code].name} evoluiu para o nível ${event.targetLevel}.`,
      occurredAt: event.endsAt,
    });
  }
  const resources = accrueResources(
    current,
    current.buildings,
    world.productionSpeed,
    current.updatedAt,
    now,
  );
  current = { ...current, ...resources, updatedAt: now };
  await tx
    .update(villages)
    .set({ ...resources, buildings: current.buildings, points: current.points, updatedAt: now })
    .where(eq(villages.id, village.id));
  const dueResearch = await tx
    .select()
    .from(researchEvents)
    .where(
      and(
        eq(researchEvents.villageId, village.id),
        isNull(researchEvents.completedAt),
        lte(researchEvents.endsAt, now),
      ),
    )
    .orderBy(asc(researchEvents.endsAt), asc(researchEvents.id));
  for (const event of dueResearch) {
    await tx
      .update(researchEvents)
      .set({ completedAt: now })
      .where(eq(researchEvents.id, event.id));
    await tx.insert(activity).values({
      worldId: world.id,
      villageId: village.id,
      message: `Pesquisa de ${technologies[event.technologyCode as TechnologyCode].name} concluída.`,
      occurredAt: event.endsAt,
    });
  }
  await settleRecruitment(tx, current, now);
  return current;
}

export async function settleWorldEvents(tx: Transaction, world: WorldRow, now: Date) {
  let processed = 0;
  while (true) {
    const [military] = await tx
      .select({ at: troopMovements.endsAt })
      .from(troopMovements)
      .where(
        and(
          eq(troopMovements.worldId, world.id),
          isNull(troopMovements.arrivedAt),
          lte(troopMovements.endsAt, now),
        ),
      )
      .orderBy(asc(troopMovements.endsAt), asc(troopMovements.id))
      .limit(1);
    const [shipment] = await tx
      .select({ at: tradeShipments.endsAt })
      .from(tradeShipments)
      .where(
        and(
          eq(tradeShipments.worldId, world.id),
          isNull(tradeShipments.deliveredAt),
          isNull(tradeShipments.cancelledAt),
          lte(tradeShipments.endsAt, now),
        ),
      )
      .orderBy(asc(tradeShipments.endsAt), asc(tradeShipments.id))
      .limit(1);
    if (!military && !shipment) break;
    if (shipment && (!military || shipment.at <= military.at))
      processed += await settleTransports(tx, world, shipment.at, settleVillageBase);
    else processed += await settleTroopArrivals(tx, world, military!.at, settleVillageBase);
  }
  return processed;
}

export async function settleVillage(
  tx: Transaction,
  village: VillageRow,
  world: WorldRow,
  now: Date,
): Promise<VillageRow> {
  await settleWorldEvents(tx, world, now);
  // A delivery may have credited this village while settling the world's trades.
  const [current] = await tx.select().from(villages).where(eq(villages.id, village.id));
  if (current!.playerId !== village.playerId)
    throw new GameError('Esta aldeia mudou de proprietário. Volte à lista de mundos.', 409);
  return settleVillageBase(tx, current!, world, now);
}

export async function snapshot(
  tx: Transaction,
  village: VillageRow,
  world: WorldRow,
  now: Date,
): Promise<VillageSnapshot> {
  const queue = await tx
    .select()
    .from(constructionEvents)
    .where(
      and(
        eq(constructionEvents.villageId, village.id),
        isNull(constructionEvents.completedAt),
        isNull(constructionEvents.cancelledAt),
      ),
    )
    .orderBy(asc(constructionEvents.endsAt), asc(constructionEvents.id));
  const history = await tx
    .select()
    .from(activity)
    .where(eq(activity.villageId, village.id))
    .orderBy(desc(activity.occurredAt), desc(activity.id))
    .limit(10);
  const research = await tx
    .select()
    .from(researchEvents)
    .where(eq(researchEvents.villageId, village.id));
  const placements = await tx
    .select()
    .from(unitPlacements)
    .where(
      or(
        eq(unitPlacements.originVillageId, village.id),
        eq(unitPlacements.locationVillageId, village.id),
      ),
    );
  const recruitment = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(
        eq(recruitmentEvents.villageId, village.id),
        isNull(recruitmentEvents.completedAt),
        isNull(recruitmentEvents.cancelledAt),
      ),
    )
    .orderBy(asc(recruitmentEvents.startsAt), asc(recruitmentEvents.id));
  const academy = await academyView(tx, village, world, now);
  return {
    academy,
    units: unitViews(
      village,
      world,
      new Set(research.filter((event) => event.completedAt).map((event) => event.technologyCode)),
      placements,
      academy,
    ),
    recruitmentQueue: recruitment.map((event) => ({
      id: event.id,
      buildingCode: event.buildingCode,
      unitCode: event.unitCode,
      name: units[event.unitCode as UnitCode].name,
      quantity: event.quantity,
      delivered: event.deliveredQuantity,
      unitSeconds: event.unitSeconds,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
    })),
    technologies: technologyViews(
      village.buildings,
      village,
      capacity(village.buildings),
      research,
    ),
    serverTime: now.toISOString(),
    world,
    village: {
      id: village.id,
      name: village.name,
      x: village.x,
      y: village.y,
      points: village.points,
      loyalty: loyaltyAt(village.loyalty, village.loyaltyUpdatedAt, now, world.buildSpeed),
      resources: {
        wood: Math.floor(village.wood),
        stone: Math.floor(village.stone),
        iron: Math.floor(village.iron),
      },
      productionPerHour: productionRates(village.buildings, world.productionSpeed),
      capacity: capacity(village.buildings),
      populationUsed: village.populationUsed,
      populationCapacity: populationCapacity(village.buildings),
    },
    buildings: buildingCodes.map((code) => {
      const definition = buildings[code];
      const level = village.buildings[code];
      const queuedLevel = level + queue.filter((event) => event.buildingCode === code).length;
      const cost = buildingCost(code, queuedLevel);
      const population = buildingPopulation(code, queuedLevel + 1);
      const requirements = missingRequirements(code, village.buildings);
      const rates = productionRates(village.buildings, world.productionSpeed);
      const waitingSeconds = Math.max(
        ...resourceCodes.map(
          (resource) => Math.max(0, cost[resource] - village[resource]) / (rates[resource] / 3600),
        ),
      );
      const reason =
        queuedLevel >= definition.maxLevel
          ? 'Nível máximo atingido.'
          : requirements.length
            ? `Requer ${requirements.join(', ')}.`
            : queue.length >= world.maxBuildQueue
              ? 'Fila de construção cheia.'
              : village.populationUsed + population > populationCapacity(village.buildings)
                ? 'Amplie a fazenda para liberar população.'
                : resourceCodes.some((resource) => cost[resource] > capacity(village.buildings))
                  ? 'Amplie o armazém para comportar o custo.'
                  : resourceCodes.some((resource) => village[resource] < cost[resource])
                    ? 'Recursos insuficientes.'
                    : null;
      return {
        code,
        name: definition.name,
        description: definition.description,
        level,
        queuedLevel,
        maxLevel: definition.maxLevel,
        cost,
        population,
        durationSeconds: buildingDuration(
          code,
          queuedLevel,
          village.buildings.main,
          world.buildSpeed,
        ),
        canBuild: reason === null,
        unavailableReason: reason,
        requirements: Object.entries(definition.requirements).map(([required, requiredLevel]) => ({
          code: required,
          name: buildings[required as BuildingCode].name,
          level: requiredLevel,
          met: village.buildings[required as BuildingCode] >= requiredLevel,
        })),
        resourcesAvailableAt:
          reason === 'Recursos insuficientes.' && Number.isFinite(waitingSeconds)
            ? new Date(now.getTime() + Math.ceil(waitingSeconds) * 1000).toISOString()
            : null,
        details: buildingDetails(
          code,
          village.buildings,
          world.productionSpeed,
          village.populationUsed,
        ),
      };
    }),
    queue: queue.map((event) => ({
      id: event.id,
      buildingCode: event.buildingCode,
      name: buildings[event.buildingCode as BuildingCode].name,
      targetLevel: event.targetLevel,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
    })),
    activity: history.map((item) => ({
      id: item.id,
      message: item.message,
      occurredAt: item.occurredAt.toISOString(),
    })),
  };
}
