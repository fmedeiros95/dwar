import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import {
  db,
  battleReports,
  battleReportRecipients,
  noticeReports,
  type Transaction,
} from '@dwar/database';
import { units, unitCodes, medals, medalTiers } from '@dwar/game-config';
import type {
  ReportsSnapshot,
  BattleReportSummary,
  NoticeReportSummary,
  ReportSummary,
  BattleReportView,
  NoticeReportView,
  ReportGroup,
  ReportAction,
  ReportRef,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { medalMetrics, medalViews } from './medals.js';
import { lockWorld, settleWorldEvents } from './village-engine.js';
export { memberPlayer } from './member.js';
import { memberPlayer } from './member.js';
const groupOfRole = { attacker: 'attack', defender: 'defense', support: 'support' } as const;
const sum = (troops: Record<string, number>) => Object.values(troops).reduce((a, b) => a + b, 0);
const place = (side: { name: string; x: number; y: number }) =>
  `${side.name} (${side.x}|${side.y})`;
const groups: ReportGroup[] = ['all', 'attack', 'defense', 'support', 'trade', 'other'];

type Notice = typeof noticeReports.$inferSelect;

function battleSummary(
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
    source: 'battle',
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
    target: {
      name: result.to.name,
      username: result.to.username,
      x: result.to.x,
      y: result.to.y,
    },
    lootTotal: onAttack ? loot : 0,
    lootFull: onAttack && result.lootCapacity > 0 && loot >= result.lootCapacity,
    conquered: result.loyalty?.conquered ?? false,
    spy: onAttack && result.intel !== null,
    lossless: onAttack && sum(result.attacker) > 0 && sum(result.attackerLosses) === 0,
  };
}

function noticeTitle(notice: Notice): string {
  const { payload } = notice;
  if (payload.kind === 'tribe') {
    const tribe = `${payload.tribeName} (${payload.tribeTag})`;
    if (payload.event === 'invited') return `Convite para a tribo ${tribe}, de ${payload.by}`;
    if (payload.event === 'kicked') return `Você foi expulso da tribo ${tribe} por ${payload.by}`;
    return `A tribo ${tribe} foi dissolvida por ${payload.by}`;
  }
  if (payload.kind === 'medal') {
    const medal = medals.find((m) => m.code === payload.code);
    return `Medalha ${medal?.name ?? payload.code}: ${medalTiers[payload.stage - 1] ?? ''}`;
  }
  const [from, to] = [place(payload.from), place(payload.to)];
  if (payload.kind === 'support')
    return payload.role === 'sender'
      ? `Seu apoio chegou a ${to}`
      : `${payload.from.username} enviou apoio para ${to}`;
  if (payload.mode === 'offer')
    return payload.role === 'sender'
      ? `Oferta do mercado: você enviou recursos de ${from} para ${to}`
      : `Oferta do mercado: você recebeu recursos de ${from} em ${to}`;
  return payload.role === 'sender'
    ? `Você enviou recursos de ${from} para ${to}`
    : `Você recebeu recursos de ${from} em ${to}`;
}

function noticeSummary(notice: Notice): NoticeReportSummary {
  const { payload } = notice;
  const pick = (s: { name: string; username: string; x: number; y: number }) => ({
    name: s.name,
    username: s.username,
    x: s.x,
    y: s.y,
  });
  const base = {
    source: 'notice' as const,
    id: notice.id,
    title: noticeTitle(notice),
    occurredAt: notice.occurredAt.toISOString(),
    read: notice.readAt !== null,
  };
  if (payload.kind === 'medal' || payload.kind === 'tribe')
    return { ...base, kind: payload.kind, group: 'other', role: null, origin: null, target: null };
  return {
    ...base,
    kind: payload.kind,
    group: payload.kind,
    role: payload.role,
    origin: pick(payload.from),
    target: pick(payload.to),
  };
}

/**
 * Referências (origem, id, data, grupo, leitura) de tudo que o jogador ainda vê, juntando batalhas
 * e avisos numa só lista ordenada. As datas ficam no banco, sem passar por JavaScript, porque a
 * precisão de microssegundos do banco se perde em milissegundos ao sair daqui.
 */
function visible(playerId: number, worldId: number, villageId?: number): SQL {
  const battleVillage = villageId
    ? sql`AND (r.from_village_id = ${villageId} OR r.to_village_id = ${villageId})`
    : sql``;
  const noticeVillage = villageId
    ? sql`AND (n.from_village_id = ${villageId} OR n.to_village_id = ${villageId})`
    : sql``;
  return sql`
    SELECT 'battle'::text AS source, r.id, r.occurred_at,
      CASE rec.role WHEN 'attacker' THEN 'attack' WHEN 'defender' THEN 'defense' ELSE 'support' END AS grp,
      rec.read_at
    FROM battle_reports r
    JOIN battle_report_recipients rec ON rec.report_id = r.id
    WHERE rec.player_id = ${playerId} AND r.world_id = ${worldId}
      AND rec.deleted_at IS NULL ${battleVillage}
    UNION ALL
    SELECT 'notice'::text, n.id, n.occurred_at,
      CASE WHEN n.kind IN ('medal', 'tribe') THEN 'other' ELSE n.kind END, n.read_at
    FROM notice_reports n
    WHERE n.player_id = ${playerId} AND n.world_id = ${worldId}
      AND n.deleted_at IS NULL ${noticeVillage}`;
}

type Row = { source: 'battle' | 'notice'; id: number };
const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;

async function hydrate(
  tx: Transaction,
  worldId: number,
  playerId: number,
  refs: ReportRef[],
): Promise<ReportSummary[]> {
  const battleIds = refs.filter((r) => r.source === 'battle').map((r) => r.id);
  const noticeIds = refs.filter((r) => r.source === 'notice').map((r) => r.id);
  const battles = battleIds.length
    ? await tx
        .select({ report: battleReports, access: battleReportRecipients })
        .from(battleReports)
        .innerJoin(battleReportRecipients, eq(battleReportRecipients.reportId, battleReports.id))
        .where(
          and(
            inArray(battleReports.id, battleIds),
            eq(battleReports.worldId, worldId),
            eq(battleReportRecipients.playerId, playerId),
          ),
        )
    : [];
  const notices = noticeIds.length
    ? await tx
        .select()
        .from(noticeReports)
        .where(
          and(
            inArray(noticeReports.id, noticeIds),
            eq(noticeReports.worldId, worldId),
            eq(noticeReports.playerId, playerId),
          ),
        )
    : [];
  const byRef = new Map<string, ReportSummary>();
  for (const { report, access } of battles)
    byRef.set(`battle:${report.id}`, battleSummary(report, access));
  for (const notice of notices) byRef.set(`notice:${notice.id}`, noticeSummary(notice));
  return refs.flatMap((ref) => byRef.get(`${ref.source}:${ref.id}`) ?? []);
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
  const perGroup = rowsOf<{ grp: string; total: number; unread: number }>(
    await tx.execute(sql`
      WITH u AS (${base})
      SELECT grp, count(*)::integer AS total,
        count(*) FILTER (WHERE read_at IS NULL)::integer AS unread
      FROM u GROUP BY grp`),
  );
  const totals = Object.fromEntries(groups.map((g) => [g, { total: 0, unread: 0 }])) as Record<
    ReportGroup,
    { total: number; unread: number }
  >;
  for (const row of perGroup) {
    const target = totals[row.grp as ReportGroup];
    if (!target) continue;
    target.total += row.total;
    target.unread += row.unread;
    totals.all.total += row.total;
    totals.all.unread += row.unread;
  }
  const counts = totals[group];
  const pageCount = Math.max(1, Math.ceil(counts.total / 25)),
    current = Math.min(page, pageCount);
  const filter = group === 'all' ? sql`` : sql`WHERE grp = ${group}`;
  const refs = rowsOf<Row>(
    await tx.execute(sql`
      WITH u AS (${base})
      SELECT source, id FROM u ${filter}
      ORDER BY occurred_at DESC, source DESC, id DESC
      LIMIT 25 OFFSET ${(current - 1) * 25}`),
  );
  return {
    page: current,
    pageCount,
    total: counts.total,
    unread: totals.all.unread,
    group,
    groups: totals,
    reports: await hydrate(tx, worldId, playerId, refs),
  };
}

/** Relatório vizinho (mais novo ou mais antigo) entre todos os que o jogador ainda vê. */
async function neighbour(
  tx: Transaction,
  worldId: number,
  playerId: number,
  ref: ReportRef,
  direction: 'newer' | 'older',
): Promise<ReportRef | null> {
  const newer = direction === 'newer';
  const [row] = rowsOf<Row>(
    await tx.execute(sql`
      WITH u AS (${visible(playerId, worldId)})
      SELECT source, id FROM u
      WHERE (occurred_at, source, id) ${newer ? sql`>` : sql`<`}
        (SELECT occurred_at, source, id FROM u WHERE source = ${ref.source} AND id = ${ref.id})
      ORDER BY occurred_at ${newer ? sql`ASC` : sql`DESC`},
        source ${newer ? sql`ASC` : sql`DESC`}, id ${newer ? sql`ASC` : sql`DESC`}
      LIMIT 1`),
  );
  return row ? { source: row.source, id: row.id } : null;
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
        isNull(battleReportRecipients.deletedAt),
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
  const ref: ReportRef = { source: 'battle', id };
  return {
    ...battleSummary(row.report, row.access),
    read: true,
    previous: await neighbour(tx, worldId, playerId, ref, 'older'),
    next: await neighbour(tx, worldId, playerId, ref, 'newer'),
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

export async function noticeView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  id: number,
): Promise<NoticeReportView> {
  const [notice] = await tx
    .select()
    .from(noticeReports)
    .where(
      and(
        eq(noticeReports.id, id),
        eq(noticeReports.worldId, worldId),
        eq(noticeReports.playerId, playerId),
        isNull(noticeReports.deletedAt),
      ),
    );
  if (!notice) throw new GameError('Relatório não encontrado.', 404);
  if (!notice.readAt)
    await tx.update(noticeReports).set({ readAt: new Date() }).where(eq(noticeReports.id, id));
  const { payload } = notice;
  const ref: ReportRef = { source: 'notice', id };
  const medal =
    payload.kind === 'medal'
      ? (medalViews(await medalValuesFor(tx, worldId, playerId)).find(
          (view) => view.code === payload.code,
        ) ?? null)
      : null;
  return {
    ...noticeSummary(notice),
    read: true,
    previous: await neighbour(tx, worldId, playerId, ref, 'older'),
    next: await neighbour(tx, worldId, playerId, ref, 'newer'),
    from: payload.kind === 'trade' || payload.kind === 'support' ? payload.from : null,
    to: payload.kind === 'trade' || payload.kind === 'support' ? payload.to : null,
    medal,
    mode: payload.kind === 'trade' ? payload.mode : null,
    resources: payload.kind === 'trade' ? payload.resources : null,
    troops: payload.kind === 'support' ? payload.troops : null,
    unitTypes: unitCodes.map((code) => ({ code, name: units[code].name })),
  };
}

/** Valores atuais das medalhas do jogador, para mostrar o progresso dentro do relatório. */
async function medalValuesFor(tx: Transaction, worldId: number, playerId: number) {
  const metrics = (await medalMetrics(tx, worldId, playerId)).get(playerId);
  if (!metrics) throw new GameError('Jogador não encontrado.', 404);
  return metrics;
}

const chunk = <T>(list: T[], size = 5000) =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, (i + 1) * size),
  );

/** Apaga (só para quem pede), marca como lidos ou como não lidos relatórios do próprio jogador. */
export async function performReportAction(
  tx: Transaction,
  worldId: number,
  playerId: number,
  action: ReportAction,
): Promise<{ changed: number }> {
  let refs: ReportRef[];
  if ('items' in action && action.items) refs = action.items;
  else {
    // Uma aba inteira: resolve as referências dentro do banco, só do que o jogador vê.
    const group = 'group' in action && action.group ? action.group : 'all';
    const conditions = [
      group === 'all' ? undefined : sql`grp = ${group}`,
      action.type === 'read' ? sql`read_at IS NULL` : undefined,
    ].filter((part): part is SQL => part !== undefined);
    const where = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    refs = rowsOf<Row>(
      await tx.execute(sql`
        WITH u AS (${visible(playerId, worldId)})
        SELECT source, id FROM u ${where}`),
    ).map((row) => ({ source: row.source, id: row.id }));
  }
  const unique = (source: ReportRef['source']) => [
    ...new Set(refs.filter((r) => r.source === source).map((r) => r.id)),
  ];
  const set =
    action.type === 'delete'
      ? { deletedAt: new Date() }
      : { readAt: action.type === 'read' ? new Date() : null };
  let changed = 0;
  for (const ids of chunk(unique('battle'))) {
    const done = await tx
      .update(battleReportRecipients)
      .set(set)
      .where(
        and(
          eq(battleReportRecipients.worldId, worldId),
          eq(battleReportRecipients.playerId, playerId),
          isNull(battleReportRecipients.deletedAt),
          inArray(battleReportRecipients.reportId, ids),
          action.type === 'read' ? isNull(battleReportRecipients.readAt) : undefined,
        ),
      )
      .returning({ id: battleReportRecipients.reportId });
    changed += done.length;
  }
  for (const ids of chunk(unique('notice'))) {
    const done = await tx
      .update(noticeReports)
      .set(set)
      .where(
        and(
          eq(noticeReports.worldId, worldId),
          eq(noticeReports.playerId, playerId),
          isNull(noticeReports.deletedAt),
          inArray(noticeReports.id, ids),
          action.type === 'read' ? isNull(noticeReports.readAt) : undefined,
        ),
      )
      .returning({ id: noticeReports.id });
    changed += done.length;
  }
  return { changed };
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

export async function readNotice(accountId: number, worldId: number, noticeId: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    return noticeView(tx, worldId, player.id, noticeId);
  });
}

export async function mutateReports(accountId: number, worldId: number, action: ReportAction) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    return performReportAction(tx, worldId, player.id, action);
  });
}
