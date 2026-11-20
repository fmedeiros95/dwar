import { asc, desc, eq, sql } from 'drizzle-orm';
import { db, accounts, players, villages, type Transaction } from '@dwar/database';
import { militaryRank } from '@dwar/game-core';
import type { RankingEntry, RankingPage } from '@dwar/api-client';
import { lockWorld, ownedVillage } from './village-engine.js';
import { GameError } from './errors.js';

const pageSize = 20;

async function standings(tx: Transaction, worldId: number) {
  return tx
    .select({
      id: players.id,
      username: accounts.username,
      points: sql<number>`coalesce(sum(${villages.points}),0)::integer`,
      villageCount: sql<number>`count(${villages.id})::integer`,
      joinedAt: players.createdAt,
    })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .leftJoin(villages, eq(villages.playerId, players.id))
    .where(eq(players.worldId, worldId))
    .groupBy(players.id, accounts.username, players.createdAt)
    .orderBy(
      desc(sql`coalesce(sum(${villages.points}),0)`),
      asc(players.createdAt),
      asc(players.id),
    );
}

function entry(
  row: Awaited<ReturnType<typeof standings>>[number],
  rank: number,
  own: boolean,
): RankingEntry {
  const { tier, title } = militaryRank(row.points);
  return {
    rank,
    id: row.id,
    username: row.username,
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
  options: { page?: number; search?: string },
): Promise<RankingPage> {
  const all = await standings(tx, worldId);
  const ownIndex = all.findIndex((row) => row.id === ownId);
  const ownPage = ownIndex >= 0 ? Math.floor(ownIndex / pageSize) + 1 : 1;
  const search = options.search?.trim() ?? '';
  if (search) {
    if (search.replaceAll(' ', '').length <= 2)
      throw new GameError('Digite pelo menos 3 caracteres para buscar.');
    const needle = search.toLowerCase();
    const matches = all
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.username.toLowerCase().includes(needle));
    return {
      mode: 'search',
      page: 1,
      pageCount: 1,
      ownPage,
      total: matches.length,
      entries: matches.map(({ row, index }) => entry(row, index + 1, row.id === ownId)),
    };
  }
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.max(1, Math.min(pageCount, options.page ?? ownPage));
  const slice = all.slice((page - 1) * pageSize, page * pageSize);
  return {
    mode: 'list',
    page,
    pageCount,
    ownPage,
    total: all.length,
    entries: slice.map((row, index) =>
      entry(row, (page - 1) * pageSize + index + 1, row.id === ownId),
    ),
  };
}

export async function readRanking(
  accountId: number,
  worldId: number,
  options: { page?: number; search?: string },
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return rankingPage(tx, worldId, village.playerId, options);
  });
}
