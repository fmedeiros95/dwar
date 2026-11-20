import { and, desc, eq, or, sql } from 'drizzle-orm';
import {
  db,
  battleReports,
  battleReportRecipients,
  players,
  type Transaction,
} from '@dwar/database';
import { units, unitCodes } from '@dwar/game-config';
import type { ReportsSnapshot, BattleReportSummary, BattleReportView } from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, settleWorldEvents } from './village-engine.js';
export async function memberPlayer(tx: Transaction, accountId: number, worldId: number) {
  const [player] = await tx
    .select()
    .from(players)
    .where(and(eq(players.accountId, accountId), eq(players.worldId, worldId)));
  if (!player) throw new GameError('Entre neste mundo antes de consultar os relatórios.', 403);
  return player;
}
function summary(
  report: typeof battleReports.$inferSelect,
  access: typeof battleReportRecipients.$inferSelect,
): BattleReportSummary {
  return {
    id: report.id,
    title: `${report.result.from.name} ataca ${report.result.to.name}`,
    occurredAt: report.occurredAt.toISOString(),
    role: access.role,
    read: access.readAt !== null,
    winner: report.result.winner,
  };
}
export async function reportsView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  page: number,
  villageId?: number,
): Promise<ReportsSnapshot> {
  if (!Number.isInteger(page) || page < 1) throw new GameError('Página inválida.');
  const filter = and(
    eq(battleReportRecipients.playerId, playerId),
    eq(battleReports.worldId, worldId),
    villageId
      ? or(eq(battleReports.fromVillageId, villageId), eq(battleReports.toVillageId, villageId))
      : undefined,
  );
  const [counts] = await tx
    .select({
      total: sql<number>`count(*)::integer`,
      unread: sql<number>`count(*) filter (where ${battleReportRecipients.readAt} is null)::integer`,
    })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(filter);
  const pageCount = Math.max(1, Math.ceil(counts!.total / 25)),
    current = Math.min(page, pageCount);
  const rows = await tx
    .select({ report: battleReports, access: battleReportRecipients })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(filter)
    .orderBy(desc(battleReports.occurredAt), desc(battleReports.id))
    .limit(25)
    .offset((current - 1) * 25);
  return {
    page: current,
    pageCount,
    total: counts!.total,
    unread: counts!.unread,
    reports: rows.map(({ report, access }) => summary(report, access)),
  };
}
export async function reportView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  id: number,
): Promise<BattleReportView> {
  const [row] = await tx
    .select({ report: battleReports, access: battleReportRecipients })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(
      and(
        eq(battleReports.id, id),
        eq(battleReports.worldId, worldId),
        eq(battleReportRecipients.playerId, playerId),
      ),
    );
  if (!row) throw new GameError('Relatório não encontrado.', 404);
  if (!row.access.readAt)
    await tx
      .update(battleReportRecipients)
      .set({ readAt: new Date() })
      .where(
        and(eq(battleReportRecipients.reportId, id), eq(battleReportRecipients.playerId, playerId)),
      );
  const result = row.report.result,
    support = row.access.role === 'support',
    showDefense = row.access.role === 'defender' || result.showDefense;
  return {
    ...summary(row.report, row.access),
    read: true,
    from: result.from,
    to: result.to,
    unitTypes: unitCodes.map((code) => ({ code, name: units[code].name })),
    attacker: support ? null : result.attacker,
    attackerLosses: support ? null : result.attackerLosses,
    defender: !support && showDefense ? result.defender : null,
    defenderLosses: !support && showDefense ? result.defenderLosses : null,
    supportTroops: row.access.supportTroops,
    supportLosses: row.access.supportLosses,
    luck: support ? null : result.luck,
    morale: support ? null : result.morale,
    loot: support ? null : result.loot,
    lootCapacity: support ? null : result.lootCapacity,
    wall: support ? null : result.wall,
    demolition: support ? null : result.demolition,
    loyalty: support ? null : result.loyalty,
    intel: row.access.role === 'attacker' ? result.intel : null,
  };
}

export async function readReports(
  accountId: number,
  worldId: number,
  page: number,
  villageId?: number,
) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      player = await memberPlayer(tx, accountId, worldId);
    await settleWorldEvents(tx, world, new Date());
    return reportsView(tx, worldId, player.id, page, villageId);
  });
}

export async function readReport(accountId: number, worldId: number, reportId: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    return reportView(tx, worldId, player.id, reportId);
  });
}
