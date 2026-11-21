import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  players,
  villages,
  worlds,
  unitPlacements,
  troopMovements,
  troopOperations,
  battleReports,
  battleReportRecipients,
  activity,
  type Transaction,
} from '@dwar/database';
import {
  combatStats,
  movementSpeeds,
  unitCodes,
  units,
  type Troops,
  type UnitCode,
} from '@dwar/game-config';
import { troopDuration } from '@dwar/game-core';
import type {
  PublicVillage,
  PublicPlayer,
  MapSnapshot,
  MapCommand,
  MapReportDot,
  RallySnapshot,
  RallyAction,
  SupportPreview,
  TroopCounts,
} from '@dwar/api-client';
import { lockWorld, ownedVillage, settleVillage } from './village-engine.js';
import {
  attackConditions,
  checkedTarget,
  resolveAttack,
  placeTroops,
  type SettleVillage,
} from './combat.js';
import { capacity, resourceCodes } from '@dwar/game-core';
import { combatRules, catapultTargets, buildings } from '@dwar/game-config';
import { mapOptions } from './map-options.js';
import { addNotices } from './notices.js';
import { tribesOf } from './tribe-lookup.js';
import { GameError } from './errors.js';

type Village = typeof villages.$inferSelect;
type World = typeof worlds.$inferSelect;
const emptyTroops = (): Troops => Object.fromEntries(unitCodes.map((code) => [code, 0])) as Troops;

export async function publicVillages(
  tx: Transaction,
  village: Village,
  bounds?: { x: number; y: number; radius?: number },
  ids?: number[],
): Promise<PublicVillage[]> {
  const rows = await tx
    .select({
      id: villages.id,
      name: villages.name,
      x: villages.x,
      y: villages.y,
      points: villages.points,
      playerId: villages.playerId,
      username: sql<string>`coalesce(${accounts.username}, 'Aldeia abandonada')`,
      playerPoints: sql<number>`(SELECT coalesce(sum(owned.points),0)::integer FROM villages owned WHERE owned.player_id=${villages.playerId})`,
      own: sql<boolean>`coalesce(${villages.playerId} = ${village.playerId}, false)`,
    })
    .from(villages)
    .leftJoin(players, eq(players.id, villages.playerId))
    .leftJoin(accounts, eq(accounts.id, players.accountId))
    .where(
      and(
        eq(villages.worldId, village.worldId),
        ids ? inArray(villages.id, ids) : undefined,
        bounds
          ? and(
              gte(villages.x, Math.max(0, bounds.x - (bounds.radius ?? 25))),
              lte(villages.x, Math.min(999, bounds.x + (bounds.radius ?? 25) + 1)),
              gte(villages.y, Math.max(0, bounds.y - (bounds.radius ?? 25))),
              lte(villages.y, Math.min(999, bounds.y + (bounds.radius ?? 25) + 1)),
            )
          : undefined,
      ),
    );
  // A tag da tribo do dono aparece junto ao nome (aldeias abandonadas não têm tribo).
  const tribesByPlayer = await tribesOf(
    tx,
    rows.flatMap((row) => (row.playerId === null ? [] : [row.playerId])),
  );
  return rows.map((row) => ({
    ...row,
    tribe: row.playerId === null ? null : (tribesByPlayer.get(row.playerId) ?? null),
  }));
}
export async function publicVillageView(
  tx: Transaction,
  village: Village,
  targetId: number,
): Promise<PublicVillage> {
  const [target] = await publicVillages(tx, village, undefined, [targetId]);
  if (!target) throw new GameError('Aldeia não encontrada.', 404);
  return target;
}
export async function publicPlayerView(
  tx: Transaction,
  village: Village,
  playerId: number,
): Promise<PublicPlayer> {
  const standings = await tx
    .select({
      id: players.id,
      username: accounts.username,
      points: sql<number>`coalesce(sum(${villages.points}),0)::integer`,
      gender: accounts.gender,
      age: accounts.age,
      location: accounts.locationText,
      personalText: players.personalText,
      avatarPath: players.avatarPath,
    })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .leftJoin(villages, eq(villages.playerId, players.id))
    .where(eq(players.worldId, village.worldId))
    .groupBy(
      players.id,
      accounts.username,
      accounts.gender,
      accounts.age,
      accounts.locationText,
      players.personalText,
      players.avatarPath,
    )
    .orderBy(
      desc(sql`coalesce(sum(${villages.points}),0)`),
      asc(players.createdAt),
      asc(players.id),
    );
  const rank = standings.findIndex((row) => row.id === playerId);
  if (rank < 0) throw new GameError('Jogador não encontrado.', 404);
  const ownedIds = await tx
    .select({ id: villages.id })
    .from(villages)
    .where(eq(villages.playerId, playerId));
  const owned = ownedIds.length
    ? await publicVillages(
        tx,
        village,
        undefined,
        ownedIds.map((row) => row.id),
      )
    : [];
  const row = standings[rank]!;
  return {
    id: row.id,
    username: row.username,
    tribe: (await tribesOf(tx, [row.id])).get(row.id) ?? null,
    points: row.points,
    rank: rank + 1,
    own: playerId === village.playerId,
    gender: row.gender ?? null,
    age: row.age ?? null,
    location: row.location ?? null,
    personalText: row.personalText ?? null,
    avatarUrl: row.avatarPath ? `/avatars/${row.avatarPath}` : null,
    villages: owned.sort((a, b) => b.points - a.points || a.x - b.x || a.y - b.y),
  };
}
export async function mapView(
  tx: Transaction,
  village: Village,
  x: number,
  y: number,
  span = 0,
): Promise<MapSnapshot> {
  if (![x, y].every((value) => Number.isInteger(value) && value >= 0 && value <= 999))
    throw new GameError('Use coordenadas entre 0 e 999.');
  if (!village.playerId) throw new GameError('Aldeia sem proprietário.', 403);
  const options = await mapOptions(tx, village.playerId);
  const radius =
    Math.ceil(
      Math.max(
        options.settings.minimapSize,
        options.settings.width,
        options.settings.height,
        span,
      ) / 2,
    ) + 1;
  const visible = await publicVillages(tx, village, { x, y, radius });
  return {
    center: { x, y },
    villages: visible,
    commands: await mapCommands(tx, village, visible),
    reports: await mapReports(tx, village, visible),
    ownTribeId: (await tribesOf(tx, [village.playerId])).get(village.playerId)?.id ?? null,
    ...options,
  };
}
/** Resultado do último ataque do jogador a cada aldeia visível, para o ponto colorido do mapa. */
async function mapReports(
  tx: Transaction,
  village: Village,
  visible: PublicVillage[],
): Promise<MapReportDot[]> {
  if (!visible.length || !village.playerId) return [];
  const rows = await tx
    .selectDistinctOn([battleReports.toVillageId], {
      villageId: battleReports.toVillageId,
      reportId: battleReports.id,
      result: battleReports.result,
    })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(
      and(
        eq(battleReports.worldId, village.worldId),
        eq(battleReportRecipients.playerId, village.playerId),
        eq(battleReportRecipients.role, 'attacker'),
        isNull(battleReportRecipients.deletedAt),
        inArray(
          battleReports.toVillageId,
          visible.map((row) => row.id),
        ),
      ),
    )
    .orderBy(battleReports.toVillageId, desc(battleReports.occurredAt), desc(battleReports.id));
  return rows.map(({ villageId, reportId, result }) => {
    const lost = Object.values(result.attackerLosses).reduce((a, b) => a + b, 0);
    const dot =
      result.winner === 'defender'
        ? 'red'
        : result.winner === 'attacker' && lost === 0
          ? 'green'
          : 'yellow';
    return { villageId, reportId, dot } as MapReportDot;
  });
}
/** Ordens de tropas pendentes que aparecem como ícones sobre as aldeias visíveis. */
async function mapCommands(
  tx: Transaction,
  village: Village,
  visible: PublicVillage[],
): Promise<MapCommand[]> {
  if (!visible.length || !village.playerId) return [];
  const ids = visible.map((row) => row.id);
  const mine = visible.filter((row) => row.own).map((row) => row.id);
  const pending = await tx
    .select({
      kind: troopMovements.kind,
      from: troopMovements.fromVillageId,
      to: troopMovements.toVillageId,
      owner: troopMovements.ownerPlayerId,
    })
    .from(troopMovements)
    .where(
      and(
        eq(troopMovements.worldId, village.worldId),
        isNull(troopMovements.arrivedAt),
        or(
          and(
            eq(troopMovements.ownerPlayerId, village.playerId),
            or(
              inArray(troopMovements.toVillageId, ids),
              inArray(troopMovements.fromVillageId, ids),
            ),
          ),
          mine.length
            ? and(eq(troopMovements.kind, 'attack'), inArray(troopMovements.toVillageId, mine))
            : undefined,
        ),
      ),
    );
  const grouped = new Map<string, MapCommand>();
  for (const row of pending) {
    const incoming = row.owner !== village.playerId;
    // ordens suas aparecem no destino; o retorno aparece na aldeia de onde as tropas voltam
    const villageId = !incoming && row.kind === 'return' ? row.from : row.to;
    if (!ids.includes(villageId)) continue;
    const key = `${villageId}|${row.kind}|${incoming}`;
    const found = grouped.get(key);
    if (found) found.count += 1;
    else grouped.set(key, { villageId, kind: row.kind, incoming, count: 1 });
  }
  return [...grouped.values()];
}
function requirePlace(village: Village) {
  if (village.buildings.place < 1) throw new GameError('Praça de reunião não construída.');
}
function checkedTroops(input: TroopCounts): Troops {
  if (Object.keys(input).some((code) => !unitCodes.includes(code as UnitCode)))
    throw new GameError('Unidade inválida.');
  const troops = emptyTroops();
  for (const code of unitCodes) {
    const quantity = input[code] ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647)
      throw new GameError('Quantidade de tropas inválida.');
    troops[code] = quantity;
  }
  if (!unitCodes.some((code) => troops[code] > 0))
    throw new GameError('Selecione pelo menos uma unidade.');
  return troops;
}
async function stationedTroops(
  tx: Transaction,
  originId: number,
  locationId: number,
): Promise<Troops> {
  const rows = await tx
    .select()
    .from(unitPlacements)
    .where(
      and(
        eq(unitPlacements.originVillageId, originId),
        eq(unitPlacements.locationVillageId, locationId),
      ),
    );
  const troops = emptyTroops();
  for (const row of rows) troops[row.unitCode as UnitCode] = row.quantity;
  return troops;
}
async function validateSupport(
  tx: Transaction,
  village: Village,
  targetId: number,
  input: TroopCounts,
) {
  requirePlace(village);
  const [target] = await tx
    .select()
    .from(villages)
    .where(and(eq(villages.id, targetId), eq(villages.worldId, village.worldId)));
  if (!target) throw new GameError('Aldeia não encontrada.', 404);
  if (target.playerId === village.playerId)
    throw new GameError('Não é possível enviar comandos para suas próprias aldeias.');
  const troops = checkedTroops(input),
    home = await stationedTroops(tx, village.id, village.id);
  if (unitCodes.some((code) => troops[code] > home[code]))
    throw new GameError('Tropas próprias insuficientes na aldeia.');
  return { target, troops };
}
export async function previewSupport(
  tx: Transaction,
  village: Village,
  world: World,
  x: number,
  y: number,
  input: TroopCounts,
  now: Date,
  kind: 'support' | 'attack' = 'support',
  building?: string,
): Promise<SupportPreview> {
  const known = await publicVillages(tx, village, { x, y }),
    target = known.find((row) => row.x === x && row.y === y);
  if (!target) throw new GameError('Aldeia não encontrada.', 404);
  const { troops } = await validateSupport(tx, village, target.id, input);
  const conditions =
    kind === 'attack'
      ? await attackConditions(
          tx,
          village,
          (await tx.select().from(villages).where(eq(villages.id, target.id)))[0]!,
          now,
        )
      : null;
  const targetBuilding = kind === 'attack' ? checkedTarget(troops, building) : null;
  const durationSeconds = troopDuration(village, target, troops, world.buildSpeed, world.unitSpeed);
  const sent = unitCodes.filter((code) => troops[code] > 0);
  const slowestCode = sent.reduce((a, b) => (movementSpeeds[b] > movementSpeeds[a] ? b : a));
  const home = await stationedTroops(tx, village.id, village.id);
  const arrives = now.getTime() + durationSeconds * 1000;
  return {
    kind,
    morale: conditions?.morale ?? null,
    targetBuilding,
    target,
    troops,
    durationSeconds,
    arrivesAt: new Date(arrives).toISOString(),
    origin: { id: village.id, name: village.name, x: village.x, y: village.y },
    distance: Math.round(Math.hypot(target.x - village.x, target.y - village.y) * 100) / 100,
    departsAt: now.toISOString(),
    // Em ataques a volta leva o mesmo tempo, se todas as unidades sobreviverem.
    returnsAt: kind === 'attack' ? new Date(arrives + durationSeconds * 1000).toISOString() : null,
    speeds: { world: world.buildSpeed, units: world.unitSpeed },
    slowest: { code: slowestCode, name: units[slowestCode].name },
    population: sent.reduce((sum, code) => sum + troops[code] * units[code].population, 0),
    carry:
      kind === 'attack'
        ? unitCodes.reduce((sum, code) => sum + troops[code] * combatStats[code].carry, 0)
        : null,
    remaining: Object.fromEntries(
      unitCodes.map((code) => [code, Math.max(0, home[code] - troops[code])]),
    ) as TroopCounts,
  };
}
export async function settleTroopArrivals(
  tx: Transaction,
  world: World,
  now: Date,
  settle: SettleVillage,
): Promise<number> {
  const due = await tx
    .select({ id: troopMovements.id })
    .from(troopMovements)
    .where(
      and(
        eq(troopMovements.worldId, world.id),
        isNull(troopMovements.arrivedAt),
        lte(troopMovements.endsAt, now),
      ),
    )
    .orderBy(asc(troopMovements.endsAt), asc(troopMovements.id));
  for (const item of due) {
    const [movement] = await tx
      .select()
      .from(troopMovements)
      .where(and(eq(troopMovements.id, item.id), isNull(troopMovements.arrivedAt)));
    if (!movement) continue;
    if (movement.kind === 'attack') {
      await resolveAttack(tx, world, movement, settle);
      continue;
    }
    if (!movement.originLost) {
      const [raw] = await tx.select().from(villages).where(eq(villages.id, movement.toVillageId));
      const recipient = await settle(tx, raw!, world, movement.endsAt);
      await placeTroops(
        tx,
        world.id,
        movement.originVillageId,
        movement.toVillageId,
        movement.troops,
      );
      if (movement.kind === 'return')
        await tx
          .update(villages)
          .set(
            Object.fromEntries(
              resourceCodes.map((c) => [
                c,
                Math.min(capacity(recipient.buildings), recipient[c] + movement.loot[c]),
              ]),
            ),
          )
          .where(eq(villages.id, recipient.id));
      if (movement.kind === 'support')
        await addNotices(
          tx,
          world.id,
          movement.fromVillageId,
          movement.toVillageId,
          { kind: 'support', troops: movement.troops },
          movement.endsAt,
        );
      await tx.insert(activity).values({
        worldId: world.id,
        villageId: recipient.id,
        message:
          movement.kind === 'support'
            ? 'Tropas de apoio chegaram à aldeia.'
            : 'As tropas retornaram à aldeia.',
        occurredAt: movement.endsAt,
      });
    }
    await tx
      .update(troopMovements)
      .set({ arrivedAt: movement.endsAt })
      .where(eq(troopMovements.id, movement.id));
  }
  return due.length;
}
export async function performRallyAction(
  tx: Transaction,
  village: Village,
  world: World,
  action: RallyAction,
  requestId: string,
  now: Date,
): Promise<void> {
  requirePlace(village);
  const normalized =
    action.type === 'support' || action.type === 'attack'
      ? { ...action, troops: checkedTroops(action.troops) }
      : action;
  const fingerprint = JSON.stringify(normalized);
  const [previous] = await tx
    .select()
    .from(troopOperations)
    .where(
      and(eq(troopOperations.villageId, village.id), eq(troopOperations.requestId, requestId)),
    );
  if (previous) {
    if (previous.fingerprint !== fingerprint)
      throw new GameError('Esta solicitação já foi usada para outro comando.', 409);
    return;
  }
  if (village.playerId === null) throw new GameError('Aldeia sem proprietário.', 403);
  if (normalized.type === 'cancel') {
    const [movement] = await tx
      .select()
      .from(troopMovements)
      .where(
        and(
          eq(troopMovements.id, normalized.movementId),
          eq(troopMovements.originVillageId, village.id),
          eq(troopMovements.ownerPlayerId, village.playerId),
          eq(troopMovements.originLost, false),
          isNull(troopMovements.arrivedAt),
        ),
      );
    if (!movement || movement.kind === 'return')
      throw new GameError('Comando não encontrado ou já concluído.', 404);
    if (
      now.getTime() > movement.startsAt.getTime() + combatRules.cancelSeconds * 1000 ||
      now >= movement.endsAt
    )
      throw new GameError('O prazo para cancelar este comando terminou.');
    await tx
      .update(troopMovements)
      .set({ arrivedAt: now })
      .where(eq(troopMovements.id, movement.id));
    await tx.insert(troopMovements).values({
      worldId: world.id,
      ownerPlayerId: village.playerId,
      originVillageId: village.id,
      fromVillageId: movement.toVillageId,
      toVillageId: village.id,
      kind: 'return',
      troops: movement.troops,
      startsAt: now,
      endsAt: new Date(now.getTime() + Math.max(1000, now.getTime() - movement.startsAt.getTime())),
    });
    await tx
      .insert(troopOperations)
      .values({ worldId: world.id, villageId: village.id, requestId, fingerprint });
    return;
  }
  let from: Village, to: Village, troops: Troops;
  if (normalized.type === 'support' || normalized.type === 'attack') {
    const validated = await validateSupport(tx, village, normalized.targetId, normalized.troops);
    from = village;
    to = validated.target;
    troops = validated.troops;
  } else {
    if (normalized.locationId === village.id)
      throw new GameError('Estas tropas já estão na aldeia.');
    const [location] = await tx
      .select()
      .from(villages)
      .where(and(eq(villages.id, normalized.locationId), eq(villages.worldId, world.id)));
    if (!location) throw new GameError('Aldeia não encontrada.', 404);
    troops = checkedTroops(await stationedTroops(tx, village.id, location.id));
    from = location;
    to = village;
  }
  if (normalized.type === 'attack') {
    await attackConditions(tx, from, to, now);
    checkedTarget(troops, normalized.targetBuilding);
    if (to.playerId !== null)
      await tx
        .update(players)
        .set({ protectionUntil: now })
        .where(eq(players.id, village.playerId));
  }
  for (const code of unitCodes) {
    if (!troops[code]) continue;
    await tx
      .update(unitPlacements)
      .set({ quantity: sql`${unitPlacements.quantity} - ${troops[code]}` })
      .where(
        and(
          eq(unitPlacements.originVillageId, village.id),
          eq(unitPlacements.locationVillageId, from.id),
          eq(unitPlacements.unitCode, code),
        ),
      );
  }
  const durationSeconds = troopDuration(from, to, troops, world.buildSpeed, world.unitSpeed);
  await tx.insert(troopMovements).values({
    worldId: world.id,
    originVillageId: village.id,
    fromVillageId: from.id,
    toVillageId: to.id,
    kind:
      normalized.type === 'attack'
        ? 'attack'
        : normalized.type === 'support'
          ? 'support'
          : 'return',
    ownerPlayerId: village.playerId,
    targetBuilding:
      normalized.type === 'attack' ? checkedTarget(troops, normalized.targetBuilding) : null,
    troops,
    startsAt: now,
    endsAt: new Date(now.getTime() + durationSeconds * 1000),
  });
  await tx
    .insert(troopOperations)
    .values({ worldId: world.id, villageId: village.id, requestId, fingerprint });
}
export async function rallyView(
  tx: Transaction,
  village: Village,
  now: Date,
): Promise<RallySnapshot> {
  requirePlace(village);
  const placements = await tx
    .select()
    .from(unitPlacements)
    .where(
      or(
        eq(unitPlacements.originVillageId, village.id),
        eq(unitPlacements.locationVillageId, village.id),
      ),
    );
  const home = emptyTroops(),
    guests = emptyTroops(),
    elsewhere = new Map<number, Troops>();
  for (const row of placements) {
    const code = row.unitCode as UnitCode;
    if (row.locationVillageId === village.id) {
      (row.originVillageId === village.id ? home : guests)[code] += row.quantity;
    } else if (row.quantity > 0) {
      const counts = elsewhere.get(row.locationVillageId) ?? emptyTroops();
      counts[code] += row.quantity;
      elsewhere.set(row.locationVillageId, counts);
    }
  }
  const movements = await tx
    .select()
    .from(troopMovements)
    .where(
      and(
        eq(troopMovements.worldId, village.worldId),
        isNull(troopMovements.arrivedAt),
        or(
          eq(troopMovements.originVillageId, village.id),
          eq(troopMovements.toVillageId, village.id),
          eq(troopMovements.fromVillageId, village.id),
        ),
      ),
    )
    .orderBy(asc(troopMovements.endsAt), asc(troopMovements.id));
  const villageIds = [
    ...new Set([
      village.id,
      ...placements.flatMap((row) => [row.originVillageId, row.locationVillageId]),
      ...movements.flatMap((row) => [row.originVillageId, row.fromVillageId, row.toVillageId]),
    ]),
  ];
  const known = new Map(
    (await publicVillages(tx, village, undefined, villageIds)).map((row) => [row.id, row]),
  );
  return {
    catapultTargets: catapultTargets.map((code) => ({ code, name: buildings[code].name })),
    serverTime: now.toISOString(),
    unitTypes: unitCodes.map((code) => ({ code, name: units[code].name })),
    home,
    guests,
    stationed: [...elsewhere].map(([id, troops]) => ({ location: known.get(id)!, troops })),
    movements: movements.map((row) => ({
      id: row.id,
      kind: row.kind,
      origin: known.get(row.originVillageId)!,
      from: known.get(row.fromVillageId)!,
      to: known.get(row.toVillageId)!,
      troops: row.kind === 'attack' && row.ownerPlayerId !== village.playerId ? {} : row.troops,
      cancelUntil:
        row.ownerPlayerId === village.playerId &&
        !row.originLost &&
        row.kind !== 'return' &&
        now < row.endsAt &&
        now.getTime() <= row.startsAt.getTime() + combatRules.cancelSeconds * 1000
          ? new Date(
              Math.min(
                row.endsAt.getTime(),
                row.startsAt.getTime() + combatRules.cancelSeconds * 1000,
              ),
            ).toISOString()
          : null,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
    })),
  };
}

export async function readRally(accountId: number, worldId: number, villageId: number) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    return rallyView(tx, await settleVillage(tx, owned, world, now), now);
  });
}

export async function previewRallySupport(
  accountId: number,
  worldId: number,
  villageId: number,
  x: number,
  y: number,
  troops: TroopCounts,
  kind: 'support' | 'attack' = 'support',
  targetBuilding?: string,
) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    return previewSupport(
      tx,
      await settleVillage(tx, owned, world, now),
      world,
      x,
      y,
      troops,
      now,
      kind,
      targetBuilding,
    );
  });
}

export async function mutateRally(
  accountId: number,
  worldId: number,
  villageId: number,
  action: RallyAction,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      owned = await ownedVillage(tx, accountId, worldId, villageId),
      now = new Date();
    const village = await settleVillage(tx, owned, world, now);
    await performRallyAction(tx, village, world, action, requestId, now);
    return rallyView(tx, village, now);
  });
}
