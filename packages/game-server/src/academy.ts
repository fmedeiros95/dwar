import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  db,
  coinMintEvents,
  recruitmentEvents,
  unitPlacements,
  troopMovements,
  villages,
  worlds,
  type Transaction,
} from '@dwar/database';
import { units, type Resources } from '@dwar/game-config';
import {
  capacity,
  populationCapacity,
  productionRates,
  recruitmentDuration,
  requiredNobleCoins,
  resourceCodes,
  troopCost,
  coinMintCost,
} from '@dwar/game-core';
import {
  insufficientCoins,
  insufficientResources,
  type AcademyView,
  type VillageSnapshot,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage, settleVillage, snapshot } from './village-engine.js';

type Village = typeof villages.$inferSelect;
type World = typeof worlds.$inferSelect;
const pending = [isNull(recruitmentEvents.completedAt), isNull(recruitmentEvents.cancelledAt)];

function resourcesAvailableAt(
  village: Village,
  world: World,
  cost: Resources,
  now: Date,
): string | null {
  if (resourceCodes.some((code) => cost[code] > capacity(village.buildings))) return null;
  const rates = productionRates(village.buildings, world.productionSpeed);
  const seconds = Math.max(
    ...resourceCodes.map((code) => Math.max(0, cost[code] - village[code]) / (rates[code] / 3600)),
  );
  return seconds > 0 && Number.isFinite(seconds)
    ? new Date(now.getTime() + Math.ceil(seconds) * 1000).toISOString()
    : null;
}

export async function academyView(
  tx: Transaction,
  village: Village,
  world: World,
  now: Date,
): Promise<AcademyView> {
  if (!village.playerId) throw new GameError('Aldeia abandonada não pode usar a academia.', 403);
  const [minted] = await tx
    .select({ coins: count() })
    .from(coinMintEvents)
    .where(eq(coinMintEvents.playerId, village.playerId));
  const [owned] = await tx
    .select({ quantity: count() })
    .from(villages)
    .where(eq(villages.playerId, village.playerId));
  const nobles = await tx
    .select({
      villageId: unitPlacements.originVillageId,
      quantity: sql<number>`coalesce(sum(${unitPlacements.quantity}),0)::float8`,
    })
    .from(unitPlacements)
    .innerJoin(villages, eq(villages.id, unitPlacements.originVillageId))
    .where(and(eq(villages.playerId, village.playerId), eq(unitPlacements.unitCode, 'noble')))
    .groupBy(unitPlacements.originVillageId);
  const orders = await tx
    .select({
      villageId: recruitmentEvents.villageId,
      quantity: sql<number>`coalesce(sum(${recruitmentEvents.quantity} - ${recruitmentEvents.deliveredQuantity}),0)::float8`,
    })
    .from(recruitmentEvents)
    .innerJoin(villages, eq(villages.id, recruitmentEvents.villageId))
    .where(
      and(
        eq(villages.playerId, village.playerId),
        eq(recruitmentEvents.unitCode, 'noble'),
        ...pending,
      ),
    )
    .groupBy(recruitmentEvents.villageId);
  const marching = await tx
    .select({ troops: troopMovements.troops })
    .from(troopMovements)
    .innerJoin(villages, eq(villages.id, troopMovements.originVillageId))
    .where(and(eq(villages.playerId, village.playerId), isNull(troopMovements.arrivedAt)));
  const coins = minted!.coins;
  const coinsRequired = requiredNobleCoins(
    Math.max(0, owned!.quantity - 1),
    nobles.reduce((sum, row) => sum + row.quantity, 0) +
      marching.reduce((sum, row) => sum + row.troops.noble, 0),
    orders.reduce((sum, row) => sum + row.quantity, 0),
  );
  const coinsMissing = Math.max(0, coinsRequired - coins);
  const cost = troopCost('noble', village.buildings);
  const coinCost = coinMintCost(village.buildings);
  const recruitUnavailableReason =
    village.buildings.noble === 0
      ? 'Academia não construída.'
      : village.populationUsed + units.noble.population > populationCapacity(village.buildings)
        ? 'Amplie a fazenda para liberar população.'
        : resourceCodes.some((code) => cost[code] > capacity(village.buildings))
          ? 'Amplie o armazém para comportar o custo.'
          : resourceCodes.some((code) => cost[code] > village[code])
            ? insufficientResources
            : coinsMissing > 0
              ? insufficientCoins
              : null;
  const mintUnavailableReason =
    village.buildings.noble === 0
      ? 'Academia não construída.'
      : resourceCodes.some((code) => coinCost[code] > capacity(village.buildings))
        ? 'Amplie o armazém para comportar o custo.'
        : resourceCodes.some((code) => coinCost[code] > village[code])
          ? insufficientResources
          : null;
  return {
    coins,
    coinsRequired,
    coinsMissing,
    noblesInProgress: orders.find((row) => row.villageId === village.id)?.quantity ?? 0,
    noblesFromVillage: nobles.find((row) => row.villageId === village.id)?.quantity ?? 0,
    canRecruit: recruitUnavailableReason === null,
    recruitUnavailableReason,
    recruitResourcesAvailableAt:
      recruitUnavailableReason === insufficientResources
        ? resourcesAvailableAt(village, world, cost, now)
        : null,
    coinCost,
    canMint: mintUnavailableReason === null,
    mintUnavailableReason,
    mintResourcesAvailableAt:
      mintUnavailableReason === insufficientResources
        ? resourcesAvailableAt(village, world, coinCost, now)
        : null,
  };
}

async function pay(
  tx: Transaction,
  village: Village,
  cost: Resources,
  population: number,
): Promise<Village> {
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

export async function mintCoin(
  tx: Transaction,
  village: Village,
  world: World,
  requestId: string,
  now: Date,
): Promise<Village> {
  if (!village.playerId) throw new GameError('Aldeia abandonada não pode cunhar moedas.', 403);
  const [existing] = await tx
    .select()
    .from(coinMintEvents)
    .where(
      and(eq(coinMintEvents.playerId, village.playerId), eq(coinMintEvents.requestId, requestId)),
    );
  if (existing) {
    if (existing.villageId !== village.id)
      throw new GameError('Esta solicitação já foi usada em outra aldeia.', 409);
    return village;
  }
  const view = await academyView(tx, village, world, now);
  if (!view.canMint) throw new GameError(view.mintUnavailableReason!);
  await tx.insert(coinMintEvents).values({
    worldId: world.id,
    playerId: village.playerId,
    villageId: village.id,
    cost: coinMintCost(village.buildings),
    requestId,
    createdAt: now,
  });
  return pay(tx, village, coinMintCost(village.buildings), 0);
}

export async function recruitNoble(
  tx: Transaction,
  village: Village,
  world: World,
  requestId: string,
  now: Date,
): Promise<Village> {
  const existing = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(eq(recruitmentEvents.villageId, village.id), eq(recruitmentEvents.requestId, requestId)),
    );
  if (existing.length) {
    if (existing.length !== 1 || existing[0]!.unitCode !== 'noble')
      throw new GameError('Esta solicitação já foi usada em outro recrutamento.', 409);
    return village;
  }
  const view = await academyView(tx, village, world, now);
  if (!view.canRecruit) throw new GameError(view.recruitUnavailableReason!);
  const [last] = await tx
    .select()
    .from(recruitmentEvents)
    .where(
      and(
        eq(recruitmentEvents.villageId, village.id),
        eq(recruitmentEvents.unitCode, 'noble'),
        ...pending,
      ),
    )
    .orderBy(desc(recruitmentEvents.endsAt))
    .limit(1);
  const startsAt = last?.endsAt ?? now;
  const unitSeconds = recruitmentDuration('noble', village.buildings.noble, world.buildSpeed);
  await tx.insert(recruitmentEvents).values({
    worldId: world.id,
    villageId: village.id,
    buildingCode: 'noble',
    unitCode: 'noble',
    quantity: 1,
    unitSeconds,
    startsAt,
    endsAt: new Date(startsAt.getTime() + unitSeconds * 1000),
    cost: troopCost('noble', village.buildings),
    population: units.noble.population,
    requestId,
  });
  return pay(tx, village, troopCost('noble', village.buildings), units.noble.population);
}

export async function academyAction(
  accountId: number,
  worldId: number,
  villageId: number,
  action: 'mint' | 'recruit',
  requestId: string,
): Promise<VillageSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const owned = await ownedVillage(tx, accountId, worldId, villageId);
    const now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    const updated =
      action === 'mint'
        ? await mintCoin(tx, village, world, requestId, now)
        : await recruitNoble(tx, village, world, requestId, now);
    return snapshot(tx, updated, world, now);
  });
}
