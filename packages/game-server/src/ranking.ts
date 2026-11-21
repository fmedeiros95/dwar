import { asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db, accounts, players, villages, type Transaction } from '@dwar/database';
import { militaryRank } from '@dwar/game-core';
import type {
  RankingBoard,
  RankingEntry,
  RankingKillType,
  RankingPage,
  TribeRankingEntry,
  TribeRankingMetric,
  TribeRankingPage,
  TribeRef,
} from '@dwar/api-client';
import { tribesOf } from './tribe-lookup.js';
import { lockWorld, ownedVillage } from './village-engine.js';
import { medalMetrics, stagesOf, totalStages } from './medals.js';
import { GameError } from './errors.js';

const pageSize = 20;

/** Continente de uma coordenada (K54 = linha 5, coluna 4), igual ao mostrado no mapa. */
export const continentOf = (x: number, y: number) => Math.floor(y / 100) * 10 + Math.floor(x / 100);
const continentSql = sql`(floor(${villages.y} / 100)::integer * 10 + floor(${villages.x} / 100)::integer)`;

export type RankingOptions = {
  page?: number;
  search?: string;
  board?: RankingBoard;
  type?: RankingKillType;
  continent?: number;
};

const killsOf: Record<RankingKillType, SQL<number>> = {
  att: sql<number>`${players.unitsKilledAttack}::double precision`,
  def: sql<number>`${players.unitsKilledDefense}::double precision`,
  all: sql<number>`(${players.unitsKilledAttack} + ${players.unitsKilledDefense})::double precision`,
};

type Standing = {
  id: number;
  username: string;
  points: number;
  villageCount: number;
  joinedAt: Date;
};

/** Classificação completa de um painel; a posição de cada jogador é o índice + 1. */
async function standings(
  tx: Transaction,
  worldId: number,
  board: RankingBoard,
  type: RankingKillType,
  continent: number,
): Promise<Standing[]> {
  if (board === 'medals') {
    // Total de níveis de medalha (como no Speed Wars): cada nível conquistado vale 1 ponto.
    const base = await standings(tx, worldId, 'player', type, continent);
    const metrics = await medalMetrics(tx, worldId);
    return base
      .map((row) => ({
        ...row,
        points: totalStages(stagesOf(metrics.get(row.id)!)),
      }))
      .sort(
        (a, b) => b.points - a.points || a.joinedAt.getTime() - b.joinedAt.getTime() || a.id - b.id,
      );
  }
  const select = {
    id: players.id,
    username: accounts.username,
    villageCount: sql<number>`count(${villages.id})::integer`,
    joinedAt: players.createdAt,
  };
  if (board === 'kills') {
    const value = killsOf[type];
    return tx
      .select({ ...select, points: sql<number>`${value}` })
      .from(players)
      .innerJoin(accounts, eq(accounts.id, players.accountId))
      .leftJoin(villages, eq(villages.playerId, players.id))
      .where(eq(players.worldId, worldId))
      .groupBy(players.id, accounts.username, players.createdAt)
      .orderBy(desc(value), asc(players.createdAt), asc(players.id));
  }
  const points = sql<number>`coalesce(sum(${villages.points}),0)::integer`;
  if (board === 'continent')
    return tx
      .select({ ...select, points })
      .from(players)
      .innerJoin(accounts, eq(accounts.id, players.accountId))
      .innerJoin(villages, eq(villages.playerId, players.id))
      .where(sql`${players.worldId} = ${worldId} AND ${continentSql} = ${continent}`)
      .groupBy(players.id, accounts.username, players.createdAt)
      .orderBy(desc(points), asc(players.createdAt), asc(players.id));
  return tx
    .select({ ...select, points })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .leftJoin(villages, eq(villages.playerId, players.id))
    .where(eq(players.worldId, worldId))
    .groupBy(players.id, accounts.username, players.createdAt)
    .orderBy(desc(points), asc(players.createdAt), asc(players.id));
}

function entry(
  row: Standing,
  rank: number,
  own: boolean,
  board: RankingBoard,
  tribe: TribeRef | null,
): RankingEntry {
  // A patente vem dos pontos do jogador; nos outros painéis o número é outra medida.
  const { tier, title } = board === 'player' ? militaryRank(row.points) : militaryRank(0);
  return {
    rank,
    id: row.id,
    username: row.username,
    tribe,
    points: row.points,
    villageCount: row.villageCount,
    joinedAt: row.joinedAt.toISOString(),
    own,
    rankTier: tier,
    rankTitle: title,
  };
}

export async function rankingPage(
  tx: Transaction,
  worldId: number,
  ownId: number,
  options: RankingOptions,
  ownContinent = 0,
): Promise<RankingPage> {
  const board = options.board ?? 'player',
    type = options.type ?? 'att',
    continent = options.continent ?? ownContinent;
  if (!Number.isInteger(continent) || continent < 0 || continent > 99)
    throw new GameError('Continente inválido.');
  const all = await standings(tx, worldId, board, type, continent);
  const tribes = await tribesOf(
    tx,
    all.map((row) => row.id),
  );
  const ownIndex = all.findIndex((row) => row.id === ownId);
  const ownPage = ownIndex >= 0 ? Math.floor(ownIndex / pageSize) + 1 : 1;
  const context = { board, type, continent };
  const search = options.search?.trim() ?? '';
  if (search) {
    if (search.replaceAll(' ', '').length <= 2)
      throw new GameError('Digite pelo menos 3 caracteres para buscar.');
    const needle = search.toLowerCase();
    const matches = all
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.username.toLowerCase().includes(needle));
    return {
      ...context,
      mode: 'search',
      page: 1,
      pageCount: 1,
      ownPage,
      total: matches.length,
      entries: matches.map(({ row, index }) =>
        entry(row, index + 1, row.id === ownId, board, tribes.get(row.id) ?? null),
      ),
    };
  }
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.max(1, Math.min(pageCount, options.page ?? ownPage));
  const slice = all.slice((page - 1) * pageSize, page * pageSize);
  return {
    ...context,
    mode: 'list',
    page,
    pageCount,
    ownPage,
    total: all.length,
    entries: slice.map((row, index) =>
      entry(
        row,
        (page - 1) * pageSize + index + 1,
        row.id === ownId,
        board,
        tribes.get(row.id) ?? null,
      ),
    ),
  };
}

const tribePageSize = 20;

/** Ranking de tribos: soma dos pontos dos membros ou das unidades derrotadas por eles. */
export async function tribeRankingPage(
  tx: Transaction,
  worldId: number,
  ownTribeId: number | null,
  options: { page?: number; search?: string; metric?: TribeRankingMetric },
): Promise<TribeRankingPage> {
  const metric = options.metric ?? 'points';
  const rows = (
    await tx.execute(sql`
      SELECT t.id AS id, t.name AS name, t.tag AS tag, t.created_at AS created_at,
        (SELECT count(*) FROM tribe_members m WHERE m.tribe_id = t.id)::integer AS members,
        (SELECT count(*) FROM villages v JOIN tribe_members m ON m.player_id = v.player_id
          WHERE m.tribe_id = t.id)::integer AS villages,
        (SELECT coalesce(sum(v.points), 0) FROM villages v JOIN tribe_members m ON m.player_id = v.player_id
          WHERE m.tribe_id = t.id)::integer AS points,
        (SELECT coalesce(sum(p.units_killed_attack), 0) FROM players p JOIN tribe_members m ON m.player_id = p.id
          WHERE m.tribe_id = t.id)::double precision AS att,
        (SELECT coalesce(sum(p.units_killed_defense), 0) FROM players p JOIN tribe_members m ON m.player_id = p.id
          WHERE m.tribe_id = t.id)::double precision AS def
      FROM tribes t WHERE t.world_id = ${worldId}`)
  ).rows as {
    id: number;
    name: string;
    tag: string;
    created_at: Date;
    members: number;
    villages: number;
    points: number;
    att: number;
    def: number;
  }[];
  const valueOf = (row: (typeof rows)[number]) =>
    metric === 'points'
      ? row.points
      : metric === 'att'
        ? row.att
        : metric === 'def'
          ? row.def
          : row.att + row.def;
  const ordered = rows
    .map((row) => ({ row, value: valueOf(row) }))
    .sort(
      (a, b) =>
        b.value - a.value ||
        new Date(a.row.created_at).getTime() - new Date(b.row.created_at).getTime() ||
        a.row.id - b.row.id,
    )
    .map(({ row, value }, index): TribeRankingEntry => ({
      rank: index + 1,
      id: row.id,
      name: row.name,
      tag: row.tag,
      value,
      members: row.members,
      villages: row.villages,
      own: row.id === ownTribeId,
    }));
  const ownIndex = ordered.findIndex((entry) => entry.own);
  const ownPage = ownIndex >= 0 ? Math.floor(ownIndex / tribePageSize) + 1 : 1;
  const search = options.search?.trim().toLowerCase() ?? '';
  if (search) {
    if (search.length < 2) throw new GameError('Digite pelo menos 2 caracteres para buscar.');
    const matches = ordered.filter(
      (entry) =>
        entry.name.toLowerCase().includes(search) || entry.tag.toLowerCase().includes(search),
    );
    return {
      metric,
      mode: 'search',
      page: 1,
      pageCount: 1,
      ownPage,
      total: matches.length,
      entries: matches,
    };
  }
  const pageCount = Math.max(1, Math.ceil(ordered.length / tribePageSize));
  const page = Math.max(1, Math.min(pageCount, options.page ?? ownPage));
  return {
    metric,
    mode: 'list',
    page,
    pageCount,
    ownPage,
    total: ordered.length,
    entries: ordered.slice((page - 1) * tribePageSize, page * tribePageSize),
  };
}

export async function readTribeRanking(
  accountId: number,
  worldId: number,
  options: { page?: number; search?: string; metric?: TribeRankingMetric },
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    const own = (await tribesOf(tx, [village.playerId])).get(village.playerId);
    return tribeRankingPage(tx, worldId, own?.id ?? null, options);
  });
}

export async function readRanking(accountId: number, worldId: number, options: RankingOptions) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return rankingPage(tx, worldId, village.playerId, options, continentOf(village.x, village.y));
  });
}
