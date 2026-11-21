import { createHash } from 'node:crypto';
import { and, asc, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  activity,
  marketOffers,
  marketOperations,
  players,
  tradeShipments,
  villages,
  worlds,
  type Transaction,
} from '@dwar/database';
import { merchantCapacity, merchantCounts, type Resources } from '@dwar/game-config';
import { addNotices } from './notices.js';
import { syncMedals } from './medals.js';
import { capacity, requiredMerchants, resourceCodes, tradeDuration } from '@dwar/game-core';
import type {
  MarketAction,
  MarketSnapshot,
  TradePreview,
  TradeTarget,
  ResourceCode,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage, settleVillage } from './village-engine.js';

type Village = typeof villages.$inferSelect;
type World = typeof worlds.$inferSelect;
type SettleVillage = (
  tx: Transaction,
  village: Village,
  world: World,
  now: Date,
) => Promise<Village>;
const openOffer = [isNull(marketOffers.acceptedAt), isNull(marketOffers.cancelledAt)];
const travelling = [isNull(tradeShipments.deliveredAt), isNull(tradeShipments.cancelledAt)];
const empty = (): Resources => ({ wood: 0, stone: 0, iron: 0 });
const oneResource = (code: ResourceCode, amount: number): Resources => ({
  ...empty(),
  [code]: amount,
});
function requireMarket(village: Village) {
  if (!village.buildings.market) throw new GameError('Mercado não construído.');
}
function validateResources(resources: Resources) {
  if (
    resourceCodes.some(
      (code) =>
        !Number.isSafeInteger(resources[code]) || resources[code] < 0 || resources[code] > 999999,
    ) ||
    requiredMerchants(resources) < 1
  )
    throw new GameError('Informe uma quantidade positiva de recursos para enviar.');
}
async function saveResources(
  tx: Transaction,
  village: Village,
  resources: Resources,
): Promise<Village> {
  await tx.update(villages).set(resources).where(eq(villages.id, village.id));
  return { ...village, ...resources };
}
async function credit(tx: Transaction, village: Village, resources: Resources): Promise<Village> {
  const maximum = capacity(village.buildings);
  return saveResources(tx, village, {
    wood: Math.min(maximum, village.wood + resources.wood),
    stone: Math.min(maximum, village.stone + resources.stone),
    iron: Math.min(maximum, village.iron + resources.iron),
  });
}
async function debit(tx: Transaction, village: Village, resources: Resources): Promise<Village> {
  if (resourceCodes.some((code) => village[code] < resources[code]))
    throw new GameError('Recursos insuficientes.');
  return saveResources(tx, village, {
    wood: village.wood - resources.wood,
    stone: village.stone - resources.stone,
    iron: village.iron - resources.iron,
  });
}
async function merchantState(tx: Transaction, village: Village) {
  const shipments = await tx
    .select()
    .from(tradeShipments)
    .where(and(eq(tradeShipments.fromVillageId, village.id), ...travelling));
  const offers = await tx
    .select()
    .from(marketOffers)
    .where(and(eq(marketOffers.villageId, village.id), ...openOffer));
  const outgoing = shipments.reduce((sum, row) => sum + row.merchants, 0),
    reserved = offers.reduce((sum, row) => sum + row.merchants, 0),
    total = merchantCounts[village.buildings.market] ?? 0;
  return { total, outgoing, reserved, available: Math.max(0, total - outgoing - reserved) };
}
async function targets(tx: Transaction, worldId: number) {
  const rows = await tx
    .select({
      id: villages.id,
      name: villages.name,
      x: villages.x,
      y: villages.y,
      username: sql<string>`coalesce(${accounts.username}, 'Aldeia abandonada')`,
    })
    .from(villages)
    .leftJoin(players, eq(players.id, villages.playerId))
    .leftJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(villages.worldId, worldId));
  return new Map(rows.map((row) => [row.id, row]));
}
function cancelUntil(shipment: typeof tradeShipments.$inferSelect): Date | null {
  return shipment.mode === 'normal'
    ? new Date(
        shipment.endsAt.getTime() -
          Math.ceil((shipment.endsAt.getTime() - shipment.startsAt.getTime()) / 2000) * 1000,
      )
    : null;
}

export async function settleTransports(
  tx: Transaction,
  world: World,
  now: Date,
  settle: SettleVillage,
): Promise<number> {
  const due = await tx
    .select()
    .from(tradeShipments)
    .where(
      and(eq(tradeShipments.worldId, world.id), ...travelling, lte(tradeShipments.endsAt, now)),
    )
    .orderBy(asc(tradeShipments.endsAt), asc(tradeShipments.id));
  for (const shipment of due) {
    const [recipient] = await tx
      .select()
      .from(villages)
      .where(eq(villages.id, shipment.toVillageId));
    const settled = await settle(tx, recipient!, world, shipment.endsAt);
    await credit(tx, settled, shipment.resources);
    await tx
      .update(tradeShipments)
      .set({ deliveredAt: now })
      .where(eq(tradeShipments.id, shipment.id));
    const [sender] = await tx
      .select({ playerId: villages.playerId })
      .from(villages)
      .where(eq(villages.id, shipment.fromVillageId));
    if (sender?.playerId) await syncMedals(tx, world.id, [sender.playerId], shipment.endsAt);
    await addNotices(
      tx,
      world.id,
      shipment.fromVillageId,
      shipment.toVillageId,
      {
        kind: 'trade',
        mode: shipment.mode === 'offer' ? 'offer' : 'normal',
        resources: shipment.resources,
      },
      shipment.endsAt,
    );
    await tx.insert(activity).values([
      {
        worldId: world.id,
        villageId: shipment.toVillageId,
        message: 'Uma remessa de recursos chegou à aldeia.',
        occurredAt: shipment.endsAt,
      },
      {
        worldId: world.id,
        villageId: shipment.fromVillageId,
        message: 'Os recursos enviados chegaram ao destino.',
        occurredAt: shipment.endsAt,
      },
    ]);
  }
  return due.length;
}

export async function marketView(
  tx: Transaction,
  village: Village,
  world: World,
  now: Date,
): Promise<MarketSnapshot> {
  requireMarket(village);
  const state = await merchantState(tx, village),
    known = await targets(tx, world.id);
  const shipments = await tx
    .select()
    .from(tradeShipments)
    .where(
      and(
        eq(tradeShipments.worldId, world.id),
        ...travelling,
        or(
          eq(tradeShipments.fromVillageId, village.id),
          eq(tradeShipments.toVillageId, village.id),
        ),
      ),
    )
    .orderBy(asc(tradeShipments.endsAt), asc(tradeShipments.id));
  const offers = await tx
    .select()
    .from(marketOffers)
    .where(and(eq(marketOffers.worldId, world.id), ...openOffer))
    .orderBy(desc(marketOffers.createdAt), desc(marketOffers.id));
  const shipmentViews = shipments
    .filter((row) => row.fromVillageId === village.id || row.toVillageId === village.id)
    .map((row) => ({
      id: row.id,
      from: known.get(row.fromVillageId)!,
      to: known.get(row.toVillageId)!,
      mode: row.mode,
      resources: row.resources,
      merchants: row.merchants,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      cancelUntil: cancelUntil(row)?.toISOString() ?? null,
    }));
  const offerViews = offers.map((row) => {
    const buyResource = row.buyResource as ResourceCode;
    const reason =
      row.villageId === village.id
        ? 'Esta oferta pertence à aldeia.'
        : Math.ceil(row.buyAmount / merchantCapacity) > state.available
          ? 'Mercadores insuficientes.'
          : village[buyResource] < row.buyAmount
            ? 'Recursos insuficientes.'
            : null;
    return {
      id: row.id,
      village: known.get(row.villageId)!,
      sellResource: row.sellResource as ResourceCode,
      buyResource,
      sellAmount: row.sellAmount,
      buyAmount: row.buyAmount,
      merchants: row.merchants,
      createdAt: row.createdAt.toISOString(),
      durationSeconds: tradeDuration(village, known.get(row.villageId)!, world.buildSpeed, 'offer'),
      ratio: Math.round((row.sellAmount / row.buyAmount) * 10) / 10,
      canAccept: reason === null,
      unavailableReason: reason,
    };
  });
  return {
    serverTime: now.toISOString(),
    villageId: village.id,
    resources: {
      wood: Math.floor(village.wood),
      stone: Math.floor(village.stone),
      iron: Math.floor(village.iron),
    },
    totalMerchants: state.total,
    availableMerchants: state.available,
    outgoingMerchants: state.outgoing,
    returningMerchants: 0,
    reservedMerchants: state.reserved,
    transportCapacity: state.available * merchantCapacity,
    outgoing: shipmentViews.filter((row) => row.from.id === village.id),
    incoming: shipmentViews.filter((row) => row.to.id === village.id),
    ownOffers: offerViews.filter((row) => row.village.id === village.id),
    otherOffers: offerViews.filter((row) => row.village.id !== village.id),
  };
}

async function validateSend(
  tx: Transaction,
  village: Village,
  target: TradeTarget | undefined,
  resources: Resources,
) {
  requireMarket(village);
  validateResources(resources);
  if (!target) throw new GameError('Aldeia não encontrada.', 404);
  if (target.id === village.id)
    throw new GameError('Não é possível enviar recursos para a própria aldeia.');
  if (resourceCodes.some((code) => village[code] < resources[code]))
    throw new GameError('Recursos insuficientes.');
  if (requiredMerchants(resources) > (await merchantState(tx, village)).available)
    throw new GameError('Mercadores insuficientes.');
}
export async function previewTrade(
  tx: Transaction,
  village: Village,
  world: World,
  x: number,
  y: number,
  resources: Resources,
  now: Date,
): Promise<TradePreview> {
  const known = await targets(tx, world.id),
    target = [...known.values()].find((row) => row.x === x && row.y === y);
  await validateSend(tx, village, target, resources);
  const durationSeconds = tradeDuration(village, target!, world.buildSpeed, 'normal');
  return {
    target: target!,
    resources,
    merchants: requiredMerchants(resources),
    durationSeconds,
    arrivesAt: new Date(now.getTime() + durationSeconds * 1000).toISOString(),
  };
}
async function shipment(
  tx: Transaction,
  world: World,
  fromId: number,
  toId: number,
  resources: Resources,
  duration: number,
  now: Date,
  offerId?: number,
) {
  await tx.insert(tradeShipments).values({
    worldId: world.id,
    fromVillageId: fromId,
    toVillageId: toId,
    resources,
    merchants: requiredMerchants(resources),
    mode: offerId ? 'offer' : 'normal',
    offerId: offerId ?? null,
    startsAt: now,
    endsAt: new Date(now.getTime() + duration * 1000),
  });
}
function fingerprint(action: MarketAction): string {
  const data =
    action.type === 'send'
      ? {
          type: action.type,
          targetId: action.targetId,
          wood: action.resources.wood,
          stone: action.resources.stone,
          iron: action.resources.iron,
        }
      : action.type === 'create_offer'
        ? {
            type: action.type,
            sellResource: action.sellResource,
            buyResource: action.buyResource,
            sellAmount: action.sellAmount,
            buyAmount: action.buyAmount,
          }
        : { type: action.type, id: action.id };
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
export async function performMarketAction(
  tx: Transaction,
  village: Village,
  world: World,
  action: MarketAction,
  requestId: string,
  now: Date,
): Promise<Village> {
  requireMarket(village);
  const hash = fingerprint(action);
  const [operation] = await tx
    .select()
    .from(marketOperations)
    .where(
      and(eq(marketOperations.villageId, village.id), eq(marketOperations.requestId, requestId)),
    );
  if (operation) {
    if (operation.fingerprint !== hash)
      throw new GameError('Esta solicitação já foi usada em outra operação do mercado.', 409);
    return village;
  }
  await tx.insert(marketOperations).values({
    worldId: world.id,
    villageId: village.id,
    requestId,
    fingerprint: hash,
    createdAt: now,
  });
  if (action.type === 'send') {
    const target = (await targets(tx, world.id)).get(action.targetId);
    await validateSend(tx, village, target, action.resources);
    const updated = await debit(tx, village, action.resources);
    await shipment(
      tx,
      world,
      village.id,
      target!.id,
      action.resources,
      tradeDuration(village, target!, world.buildSpeed, 'normal'),
      now,
    );
    return updated;
  }
  if (action.type === 'create_offer') {
    if (
      !resourceCodes.includes(action.sellResource) ||
      !resourceCodes.includes(action.buyResource) ||
      ![action.sellAmount, action.buyAmount].every(
        (value) => Number.isInteger(value) && value > 0 && value <= 235000,
      )
    )
      throw new GameError('Informe recursos e quantidades válidos para a oferta.');
    const merchants = Math.ceil(action.sellAmount / merchantCapacity);
    if (merchants > (await merchantState(tx, village)).available)
      throw new GameError('Mercadores insuficientes.');
    const updated = await debit(tx, village, oneResource(action.sellResource, action.sellAmount));
    await tx.insert(marketOffers).values({
      worldId: world.id,
      villageId: village.id,
      sellResource: action.sellResource,
      buyResource: action.buyResource,
      sellAmount: action.sellAmount,
      buyAmount: action.buyAmount,
      merchants,
      createdAt: now,
    });
    return updated;
  }
  if (action.type === 'cancel_shipment') {
    const [row] = await tx
      .select()
      .from(tradeShipments)
      .where(and(eq(tradeShipments.id, action.id), eq(tradeShipments.fromVillageId, village.id)));
    if (!row) throw new GameError('Transporte não encontrado.', 404);
    if (row.cancelledAt) return village;
    const deadline = cancelUntil(row);
    if (row.deliveredAt || !deadline || now >= deadline)
      throw new GameError('O prazo para cancelar este transporte terminou.', 409);
    await tx.update(tradeShipments).set({ cancelledAt: now }).where(eq(tradeShipments.id, row.id));
    return credit(tx, village, row.resources);
  }
  const [offer] = await tx
    .select()
    .from(marketOffers)
    .where(and(eq(marketOffers.id, action.id), eq(marketOffers.worldId, world.id)));
  if (!offer || (action.type === 'cancel_offer' && offer.villageId !== village.id))
    throw new GameError('Oferta não encontrada.', 404);
  if (action.type === 'cancel_offer') {
    if (offer.acceptedAt) throw new GameError('Esta oferta já foi aceita.', 409);
    if (offer.cancelledAt) return village;
    await tx.update(marketOffers).set({ cancelledAt: now }).where(eq(marketOffers.id, offer.id));
    return credit(tx, village, oneResource(offer.sellResource as ResourceCode, offer.sellAmount));
  }
  if (offer.acceptedAt || offer.cancelledAt)
    throw new GameError('Esta oferta não está mais disponível.', 409);
  if (offer.villageId === village.id) throw new GameError('Esta oferta pertence à aldeia.');
  const payment = oneResource(offer.buyResource as ResourceCode, offer.buyAmount);
  if (requiredMerchants(payment) > (await merchantState(tx, village)).available)
    throw new GameError('Mercadores insuficientes.');
  const updated = await debit(tx, village, payment);
  const known = await targets(tx, world.id),
    owner = known.get(offer.villageId)!;
  const duration = tradeDuration(village, owner, world.buildSpeed, 'offer');
  await tx
    .update(marketOffers)
    .set({ acceptedAt: now, acceptedByVillageId: village.id })
    .where(eq(marketOffers.id, offer.id));
  await shipment(tx, world, village.id, owner.id, payment, duration, now, offer.id);
  await shipment(
    tx,
    world,
    owner.id,
    village.id,
    oneResource(offer.sellResource as ResourceCode, offer.sellAmount),
    duration,
    now,
    offer.id,
  );
  return updated;
}

export async function readMarket(
  accountId: number,
  worldId: number,
  villageId: number,
): Promise<MarketSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    return marketView(tx, village, world, now);
  });
}

export async function previewMarketTrade(
  accountId: number,
  worldId: number,
  villageId: number,
  x: number,
  y: number,
  resources: Resources,
): Promise<TradePreview> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    return previewTrade(tx, village, world, x, y, resources, now);
  });
}

export async function mutateMarket(
  accountId: number,
  worldId: number,
  villageId: number,
  action: MarketAction,
  requestId: string,
): Promise<MarketSnapshot> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    const updated = await performMarketAction(tx, village, world, action, requestId, now);
    return marketView(tx, updated, world, now);
  });
}
