import { and, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  db,
  battleReports,
  battleReportRecipients,
  players,
  type Transaction,
} from '@dwar/database';
import { units, unitCodes } from '@dwar/game-config';
import type {
  ReportsSnapshot,
  BattleReportSummary,
  BattleReportView,
  ReportGroup,
  ReportAction,
} from '@dwar/api-client';
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

const roleOfGroup = { attack: 'attacker', defense: 'defender', support: 'support' } as const;
const groupOfRole = { attacker: 'attack', defender: 'defense', support: 'support' } as const;
const sum = (troops: Record<string, number>) => Object.values(troops).reduce((a, b) => a + b, 0);
const place = (side: { name: string; x: number; y: number }) =>
  `${side.name} (${side.x}|${side.y})`;

function summary(
  report: typeof battleReports.$inferSelect,
  access: typeof battleReportRecipients.$inferSelect,
): BattleReportSummary {
  const { result } = report;
  // O resultado é sempre contado do lado de quem lê: quem ataca vence quando o atacante vence;
  // quem defende (ou apoia) vence quando o defensor vence.
  const onAttack = access.role === 'attacker';
  const outcome =
    result.winner === 'draw'
      ? 'draw'
      : (result.winner === 'attacker') === onAttack
        ? 'won'
        : 'lost';
  const loot = sum(result.loot);
  return {
    id: report.id,
    title: `${place(result.from)} ataca ${place(result.to)}`,
    occurredAt: report.occurredAt.toISOString(),
    role: access.role,
    group: groupOfRole[access.role],
    read: access.readAt !== null,
    winner: result.winner,
    outcome,
    origin: {
      name: result.from.name,
      username: result.from.username,
      x: result.from.x,
      y: result.from.y,
    },
    target: { name: result.to.name, username: result.to.username, x: result.to.x, y: result.to.y },
    lootTotal: onAttack ? loot : 0,
    lootFull: onAttack && result.lootCapacity > 0 && loot >= result.lootCapacity,
    conquered: result.loyalty?.conquered ?? false,
    spy: onAttack && result.intel !== null,
    lossless: onAttack && sum(result.attacker) > 0 && sum(result.attackerLosses) === 0,
  };
}

function visible(playerId: number, worldId: number, villageId?: number): SQL | undefined {
  return and(
    eq(battleReportRecipients.playerId, playerId),
    eq(battleReports.worldId, worldId),
    isNull(battleReportRecipients.deletedAt),
    villageId
      ? or(eq(battleReports.fromVillageId, villageId), eq(battleReports.toVillageId, villageId))
      : undefined,
  );
}

export async function reportsView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  page: number,
  villageId?: number,
  group: ReportGroup = 'all',
): Promise<ReportsSnapshot> {
  if (!Number.isInteger(page) || page < 1) throw new GameError('Página inválida.');
  const base = visible(playerId, worldId, villageId);
  const filter =
    group === 'all' ? base : and(base, eq(battleReportRecipients.role, roleOfGroup[group]));
  const perRole = await tx
    .select({
      role: battleReportRecipients.role,
      total: sql<number>`count(*)::integer`,
      unread: sql<number>`count(*) filter (where ${battleReportRecipients.readAt} is null)::integer`,
    })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(base)
    .groupBy(battleReportRecipients.role);
  const groups: ReportsSnapshot['groups'] = {
    all: { total: 0, unread: 0 },
    attack: { total: 0, unread: 0 },
    defense: { total: 0, unread: 0 },
    support: { total: 0, unread: 0 },
  };
  for (const row of perRole) {
    const target = groups[groupOfRole[row.role]];
    target.total += row.total;
    target.unread += row.unread;
    groups.all.total += row.total;
    groups.all.unread += row.unread;
  }
  const counts = groups[group];
  const pageCount = Math.max(1, Math.ceil(counts.total / 25)),
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
    total: counts.total,
    unread: groups.all.unread,
    group,
    groups,
    reports: rows.map(({ report, access }) => summary(report, access)),
  };
}

/** Relatório vizinho (mais novo ou mais antigo) entre os que o jogador ainda vê. */
async function neighbour(
  tx: Transaction,
  worldId: number,
  playerId: number,
  report: typeof battleReports.$inferSelect,
  direction: 'newer' | 'older',
) {
  const newer = direction === 'newer';
  const [row] = await tx
    .select({ id: battleReports.id })
    .from(battleReports)
    .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
    .where(
      and(
        visible(playerId, worldId),
        newer
          ? sql`(${battleReports.occurredAt}, ${battleReports.id}) > (select r.occurred_at, r.id from battle_reports r where r.id = ${report.id})`
          : sql`(${battleReports.occurredAt}, ${battleReports.id}) < (select r.occurred_at, r.id from battle_reports r where r.id = ${report.id})`,
      ),
    )
    .orderBy(
      newer ? battleReports.occurredAt : desc(battleReports.occurredAt),
      newer ? battleReports.id : desc(battleReports.id),
    )
    .limit(1);
  return row?.id ?? null;
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
    .where(and(eq(battleReports.id, id), visible(playerId, worldId)));
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
    previousId: await neighbour(tx, worldId, playerId, row.report, 'older'),
    nextId: await neighbour(tx, worldId, playerId, row.report, 'newer'),
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

/** Apaga (só para quem pede) ou marca como lidos relatórios do próprio jogador. */
export async function performReportAction(
  tx: Transaction,
  worldId: number,
  playerId: number,
  action: ReportAction,
): Promise<{ changed: number }> {
  const mine = and(
    eq(battleReportRecipients.worldId, worldId),
    eq(battleReportRecipients.playerId, playerId),
    isNull(battleReportRecipients.deletedAt),
  );
  if (action.type === 'delete') {
    const ids = [...new Set(action.ids)];
    const done = await tx
      .update(battleReportRecipients)
      .set({ deletedAt: new Date() })
      .where(and(mine, inArray(battleReportRecipients.reportId, ids)))
      .returning({ id: battleReportRecipients.reportId });
    return { changed: done.length };
  }
  const scope =
    action.ids !== undefined
      ? inArray(battleReportRecipients.reportId, [...new Set(action.ids)])
      : action.group && action.group !== 'all'
        ? eq(battleReportRecipients.role, roleOfGroup[action.group])
        : undefined;
  const done = await tx
    .update(battleReportRecipients)
    .set({ readAt: new Date() })
    .where(and(mine, isNull(battleReportRecipients.readAt), scope))
    .returning({ id: battleReportRecipients.reportId });
  return { changed: done.length };
}

export async function readReports(
  accountId: number,
  worldId: number,
  page: number,
  villageId?: number,
  group: ReportGroup = 'all',
) {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId),
      player = await memberPlayer(tx, accountId, worldId);
    await settleWorldEvents(tx, world, new Date());
    return reportsView(tx, worldId, player.id, page, villageId, group);
  });
}

export async function readReport(accountId: number, worldId: number, reportId: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    return reportView(tx, worldId, player.id, reportId);
  });
}

export async function mutateReports(accountId: number, worldId: number, action: ReportAction) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    return performReportAction(tx, worldId, player.id, action);
  });
}
