import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm';
import {
  db,
  recruitmentEvents,
  researchEvents,
  unitPlacements,
  villages,
  worlds,
  activity,
  type Transaction,
} from '@dwar/database';
import {
  units,
  unitCodes,
  technologies,
  type UnitCode,
  type RecruitmentBuilding,
} from '@dwar/game-config';
import { capacity, populationCapacity, recruitmentDuration, resourceCodes } from '@dwar/game-core';
import type { UnitView, AcademyView, VillageSnapshot } from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage, settleVillage, snapshot } from './village-engine.js';

type Village = typeof villages.$inferSelect;
type World = typeof worlds.$inferSelect;
export type Order = { unitCode: UnitCode; quantity: number };
const pending = [isNull(recruitmentEvents.completedAt), isNull(recruitmentEvents.cancelledAt)];

export function unitViews(
  village: Village,
  world: World,
  researched: ReadonlySet<string>,
  placements: (typeof unitPlacements.$inferSelect)[],
  academy?: AcademyView,
): UnitView[] {
  return unitCodes.map((code) => {
    const definition = units[code];
    const known =
      code === 'noble' || technologies[code].initiallyResearched || researched.has(code);
    const freePopulation = populationCapacity(village.buildings) - village.populationUsed;
    const reason =
      code === 'noble'
        ? (academy?.recruitUnavailableReason ??
          (academy?.canRecruit ? null : 'Recrute nobres pela academia.'))
        : village.buildings[definition.building] === 0
          ? 'Edifício não construído.'
          : !known
            ? 'Unidade não pesquisada.'
            : freePopulation < definition.population
              ? 'Amplie a fazenda para liberar população.'
              : resourceCodes.some(
                    (resource) => definition.cost[resource] > capacity(village.buildings),
                  )
                ? 'Amplie o armazém para comportar o custo.'
                : resourceCodes.some((resource) => definition.cost[resource] > village[resource])
                  ? 'Recursos insuficientes.'
                  : null;
    const counts = placements.filter((placement) => placement.unitCode === code);
    return {
      code,
      name: definition.name,
      building: definition.building,
      cost: definition.cost,
      population: definition.population,
      durationSeconds:
        village.buildings[definition.building] > 0
          ? recruitmentDuration(code, village.buildings[definition.building], world.buildSpeed)
          : 0,
      researched: known,
      unavailableReason: reason,
      maxRecruitable:
        code === 'noble'
          ? academy?.canRecruit
            ? 1
            : 0
          : reason
            ? 0
            : Math.min(
                99999,
                Math.floor(freePopulation / definition.population),
                ...resourceCodes.map((resource) =>
                  Math.floor(village[resource] / definition.cost[resource]),
                ),
              ),
      indoors: counts
        .filter(
          (placement) =>
            placement.originVillageId === village.id && placement.locationVillageId === village.id,
        )
        .reduce((sum, item) => sum + item.quantity, 0),
      total: counts
        .filter((placement) => placement.originVillageId === village.id)
        .reduce((sum, item) => sum + item.quantity, 0),
      present: counts
        .filter((placement) => placement.locationVillageId === village.id)
        .reduce((sum, item) => sum + item.quantity, 0),
    };
  });
}

export async function settleRecruitment(
  tx: Transaction,
  village: Village,
  now: Date,
): Promise<void> {
  const due = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(
        eq(recruitmentEvents.villageId, village.id),
        ...pending,
        lte(recruitmentEvents.endsAt, now),
      ),
    )
    .orderBy(asc(recruitmentEvents.endsAt), asc(recruitmentEvents.id));
  for (const event of due) {
    await tx
      .insert(unitPlacements)
      .values({
        worldId: village.worldId,
        originVillageId: village.id,
        locationVillageId: village.id,
        unitCode: event.unitCode,
        quantity: event.quantity,
      })
      .onConflictDoUpdate({
        target: [
          unitPlacements.originVillageId,
          unitPlacements.locationVillageId,
          unitPlacements.unitCode,
        ],
        set: { quantity: sql`${unitPlacements.quantity} + ${event.quantity}` },
      });
    await tx
      .update(recruitmentEvents)
      .set({ completedAt: now })
      .where(eq(recruitmentEvents.id, event.id));
    await tx.insert(activity).values({
      worldId: village.worldId,
      villageId: village.id,
      message: `Recrutamento concluído: ${event.quantity} × ${units[event.unitCode as UnitCode].name}.`,
      occurredAt: event.endsAt,
    });
  }
}

export async function recruit(
  tx: Transaction,
  village: Village,
  world: World,
  building: RecruitmentBuilding,
  orders: Order[],
  requestId: string,
  now: Date,
): Promise<Village> {
  const canonical = unitCodes.flatMap((code) => orders.filter((order) => order.unitCode === code));
  if (
    !canonical.length ||
    canonical.length !== orders.length ||
    new Set(orders.map((order) => order.unitCode)).size !== orders.length ||
    orders.some(
      (order) =>
        !Number.isInteger(order.quantity) ||
        order.quantity < 1 ||
        order.quantity > 99999 ||
        units[order.unitCode].building !== building,
    )
  )
    throw new GameError('Informe quantidades válidas para as unidades deste edifício.');
  const existing = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(eq(recruitmentEvents.villageId, village.id), eq(recruitmentEvents.requestId, requestId)),
    );
  if (existing.length) {
    if (
      existing.length !== canonical.length ||
      canonical.some(
        (order) =>
          !existing.some(
            (event) =>
              event.unitCode === order.unitCode &&
              event.quantity === order.quantity &&
              event.buildingCode === building,
          ),
      )
    )
      throw new GameError('Esta solicitação já foi usada em outro recrutamento.', 409);
    return village;
  }
  const research = await tx
    .select()
    .from(researchEvents)
    .where(eq(researchEvents.villageId, village.id));
  const views = unitViews(
    village,
    world,
    new Set(research.filter((event) => event.completedAt).map((event) => event.technologyCode)),
    [],
  );
  const cost = { wood: 0, stone: 0, iron: 0 };
  let population = 0;
  for (const order of canonical) {
    const view = views.find((item) => item.code === order.unitCode)!;
    if (view.unavailableReason) throw new GameError(view.unavailableReason);
    population += view.population * order.quantity;
    for (const resource of resourceCodes) cost[resource] += view.cost[resource] * order.quantity;
  }
  if (village.populationUsed + population > populationCapacity(village.buildings))
    throw new GameError('Amplie a fazenda para liberar população.');
  if (resourceCodes.some((resource) => village[resource] < cost[resource]))
    throw new GameError('Recursos insuficientes.');
  const [last] = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(
        eq(recruitmentEvents.villageId, village.id),
        eq(recruitmentEvents.buildingCode, building),
        ...pending,
      ),
    )
    .orderBy(sql`${recruitmentEvents.endsAt} DESC`)
    .limit(1);
  let cursor = last?.endsAt ?? now;
  for (const order of canonical) {
    const definition = units[order.unitCode];
    const unitSeconds = recruitmentDuration(
      order.unitCode,
      village.buildings[building],
      world.buildSpeed,
    );
    const endsAt = new Date(cursor.getTime() + unitSeconds * order.quantity * 1000);
    await tx.insert(recruitmentEvents).values({
      worldId: world.id,
      villageId: village.id,
      buildingCode: building,
      unitCode: order.unitCode,
      quantity: order.quantity,
      unitSeconds,
      startsAt: cursor,
      endsAt,
      requestId,
      cost: {
        wood: definition.cost.wood * order.quantity,
        stone: definition.cost.stone * order.quantity,
        iron: definition.cost.iron * order.quantity,
      },
      population: definition.population * order.quantity,
    });
    cursor = endsAt;
  }
  const updated = {
    ...village,
    wood: village.wood - cost.wood,
    stone: village.stone - cost.stone,
    iron: village.iron - cost.iron,
    populationUsed: village.populationUsed + population,
  };
  await tx
    .update(villages)
    .set({
      wood: updated.wood,
      stone: updated.stone,
      iron: updated.iron,
      populationUsed: updated.populationUsed,
    })
    .where(eq(villages.id, village.id));
  return updated;
}

export async function cancelRecruit(
  tx: Transaction,
  village: Village,
  eventId: number,
  now: Date,
): Promise<Village> {
  const [event] = await tx
    .select()
    .from(recruitmentEvents)
    .where(and(eq(recruitmentEvents.id, eventId), eq(recruitmentEvents.villageId, village.id)));
  if (!event) throw new GameError('Recrutamento não encontrado.', 404);
  if (event.cancelledAt) return village;
  if (event.completedAt) throw new GameError('Este recrutamento já foi concluído.', 409);
  await tx
    .update(recruitmentEvents)
    .set({ cancelledAt: now })
    .where(eq(recruitmentEvents.id, event.id));
  const queue = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(
        eq(recruitmentEvents.villageId, village.id),
        eq(recruitmentEvents.buildingCode, event.buildingCode),
        ...pending,
      ),
    )
    .orderBy(asc(recruitmentEvents.startsAt), asc(recruitmentEvents.id));
  let cursor = now;
  for (const [index, item] of queue.entries()) {
    const startsAt = index === 0 && item.startsAt < now ? item.startsAt : cursor;
    const endsAt = new Date(startsAt.getTime() + item.quantity * item.unitSeconds * 1000);
    await tx
      .update(recruitmentEvents)
      .set({ startsAt, endsAt })
      .where(eq(recruitmentEvents.id, item.id));
    cursor = endsAt;
  }
  const maximum = capacity(village.buildings);
  const updated = {
    ...village,
    wood: Math.min(maximum, village.wood + event.cost.wood),
    stone: Math.min(maximum, village.stone + event.cost.stone),
    iron: Math.min(maximum, village.iron + event.cost.iron),
    populationUsed: village.populationUsed - event.population,
  };
  await tx
    .update(villages)
    .set({
      wood: updated.wood,
      stone: updated.stone,
      iron: updated.iron,
      populationUsed: updated.populationUsed,
    })
    .where(eq(villages.id, village.id));
  return updated;
}

export async function enqueueRecruitment(
  accountId: number,
  worldId: number,
  villageId: number,
  building: RecruitmentBuilding,
  orders: Order[],
  requestId: string,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const owned = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    return snapshot(
      tx,
      await recruit(tx, village, world, building, orders, requestId, now),
      world,
      now,
    );
  });
}

export async function cancelRecruitment(
  accountId: number,
  worldId: number,
  villageId: number,
  eventId: number,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const owned = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    return snapshot(tx, await cancelRecruit(tx, village, eventId, now), world, now);
  });
}
