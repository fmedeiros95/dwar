import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  db,
  accounts,
  noticeReports,
  playerMedals,
  players,
  type Transaction,
} from '@dwar/database';
import { medalStage, medals, medalTiers, type MedalCode } from '@dwar/game-config';
import type { MedalView, MedalsOverview } from '@dwar/api-client';
import { GameError } from './errors.js';
import { memberPlayer } from './member.js';

export type MedalMetrics = Record<MedalCode, number>;

const zeroMetrics = (): MedalMetrics =>
  Object.fromEntries(medals.map((medal) => [medal.code, 0])) as MedalMetrics;

const rowsOf = <T>(result: unknown) => (result as { rows: T[] }).rows;
const num = (value: unknown) => Number(value ?? 0);

/**
 * Valor de cada medalha para os jogadores do mundo (ou só para um deles), calculado a partir dos
 * relatórios de batalha e das tabelas do jogo. Tudo roda no banco, agrupado por jogador; nada é
 * guardado além do último nível já conhecido (ver `syncMedals`).
 */
export async function medalMetrics(
  tx: Transaction,
  worldId: number,
  only?: number,
): Promise<Map<number, MedalMetrics>> {
  const ids = (
    await tx
      .select({ id: players.id })
      .from(players)
      .where(
        only
          ? and(eq(players.worldId, worldId), eq(players.id, only))
          : eq(players.worldId, worldId),
      )
  ).map((row) => row.id);
  const result = new Map(ids.map((id) => [id, zeroMetrics()]));
  const set = (pid: number, code: MedalCode, value: unknown) => {
    const metrics = result.get(pid);
    if (metrics) metrics[code] += num(value);
  };
  const filter = (column: SQL) => (only ? sql`AND ${column} = ${only}` : sql``);
  const fromPlayer = sql`(r.result->'from'->>'playerId')::integer`;
  const toPlayer = sql`(r.result->'to'->>'playerId')::integer`;

  // Como atacante: saques, conquistas, ataques, destruição e vitórias.
  const attacker = rowsOf<Record<string, unknown>>(
    await tx.execute(sql`
      SELECT ${fromPlayer} AS pid,
        sum(loot.n) AS loot,
        count(*) FILTER (WHERE loot.n > 0) AS raids,
        count(*) FILTER (WHERE (r.result->'loyalty'->>'conquered')::boolean IS TRUE) AS conquests,
        count(*) FILTER (WHERE ${toPlayer} IS NOT NULL AND ${toPlayer} <> ${fromPlayer}) AS attacks,
        sum(coalesce((r.result->'demolition'->>'before')::integer
          - (r.result->'demolition'->>'after')::integer, 0)) AS demolisher,
        sum(greatest(coalesce((r.result->'wall'->>'before')::integer
          - (r.result->'wall'->>'after')::integer, 0), 0)) AS wallbreaker,
        sum(coalesce((r.result->'defenderLosses'->>'noble')::integer, 0)) AS nobles,
        count(*) FILTER (WHERE r.result->>'winner' = 'attacker' AND defenders.n >= 50) AS victories
      FROM battle_reports r
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(r.result->'loot')
      ) loot
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(r.result->'defender')
      ) defenders
      WHERE r.world_id = ${worldId} AND ${fromPlayer} IS NOT NULL ${filter(fromPlayer)}
      GROUP BY 1`),
  );
  for (const row of attacker) {
    const pid = num(row.pid);
    set(pid, 'loot', row.loot);
    set(pid, 'raids', row.raids);
    set(pid, 'conquests', row.conquests);
    set(pid, 'attacks', row.attacks);
    set(pid, 'demolisher', row.demolisher);
    set(pid, 'wallbreaker', row.wallbreaker);
    set(pid, 'noble_slayer', row.nobles);
    set(pid, 'victories', row.victories);
  }

  // Como defensor: nobres derrotados, vitórias e espionagens repelidas.
  const defender = rowsOf<Record<string, unknown>>(
    await tx.execute(sql`
      SELECT ${toPlayer} AS pid,
        sum(coalesce((r.result->'attackerLosses'->>'noble')::integer, 0)) AS nobles,
        count(*) FILTER (WHERE r.result->>'winner' = 'defender' AND attackers.n >= 50) AS victories,
        count(*) FILTER (WHERE r.result->>'winner' = 'defender'
          AND coalesce((r.result->'attacker'->>'spy')::integer, 0) > 0
          AND attackers.n = coalesce((r.result->'attacker'->>'spy')::integer, 0)) AS scouts
      FROM battle_reports r
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(r.result->'attacker')
      ) attackers
      WHERE r.world_id = ${worldId} AND ${toPlayer} IS NOT NULL ${filter(toPlayer)}
      GROUP BY 1`),
  );
  for (const row of defender) {
    const pid = num(row.pid);
    set(pid, 'noble_slayer', row.nobles);
    set(pid, 'victories', row.victories);
    set(pid, 'scout_defense', row.scouts);
  }

  // Apoio: batalhas em que as tropas enviadas participaram e unidades perdidas nelas.
  const support = rowsOf<Record<string, unknown>>(
    await tx.execute(sql`
      SELECT rec.player_id AS pid, count(*) AS battles, sum(lost.n) AS lost
      FROM battle_report_recipients rec
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(coalesce(rec.support_losses, '{}'::jsonb))
      ) lost
      WHERE rec.world_id = ${worldId} AND rec.role = 'support' ${filter(sql`rec.player_id`)}
      GROUP BY 1`),
  );
  for (const row of support) {
    const pid = num(row.pid);
    set(pid, 'reinforcements', row.battles);
    set(pid, 'support_losses', row.lost);
  }

  const kills = await tx
    .select({
      id: players.id,
      attack: players.unitsKilledAttack,
      defense: players.unitsKilledDefense,
    })
    .from(players)
    .where(
      only ? and(eq(players.worldId, worldId), eq(players.id, only)) : eq(players.worldId, worldId),
    );
  for (const row of kills) set(row.id, 'kills', row.attack + row.defense);

  const trades = rowsOf<Record<string, unknown>>(
    await tx.execute(sql`
      SELECT v.player_id AS pid, count(*) AS n
      FROM trade_shipments ts JOIN villages v ON v.id = ts.from_village_id
      WHERE ts.world_id = ${worldId} AND ts.delivered_at IS NOT NULL
        AND v.player_id IS NOT NULL ${filter(sql`v.player_id`)}
      GROUP BY 1`),
  );
  for (const row of trades) set(num(row.pid), 'trades', row.n);

  // Pontos e posição: a posição depende de todos os jogadores, mesmo quando só um é consultado.
  const standing = rowsOf<Record<string, unknown>>(
    await tx.execute(sql`
      SELECT p.id AS pid, coalesce(sum(v.points), 0)::bigint AS points
      FROM players p LEFT JOIN villages v ON v.player_id = p.id
      WHERE p.world_id = ${worldId}
      GROUP BY p.id, p.created_at
      ORDER BY points DESC, p.created_at ASC, p.id ASC`),
  );
  standing.forEach((row, index) => {
    const pid = num(row.pid);
    set(pid, 'points', row.points);
    if (result.has(pid)) result.get(pid)!.rank = index + 1;
  });
  return result;
}

export const stagesOf = (metrics: MedalMetrics) =>
  Object.fromEntries(medals.map((m) => [m.code, medalStage(m, metrics[m.code])])) as Record<
    MedalCode,
    number
  >;

export const totalStages = (stages: Record<MedalCode, number>) =>
  Object.values(stages).reduce((a, b) => a + b, 0);

const fill = (template: string, value: number) =>
  template.replace('{n}', value.toLocaleString('pt-BR'));

/** Medalhas de um jogador com nível, valor e o que falta para o próximo nível. */
export function medalViews(metrics: MedalMetrics): MedalView[] {
  return medals.map((medal) => {
    const value = metrics[medal.code];
    const stage = medalStage(medal, value);
    const next = stage < 4 ? medal.needs[stage]! : null;
    return {
      code: medal.code,
      name: medal.name,
      description: medal.description,
      kind: medal.kind,
      unit: medal.unit,
      stage,
      tier: stage > 0 ? medalTiers[stage - 1]! : null,
      value,
      needs: [...medal.needs],
      current: stage > 0 ? fill(medal.reached, medal.needs[stage - 1]!) : null,
      next: next === null ? null : fill(medal.goal, next),
      nextValue: next,
    };
  });
}

/**
 * Atualiza o último nível conhecido das medalhas dos jogadores e avisa (relatório "Outros") quando
 * algum sobe. Quando o nível cai (posição no ranking, pontos), só atualiza, sem aviso.
 */
export async function syncMedals(
  tx: Transaction,
  worldId: number,
  playerIds: number[],
  now: Date = new Date(),
) {
  for (const playerId of new Set(playerIds)) {
    const metrics = (await medalMetrics(tx, worldId, playerId)).get(playerId);
    if (!metrics) continue;
    const stored = new Map(
      (
        await tx
          .select()
          .from(playerMedals)
          .where(
            and(
              eq(playerMedals.playerId, playerId),
              inArray(
                playerMedals.code,
                medals.map((m) => m.code),
              ),
            ),
          )
      ).map((row) => [row.code, row.stage]),
    );
    for (const medal of medals) {
      const stage = medalStage(medal, metrics[medal.code]);
      const known = stored.get(medal.code);
      if (known === stage) continue;
      await tx
        .insert(playerMedals)
        .values({ playerId, worldId, code: medal.code, stage, updatedAt: now })
        .onConflictDoUpdate({
          target: [playerMedals.playerId, playerMedals.code],
          set: { stage, updatedAt: now },
        });
      if (stage > (known ?? 0))
        await tx.insert(noticeReports).values({
          worldId,
          playerId,
          kind: 'medal',
          occurredAt: now,
          fromVillageId: null,
          toVillageId: null,
          payload: { kind: 'medal', code: medal.code, stage, value: metrics[medal.code] },
        });
    }
  }
}

async function overviewOf(
  tx: Transaction,
  worldId: number,
  playerId: number,
): Promise<MedalsOverview> {
  const [player] = await tx
    .select({ id: players.id, username: accounts.username })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(and(eq(players.id, playerId), eq(players.worldId, worldId)));
  if (!player) throw new GameError('Jogador não encontrado.', 404);
  const metrics = (await medalMetrics(tx, worldId, playerId)).get(playerId)!;
  const views = medalViews(metrics);
  return {
    playerId: player.id,
    username: player.username,
    total: views.reduce((sum, view) => sum + view.stage, 0),
    maximum: medals.length * 4,
    medals: views,
  };
}

/** Medalhas do próprio jogador; ao consultar, sincroniza os níveis (e avisa as medalhas novas). */
export async function readMedals(accountId: number, worldId: number) {
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    await syncMedals(tx, worldId, [player.id]);
    return overviewOf(tx, worldId, player.id);
  });
}

/** Medalhas de outro jogador do mesmo mundo (somente leitura). */
export async function readPlayerMedals(accountId: number, worldId: number, playerId: number) {
  return db.transaction(async (tx) => {
    await memberPlayer(tx, accountId, worldId);
    return overviewOf(tx, worldId, playerId);
  });
}
