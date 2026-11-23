import { randomInt } from 'node:crypto';
import { and, desc, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  accounts,
  activity,
  caravanCarts,
  caravans,
  db,
  players,
  sessions,
  villages,
  type Transaction,
} from '@dwar/database';
import type {
  CaravanAction,
  CaravanMemory,
  CaravanOverview,
  CaravanSide,
  CaravanView,
  MapCaravan,
} from '@dwar/api-client';
import type { Resources } from '@dwar/game-config';
import {
  capacity,
  caravanAbsentChoice,
  caravanCargo,
  caravanDefault,
  caravanRules,
  caravanSplit,
  caravanSplitError,
  caravanUnload,
  lotTotal,
  otherLot,
  resourceCodes,
  type CaravanLot,
} from '@dwar/game-core';
import { GameError } from './errors.js';
import { memberPlayer } from './member.js';
import { tribesOf } from './tribe-lookup.js';
import { lockWorld, settleVillage, type VillageRow, type WorldRow } from './village-engine.js';

type Caravan = typeof caravans.$inferSelect;
const hour = 3_600_000;
const absentOf = (row: Caravan) =>
  row.dividedByAbsence
    ? row.chosenByAbsence
      ? 'both'
      : 'divider'
    : row.chosenByAbsence
      ? 'chooser'
      : null;
const lotName = { sun: 'do Sol', moon: 'da Lua' } as const;

/** Encerra a partilha e deixa cada carroça no portão da sua aldeia, uma única vez. */
async function deliver(
  tx: Transaction,
  caravan: Caravan & { sun: Resources },
  chosen: CaravanLot,
  byAbsence: boolean,
  now: Date,
) {
  const lots = caravanSplit(caravan.cargo, caravan.sun);
  await tx
    .update(caravans)
    .set({ chosen, chosenByAbsence: byAbsence, resolvedAt: now })
    .where(and(eq(caravans.id, caravan.id), isNull(caravans.resolvedAt)));
  const owners = [
    { villageId: caravan.chooserVillageId, lot: chosen },
    { villageId: caravan.dividerVillageId, lot: otherLot(chosen) },
  ];
  await tx.insert(caravanCarts).values(
    owners.map(({ villageId, lot }) => ({
      caravanId: caravan.id,
      worldId: caravan.worldId,
      villageId,
      lot,
      load: lots[lot],
      left: lots[lot],
    })),
  );
  await tx.insert(activity).values(
    owners.map(({ villageId, lot }) => ({
      worldId: caravan.worldId,
      villageId,
      message: `A carroça ${lotName[lot]} chegou ao portão da aldeia.`,
      occurredAt: now,
    })),
  );
}

/** Aplica o desfecho de quem perdeu o prazo. Roda no worker e antes de qualquer leitura ou ação. */
export async function settleCaravans(tx: Transaction, worldId: number, now: Date) {
  const open = await tx
    .select()
    .from(caravans)
    .where(and(eq(caravans.worldId, worldId), isNull(caravans.resolvedAt)));
  let settled = 0;
  for (const caravan of open) {
    if (!caravan.sun) {
      if (caravan.divideBy > now) continue;
      // Quem divide não veio: o caravaneiro carrega as carroças e o vizinho escolhe normalmente.
      await tx
        .update(caravans)
        .set({
          sun: caravanDefault(caravan.cargo),
          dividedByAbsence: true,
          chooseBy: new Date(now.getTime() + caravanRules.chooseHours * hour),
        })
        .where(eq(caravans.id, caravan.id));
      settled += 1;
    } else if (caravan.chooseBy! <= now) {
      await deliver(
        tx,
        { ...caravan, sun: caravan.sun },
        caravanAbsentChoice(caravanSplit(caravan.cargo, caravan.sun), caravan.banner),
        true,
        now,
      );
      settled += 1;
    }
  }
  return settled;
}

/** Um campo livre perto do meio do caminho entre as duas aldeias. */
async function crossroads(tx: Transaction, worldId: number, a: VillageRow, b: VillageRow) {
  const cx = Math.round((a.x + b.x) / 2);
  const cy = Math.round((a.y + b.y) / 2);
  const taken = new Set(
    (
      await tx
        .select({ x: villages.x, y: villages.y })
        .from(villages)
        .where(eq(villages.worldId, worldId))
    ).map((row) => `${row.x}|${row.y}`),
  );
  const open = await tx
    .select({ x: caravans.x, y: caravans.y })
    .from(caravans)
    .where(and(eq(caravans.worldId, worldId), isNull(caravans.resolvedAt)));
  for (const row of open) taken.add(`${row.x}|${row.y}`);
  for (let radius = 0; radius < 12; radius++)
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const [x, y] = [cx + dx, cy + dy];
        if (x >= 0 && y >= 0 && x <= 999 && y <= 999 && !taken.has(`${x}|${y}`)) return { x, y };
      }
  return null;
}

/** Papéis alternados: quem escolheu da última vez agora divide; sem passado, quem menos dividiu. */
async function dividerOf(tx: Transaction, a: VillageRow, b: VillageRow) {
  const [pa, pb] = [a.playerId!, b.playerId!];
  const past = await tx
    .select()
    .from(caravans)
    .where(
      or(
        and(eq(caravans.dividerPlayerId, pa), eq(caravans.chooserPlayerId, pb)),
        and(eq(caravans.dividerPlayerId, pb), eq(caravans.chooserPlayerId, pa)),
      ),
    )
    .orderBy(desc(caravans.id))
    .limit(1);
  if (past[0]) return past[0].chooserPlayerId === pa ? a : b;
  const counts = await tx
    .select({ id: caravans.dividerPlayerId, n: sql<number>`count(*)::integer` })
    .from(caravans)
    .where(inArray(caravans.dividerPlayerId, [pa, pb]))
    .groupBy(caravans.dividerPlayerId);
  const of = (id: number) => counts.find((row) => row.id === id)?.n ?? 0;
  if (of(pa) !== of(pb)) return of(pa) < of(pb) ? a : b;
  return pa < pb ? a : b;
}

async function open(tx: Transaction, world: WorldRow, a: VillageRow, b: VillageRow, now: Date) {
  const place = await crossroads(tx, world.id, a, b);
  if (!place) return null;
  const divider = await dividerOf(tx, a, b);
  const chooser = divider === a ? b : a;
  const [created] = await tx
    .insert(caravans)
    .values({
      worldId: world.id,
      ...place,
      dividerVillageId: divider.id,
      chooserVillageId: chooser.id,
      dividerPlayerId: divider.playerId!,
      chooserPlayerId: chooser.playerId!,
      cargo: caravanCargo(
        capacity(a.buildings),
        capacity(b.buildings),
        () => randomInt(0, 1_000_000) / 1_000_000,
      ),
      createdAt: now,
      divideBy: new Date(now.getTime() + caravanRules.divideHours * hour),
    })
    .returning();
  await tx.insert(activity).values(
    [a, b].map((village) => ({
      worldId: world.id,
      villageId: village.id,
      message: `Uma caravana parou na fronteira, em ${place.x}|${place.y}.`,
      occurredAt: now,
    })),
  );
  return created!;
}

/**
 * Chegada de caravanas. Participa quem tem sessão válida, descansou desde a última partilha e não
 * deixou carroça no portão. Forma pares do mais próximo ao mais distante; entre vizinhos parecidos,
 * quem se encontrou há mais tempo tem preferência.
 */
export async function spawnCaravans(tx: Transaction, world: WorldRow, now: Date) {
  const rested = new Date(now.getTime() - caravanRules.restHours * hour);
  const active = await tx
    .selectDistinct({ id: players.id })
    .from(players)
    .innerJoin(sessions, eq(sessions.accountId, players.accountId))
    .where(and(eq(players.worldId, world.id), gt(sessions.expiresAt, now)));
  const busy = await tx
    .select({ a: caravans.dividerPlayerId, b: caravans.chooserPlayerId })
    .from(caravans)
    .where(
      and(
        eq(caravans.worldId, world.id),
        or(isNull(caravans.resolvedAt), gt(caravans.resolvedAt, rested)),
      ),
    );
  const waiting = await tx
    .select({ player: villages.playerId })
    .from(caravanCarts)
    .innerJoin(villages, eq(villages.id, caravanCarts.villageId))
    .where(and(eq(caravanCarts.worldId, world.id), isNull(caravanCarts.emptiedAt)));
  const out = new Set([...busy.flatMap((row) => [row.a, row.b]), ...waiting.map((r) => r.player)]);
  const ready = active.map((row) => row.id).filter((id) => !out.has(id));
  if (ready.length < 2) return 0;
  const owned = await tx
    .select()
    .from(villages)
    .where(and(eq(villages.worldId, world.id), inArray(villages.playerId, ready)));
  const met = new Map<string, number>();
  for (const row of await tx
    .select({ a: caravans.dividerPlayerId, b: caravans.chooserPlayerId, at: caravans.createdAt })
    .from(caravans)
    .where(eq(caravans.worldId, world.id))) {
    const key = [row.a, row.b].sort((x, y) => x - y).join('|');
    met.set(key, Math.max(met.get(key) ?? 0, row.at.getTime()));
  }
  const pairs: { a: VillageRow; b: VillageRow; score: number }[] = [];
  for (let i = 0; i < owned.length; i++)
    for (let j = i + 1; j < owned.length; j++) {
      const [a, b] = [owned[i]!, owned[j]!];
      if (a.playerId === b.playerId) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > caravanRules.maxDistance) continue;
      const last = met.get([a.playerId!, b.playerId!].sort((x, y) => x - y).join('|')) ?? 0;
      // Cada encontro nos últimos dias afasta o par, para o jogador variar de vizinho.
      const recent = last ? Math.max(0, 6 - (now.getTime() - last) / (24 * hour)) : 0;
      pairs.push({ a, b, score: distance + recent });
    }
  pairs.sort((x, y) => x.score - y.score || x.a.id - y.a.id || x.b.id - y.b.id);
  const used = new Set<number>();
  let created = 0;
  for (const { a, b } of pairs) {
    if (used.has(a.playerId!) || used.has(b.playerId!)) continue;
    if (!(await open(tx, world, a, b, now))) continue;
    used.add(a.playerId!).add(b.playerId!);
    created += 1;
  }
  return created;
}

/** Faz uma caravana parar agora entre duas aldeias (ferramenta de testes e do administrador). */
export async function openCaravan(worldId: number, villageA: number, villageB: number) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const rows = await tx
      .select()
      .from(villages)
      .where(and(eq(villages.worldId, worldId), inArray(villages.id, [villageA, villageB])));
    const [a, b] = rows;
    if (!a || !b || a.playerId === null || b.playerId === null || a.playerId === b.playerId)
      throw new GameError('Escolha duas aldeias de jogadores diferentes.');
    return open(tx, world, a, b, new Date());
  });
}

const lastSpawn = new Map<number, number>();
/** Passo do worker: prazos a cada ciclo, novas chegadas uma vez por minuto. */
export async function processCaravans(tx: Transaction, world: WorldRow, now: Date) {
  const settled = await settleCaravans(tx, world.id, now);
  if (now.getTime() - (lastSpawn.get(world.id) ?? 0) < 60_000) return settled;
  lastSpawn.set(world.id, now.getTime());
  return settled + (await spawnCaravans(tx, world, now));
}

/** Caravanas paradas, para o mapa: todos veem onde estão e entre quem; o conteúdo é dos dois. */
export async function mapCaravans(
  tx: Transaction,
  worldId: number,
  playerId: number | null,
): Promise<MapCaravan[]> {
  const rows = await tx
    .select()
    .from(caravans)
    .where(and(eq(caravans.worldId, worldId), isNull(caravans.resolvedAt)));
  if (!rows.length) return [];
  const sides = await sidesOf(tx, rows);
  return rows.map((row) => {
    const divider = sides.get(row.dividerVillageId)!;
    const chooser = sides.get(row.chooserVillageId)!;
    const acting = row.sun ? chooser : divider;
    const mine = playerId !== null && [divider, chooser].some((s) => s.playerId === playerId);
    return {
      id: row.id,
      x: row.x,
      y: row.y,
      mine,
      yourTurn: mine && acting.playerId === playerId,
      between: [divider, chooser].map(({ name, x, y, villageId }) => ({ villageId, name, x, y })),
    };
  });
}

async function sidesOf(tx: Transaction, rows: Caravan[]): Promise<Map<number, CaravanSide>> {
  const ids = [...new Set(rows.flatMap((row) => [row.dividerVillageId, row.chooserVillageId]))];
  if (!ids.length) return new Map();
  const found = await tx
    .select({
      villageId: villages.id,
      name: villages.name,
      x: villages.x,
      y: villages.y,
      points: villages.points,
      playerId: villages.playerId,
      username: sql<string>`coalesce(${accounts.username}, 'Aldeia abandonada')`,
    })
    .from(villages)
    .leftJoin(players, eq(players.id, villages.playerId))
    .leftJoin(accounts, eq(accounts.id, players.accountId))
    .where(inArray(villages.id, ids));
  const tribes = await tribesOf(
    tx,
    found.flatMap((row) => (row.playerId === null ? [] : [row.playerId])),
  );
  return new Map(
    found.map((row) => [
      row.villageId,
      {
        ...row,
        tribe: row.playerId === null ? null : (tribes.get(row.playerId)?.tag ?? null),
      },
    ]),
  );
}

/** O que os dois já viveram: só o que ambos viram acontecer nas partilhas encerradas. */
async function memories(tx: Transaction, me: number, rival: number): Promise<CaravanMemory[]> {
  const rows = await tx
    .select()
    .from(caravans)
    .where(
      and(
        isNotNull(caravans.resolvedAt),
        or(
          and(eq(caravans.dividerPlayerId, me), eq(caravans.chooserPlayerId, rival)),
          and(eq(caravans.dividerPlayerId, rival), eq(caravans.chooserPlayerId, me)),
        ),
      ),
    )
    .orderBy(desc(caravans.id))
    .limit(3);
  return rows.map((row) => {
    const lots = caravanSplit(row.cargo, row.sun!);
    return {
      at: row.resolvedAt!.toISOString(),
      youDivided: row.dividerPlayerId === me,
      banner: row.banner,
      taken: lots[row.chosen!],
      left: lots[otherLot(row.chosen!)],
      absent: absentOf(row),
    };
  });
}

async function viewsOf(
  tx: Transaction,
  worldId: number,
  playerId: number,
  now: Date,
): Promise<CaravanView[]> {
  const own = (
    await tx
      .select({ id: villages.id })
      .from(villages)
      .where(and(eq(villages.worldId, worldId), eq(villages.playerId, playerId)))
  ).map((row) => row.id);
  if (!own.length) return [];
  const rows = await tx
    .select()
    .from(caravans)
    .where(
      and(
        eq(caravans.worldId, worldId),
        or(inArray(caravans.dividerVillageId, own), inArray(caravans.chooserVillageId, own)),
        or(
          isNull(caravans.resolvedAt),
          gt(caravans.resolvedAt, new Date(now.getTime() - 48 * hour)),
          sql`EXISTS (SELECT 1 FROM caravan_carts c WHERE c.caravan_id = ${caravans.id} AND c.emptied_at IS NULL AND c.village_id IN ${own})`,
        ),
      ),
    )
    .orderBy(desc(caravans.id))
    .limit(12);
  const sides = await sidesOf(tx, rows);
  const carts = rows.length
    ? await tx
        .select()
        .from(caravanCarts)
        .where(
          inArray(
            caravanCarts.caravanId,
            rows.map((row) => row.id),
          ),
        )
    : [];
  const result: CaravanView[] = [];
  for (const row of rows) {
    const role =
      own.includes(row.dividerVillageId) &&
      !(row.sun && own.includes(row.chooserVillageId) && !row.resolvedAt)
        ? 'divider'
        : 'chooser';
    const myVillage = role === 'divider' ? row.dividerVillageId : row.chooserVillageId;
    const me = sides.get(myVillage)!;
    const rival = sides.get(role === 'divider' ? row.chooserVillageId : row.dividerVillageId)!;
    const phase = row.resolvedAt ? 'delivered' : row.sun ? 'choosing' : 'dividing';
    const cart = carts.find((item) => item.caravanId === row.id && item.villageId === myVillage);
    result.push({
      id: row.id,
      x: row.x,
      y: row.y,
      phase,
      role,
      yourTurn:
        (phase === 'dividing' && role === 'divider') ||
        (phase === 'choosing' && role === 'chooser'),
      me,
      rival,
      cargo: row.cargo,
      banner: row.banner,
      sun: row.sun,
      lots: row.sun ? caravanSplit(row.cargo, row.sun) : null,
      chosen: row.chosen,
      mine: row.chosen ? (role === 'chooser' ? row.chosen : otherLot(row.chosen)) : null,
      absent: absentOf(row),
      deadline: (row.resolvedAt ?? (row.sun ? row.chooseBy! : row.divideBy)).toISOString(),
      cart: cart ? { load: cart.load, left: cart.left, empty: cart.emptiedAt !== null } : null,
      memories: rival.playerId === null ? [] : await memories(tx, playerId, rival.playerId),
    });
  }
  return result;
}

export async function readCaravans(accountId: number, worldId: number): Promise<CaravanOverview> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const now = new Date();
    const player = await memberPlayer(tx, accountId, worldId);
    await settleCaravans(tx, worldId, now);
    return {
      serverTime: now.toISOString(),
      caravans: await viewsOf(tx, worldId, player.id, now),
    };
  });
}

const same = (a: Resources, b: Resources) => resourceCodes.every((code) => a[code] === b[code]);

/**
 * Ações da partilha. Repetir a mesma confirmação não tem efeito nem erro; tentar mudar uma decisão
 * já tomada é recusado. Tudo roda sob a trava do mundo, então cada passo acontece uma vez.
 */
export async function mutateCaravan(
  accountId: number,
  worldId: number,
  caravanId: number,
  action: CaravanAction,
): Promise<CaravanOverview> {
  // O desfecho por ausência fica gravado mesmo que a ação atrasada seja recusada logo depois.
  await db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    await settleCaravans(tx, worldId, new Date());
  });
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const now = new Date();
    const player = await memberPlayer(tx, accountId, worldId);
    const [caravan] = await tx
      .select()
      .from(caravans)
      .where(and(eq(caravans.id, caravanId), eq(caravans.worldId, worldId)));
    if (!caravan) throw new GameError('Caravana não encontrada.', 404);
    const pair = await tx
      .select()
      .from(villages)
      .where(inArray(villages.id, [caravan.dividerVillageId, caravan.chooserVillageId]));
    const owns = (id: number) => pair.some((v) => v.id === id && v.playerId === player.id);
    const divides = owns(caravan.dividerVillageId);
    const chooses = owns(caravan.chooserVillageId);
    if (!divides && !chooses) throw new GameError('Esta caravana não é da sua fronteira.', 403);

    if (action.type === 'banner') {
      if (!chooses) throw new GameError('Só quem vai escolher hasteia a flâmula.', 403);
      if (caravan.sun)
        throw new GameError('A carga já foi dividida; a flâmula não muda mais.', 409);
      await tx.update(caravans).set({ banner: action.resource }).where(eq(caravans.id, caravan.id));
    } else if (action.type === 'divide') {
      if (!divides) throw new GameError('Nesta partilha, quem divide é o vizinho.', 403);
      if (caravan.sun) {
        if (!same(caravan.sun, action.sun))
          throw new GameError('A carga já foi dividida e selada.', 409);
      } else {
        const problem = caravanSplitError(caravan.cargo, action.sun);
        if (problem) throw new GameError(problem);
        await tx
          .update(caravans)
          .set({
            sun: action.sun,
            chooseBy: new Date(now.getTime() + caravanRules.chooseHours * hour),
          })
          .where(eq(caravans.id, caravan.id));
      }
    } else if (action.type === 'choose') {
      if (!chooses) throw new GameError('Nesta partilha, quem escolhe é o vizinho.', 403);
      if (!caravan.sun) throw new GameError('A carga ainda não foi dividida.', 409);
      if (caravan.chosen) {
        if (caravan.chosen !== action.lot)
          throw new GameError('A escolha desta caravana já foi feita.', 409);
      } else await deliver(tx, { ...caravan, sun: caravan.sun }, action.lot, false, now);
    } else {
      const ownIds = pair.filter((v) => v.playerId === player.id).map((v) => v.id);
      const waiting = await tx
        .select()
        .from(caravanCarts)
        .where(
          and(
            eq(caravanCarts.caravanId, caravan.id),
            inArray(caravanCarts.villageId, ownIds),
            isNull(caravanCarts.emptiedAt),
          ),
        );
      for (const cart of waiting) {
        const village = await settleVillage(
          tx,
          pair.find((v) => v.id === cart.villageId)!,
          world,
          now,
        );
        const { unloaded, left } = caravanUnload(village, cart.left, capacity(village.buildings));
        if (lotTotal(unloaded) === 0)
          throw new GameError('O armazém está cheio. Gaste recursos e descarregue de novo.');
        await tx
          .update(villages)
          .set({
            wood: village.wood + unloaded.wood,
            stone: village.stone + unloaded.stone,
            iron: village.iron + unloaded.iron,
          })
          .where(eq(villages.id, village.id));
        await tx
          .update(caravanCarts)
          .set({ left, emptiedAt: lotTotal(left) === 0 ? now : null })
          .where(and(eq(caravanCarts.caravanId, caravan.id), eq(caravanCarts.lot, cart.lot)));
        await tx.insert(activity).values({
          worldId,
          villageId: village.id,
          message: `Carroça ${lotName[cart.lot]} descarregada: ${unloaded.wood} de madeira, ${unloaded.stone} de argila e ${unloaded.iron} de ferro.`,
          occurredAt: now,
        });
      }
    }
    return {
      serverTime: now.toISOString(),
      caravans: await viewsOf(tx, worldId, player.id, now),
    };
  });
}
