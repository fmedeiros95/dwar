import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  tribePeaceOffers,
  tribeRelations,
  tribes,
  tribeWars,
  type Transaction,
} from '@dwar/database';
import { tribeLimits } from '@dwar/game-config';
import type {
  RelationKind,
  TribeAction,
  TribeDiplomacy,
  TribeProfile,
  TribeRef,
  TribeRelationView,
  TribeWarView,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { renderBBCode } from './bbcode.js';
import { logEvent, notifyTribe, plain, safe, type MemberRow } from './tribe-common.js';

type War = typeof tribeWars.$inferSelect;
/** Como a relação aparece no registro de eventos, do lado de quem declarou e do lado de quem recebeu. */
const ownPhrase: Record<RelationKind, string> = {
  ally: 'tribo aliada',
  nap: 'pacto de não agressão',
  enemy: 'tribo inimiga',
};
const receivedPhrase: Record<RelationKind, string> = {
  ally: 'passou a considerar a sua tribo aliada',
  nap: 'firmou um pacto de não agressão com a sua tribo',
  enemy: 'passou a considerar a sua tribo inimiga',
};

const refOf = (row: { id: number; name: string; tag: string }): TribeRef => ({
  id: row.id,
  name: row.name,
  tag: row.tag,
});

async function tribeRow(tx: Transaction, tribeId: number) {
  const [row] = await tx.select().from(tribes).where(eq(tribes.id, tribeId));
  return row!;
}

async function byTag(tx: Transaction, worldId: number, tag: string) {
  const [row] = await tx
    .select()
    .from(tribes)
    .where(and(eq(tribes.worldId, worldId), sql`lower(${tribes.tag}) = lower(${plain(tag)})`));
  if (!row) throw new GameError(`Nenhuma tribo com a tag "${plain(tag)}".`, 404);
  return row;
}

/**
 * Batalhas e unidades derrotadas entre as duas tribos de cada guerra, enquanto ela durou. Conta
 * pelos membros atuais das tribos e pelos relatórios de batalha (sem contadores novos).
 */
async function warStats(tx: Transaction, wars: War[]) {
  const stats = new Map<
    number,
    { aAttacks: number; bAttacks: number; aKills: number; bKills: number }
  >();
  if (!wars.length) return stats;
  const ids = sql.join(
    wars.map((war) => sql`${war.id}`),
    sql`, `,
  );
  const rows = (
    await tx.execute(sql`
      SELECT w.id AS id,
        count(*) FILTER (WHERE fm.tribe_id = w.declarer_tribe_id AND tm.tribe_id = w.target_tribe_id)::integer AS a_attacks,
        count(*) FILTER (WHERE fm.tribe_id = w.target_tribe_id AND tm.tribe_id = w.declarer_tribe_id)::integer AS b_attacks,
        (coalesce(sum(dl.n) FILTER (WHERE fm.tribe_id = w.declarer_tribe_id AND tm.tribe_id = w.target_tribe_id), 0)
          + coalesce(sum(al.n) FILTER (WHERE fm.tribe_id = w.target_tribe_id AND tm.tribe_id = w.declarer_tribe_id), 0))::bigint AS a_kills,
        (coalesce(sum(dl.n) FILTER (WHERE fm.tribe_id = w.target_tribe_id AND tm.tribe_id = w.declarer_tribe_id), 0)
          + coalesce(sum(al.n) FILTER (WHERE fm.tribe_id = w.declarer_tribe_id AND tm.tribe_id = w.target_tribe_id), 0))::bigint AS b_kills
      FROM tribe_wars w
      JOIN battle_reports r ON r.world_id = w.world_id
        AND r.occurred_at >= w.declared_at
        AND (w.ended_at IS NULL OR r.occurred_at <= w.ended_at)
      JOIN tribe_members fm ON fm.player_id = (r.result->'from'->>'playerId')::integer
      JOIN tribe_members tm ON tm.player_id = (r.result->'to'->>'playerId')::integer
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(r.result->'defenderLosses')
      ) dl
      CROSS JOIN LATERAL (
        SELECT coalesce(sum(value::bigint), 0) AS n FROM jsonb_each_text(r.result->'attackerLosses')
      ) al
      WHERE w.id IN (${ids})
      GROUP BY w.id`)
  ).rows as {
    id: number;
    a_attacks: number;
    b_attacks: number;
    a_kills: string;
    b_kills: string;
  }[];
  for (const row of rows)
    stats.set(row.id, {
      aAttacks: row.a_attacks,
      bAttacks: row.b_attacks,
      aKills: Number(row.a_kills),
      bKills: Number(row.b_kills),
    });
  return stats;
}

async function warViews(
  tx: Transaction,
  worldId: number,
  tribeId: number,
  wars: War[],
): Promise<TribeWarView[]> {
  const stats = await warStats(tx, wars);
  const offers = wars.length
    ? await tx
        .select()
        .from(tribePeaceOffers)
        .where(
          inArray(
            tribePeaceOffers.warId,
            wars.map((war) => war.id),
          ),
        )
    : [];
  const views: TribeWarView[] = [];
  for (const war of wars) {
    const ours = war.declarerTribeId === tribeId;
    const other = await tribeRow(tx, ours ? war.targetTribeId : war.declarerTribeId);
    const stat = stats.get(war.id) ?? { aAttacks: 0, bAttacks: 0, aKills: 0, bKills: 0 };
    const offer = offers.find((row) => row.warId === war.id);
    views.push({
      id: war.id,
      title: war.title,
      declaration: await renderBBCode(tx, worldId, war.body),
      other: refOf(other),
      declaredByUs: ours,
      declaredAt: war.declaredAt.toISOString(),
      endedAt: war.endedAt ? war.endedAt.toISOString() : null,
      peace: offer ? { offeredByUs: offer.offeredByTribeId === tribeId } : null,
      stats: {
        ourAttacks: ours ? stat.aAttacks : stat.bAttacks,
        theirAttacks: ours ? stat.bAttacks : stat.aAttacks,
        ourKills: ours ? stat.aKills : stat.bKills,
        theirKills: ours ? stat.bKills : stat.aKills,
      },
    });
  }
  return views;
}

export async function diplomacyOf(
  tx: Transaction,
  worldId: number,
  tribeId: number,
): Promise<TribeDiplomacy> {
  const declared = await tx
    .select({ relation: tribeRelations, tribe: tribes })
    .from(tribeRelations)
    .innerJoin(tribes, eq(tribes.id, tribeRelations.toTribeId))
    .where(eq(tribeRelations.fromTribeId, tribeId))
    .orderBy(desc(tribeRelations.createdAt));
  const received = await tx
    .select({ relation: tribeRelations, tribe: tribes })
    .from(tribeRelations)
    .innerJoin(tribes, eq(tribes.id, tribeRelations.fromTribeId))
    .where(eq(tribeRelations.toTribeId, tribeId))
    .orderBy(desc(tribeRelations.createdAt));
  const involved = or(eq(tribeWars.declarerTribeId, tribeId), eq(tribeWars.targetTribeId, tribeId));
  const active = await tx
    .select()
    .from(tribeWars)
    .where(and(involved, isNull(tribeWars.endedAt)))
    .orderBy(desc(tribeWars.declaredAt));
  const ended = await tx
    .select()
    .from(tribeWars)
    .where(and(involved, isNotNull(tribeWars.endedAt)))
    .orderBy(desc(tribeWars.endedAt))
    .limit(20);
  const view = ({ relation, tribe }: (typeof declared)[number]): TribeRelationView => ({
    id: relation.id,
    tribe: refOf(tribe),
    kind: relation.kind,
    createdAt: relation.createdAt.toISOString(),
  });
  return {
    declared: declared.map(view),
    received: received.map(view),
    wars: await warViews(tx, worldId, tribeId, active),
    endedWars: await warViews(tx, worldId, tribeId, ended),
  };
}

/** Relações e guerras em andamento que qualquer jogador vê na página pública da tribo. */
export async function publicRelations(
  tx: Transaction,
  tribeId: number,
): Promise<TribeProfile['relations']> {
  const rows = await tx
    .select({ kind: tribeRelations.kind, tribe: tribes })
    .from(tribeRelations)
    .innerJoin(tribes, eq(tribes.id, tribeRelations.toTribeId))
    .where(eq(tribeRelations.fromTribeId, tribeId))
    .orderBy(tribes.name);
  const wars = await tx
    .select()
    .from(tribeWars)
    .where(
      and(
        isNull(tribeWars.endedAt),
        or(eq(tribeWars.declarerTribeId, tribeId), eq(tribeWars.targetTribeId, tribeId)),
      ),
    )
    .orderBy(desc(tribeWars.declaredAt));
  const result: TribeProfile['relations'] = { ally: [], nap: [], enemy: [], wars: [] };
  for (const row of rows) result[row.kind].push(refOf(row.tribe));
  for (const war of wars) {
    const other = await tribeRow(
      tx,
      war.declarerTribeId === tribeId ? war.targetTribeId : war.declarerTribeId,
    );
    result.wars.push({ id: war.id, title: war.title, other: refOf(other) });
  }
  return result;
}

/** Como a tribo enxerga as outras no mapa: o que declarou, e quem está em guerra conta como inimiga. */
export async function relationsFor(
  tx: Transaction,
  tribeId: number,
): Promise<Record<number, RelationKind>> {
  const result: Record<number, RelationKind> = {};
  const declared = await tx
    .select({ to: tribeRelations.toTribeId, kind: tribeRelations.kind })
    .from(tribeRelations)
    .where(eq(tribeRelations.fromTribeId, tribeId));
  for (const row of declared) result[row.to] = row.kind;
  const wars = await tx
    .select()
    .from(tribeWars)
    .where(
      and(
        isNull(tribeWars.endedAt),
        or(eq(tribeWars.declarerTribeId, tribeId), eq(tribeWars.targetTribeId, tribeId)),
      ),
    );
  for (const war of wars)
    result[war.declarerTribeId === tribeId ? war.targetTribeId : war.declarerTribeId] = 'enemy';
  return result;
}

async function activeWar(tx: Transaction, worldId: number, warId: number, tribeId: number) {
  const [war] = await tx
    .select()
    .from(tribeWars)
    .where(
      and(
        eq(tribeWars.id, warId),
        eq(tribeWars.worldId, worldId),
        isNull(tribeWars.endedAt),
        or(eq(tribeWars.declarerTribeId, tribeId), eq(tribeWars.targetTribeId, tribeId)),
      ),
    );
  if (!war) throw new GameError('Guerra não encontrada ou já encerrada.', 404);
  return war;
}

const diplomats = (member: MemberRow) => member.canDiplomacy;

type DiplomacyAction = Extract<
  TribeAction,
  {
    type:
      | 'set_relation'
      | 'cancel_relation'
      | 'declare_war'
      | 'offer_peace'
      | 'withdraw_peace'
      | 'accept_peace'
      | 'reject_peace';
  }
>;

export const isDiplomacyAction = (action: TribeAction): action is DiplomacyAction =>
  [
    'set_relation',
    'cancel_relation',
    'declare_war',
    'offer_peace',
    'withdraw_peace',
    'accept_peace',
    'reject_peace',
  ].includes(action.type);

export async function performDiplomacy(
  tx: Transaction,
  worldId: number,
  actor: MemberRow,
  me: string,
  action: DiplomacyAction,
): Promise<void> {
  if (!actor.canDiplomacy)
    throw new GameError('Você não tem permissão para cuidar da diplomacia da tribo.', 403);
  const mine = await tribeRow(tx, actor.tribeId);
  const label = (tribe: { tag: string }) => `[ally]${tribe.tag}[/ally]`;

  if (action.type === 'set_relation') {
    if (!(action.kind in ownPhrase)) throw new GameError('Tipo de relação inválido.');
    const target = await byTag(tx, worldId, action.tag);
    if (target.id === mine.id)
      throw new GameError('Você não pode ter uma relação diplomática com a sua própria tribo.');
    const [previous] = await tx
      .select()
      .from(tribeRelations)
      .where(and(eq(tribeRelations.fromTribeId, mine.id), eq(tribeRelations.toTribeId, target.id)));
    if (previous?.kind === action.kind) return;
    await tx
      .insert(tribeRelations)
      .values({ worldId, fromTribeId: mine.id, toTribeId: target.id, kind: action.kind })
      .onConflictDoUpdate({
        target: [tribeRelations.fromTribeId, tribeRelations.toTribeId],
        set: { kind: action.kind, createdAt: new Date() },
      });
    await logEvent(
      tx,
      worldId,
      mine.id,
      `[player]${me}[/player] definiu a relação com ${label(target)}: ${ownPhrase[action.kind]}.`,
    );
    await logEvent(tx, worldId, target.id, `${label(mine)} ${receivedPhrase[action.kind]}.`);
    return;
  }

  if (action.type === 'cancel_relation') {
    const [relation] = await tx
      .select()
      .from(tribeRelations)
      .where(
        and(eq(tribeRelations.id, action.relationId), eq(tribeRelations.fromTribeId, mine.id)),
      );
    if (!relation) throw new GameError('Relação não encontrada.', 404);
    await tx.delete(tribeRelations).where(eq(tribeRelations.id, relation.id));
    const target = await tribeRow(tx, relation.toTribeId);
    await logEvent(
      tx,
      worldId,
      mine.id,
      `[player]${me}[/player] encerrou a relação com ${label(target)}.`,
    );
    return;
  }

  if (action.type === 'declare_war') {
    const target = await byTag(tx, worldId, action.tag);
    if (target.id === mine.id)
      throw new GameError('Você não pode declarar guerra à sua própria tribo.');
    const title = plain(action.title);
    if (!title) throw new GameError('Dê um título à guerra.');
    if ([...title].length > 32)
      throw new GameError('O título da guerra pode ter no máximo 32 caracteres.');
    const declaration = typeof action.declaration === 'string' ? action.declaration : '';
    if ([...declaration].length > tribeLimits.text)
      throw new GameError('A declaração pode ter no máximo 10.000 caracteres.');
    const [existing] = await tx
      .select({ id: tribeWars.id })
      .from(tribeWars)
      .where(
        and(
          isNull(tribeWars.endedAt),
          or(
            and(eq(tribeWars.declarerTribeId, mine.id), eq(tribeWars.targetTribeId, target.id)),
            and(eq(tribeWars.declarerTribeId, target.id), eq(tribeWars.targetTribeId, mine.id)),
          ),
        ),
      );
    if (existing) throw new GameError('Já existe uma guerra em andamento com esta tribo.');
    await tx.insert(tribeWars).values({
      worldId,
      declarerTribeId: mine.id,
      targetTribeId: target.id,
      title,
      body: declaration,
    });
    await logEvent(
      tx,
      worldId,
      mine.id,
      `[player]${me}[/player] declarou guerra a ${label(target)}: ${safe(title)}.`,
    );
    await logEvent(
      tx,
      worldId,
      target.id,
      `${label(mine)} declarou guerra à sua tribo: ${safe(title)}.`,
    );
    await notifyTribe(tx, worldId, mine.id, {
      kind: 'tribe',
      event: 'war_declared',
      tribeName: target.name,
      tribeTag: target.tag,
      by: me,
      detail: title,
      outgoing: true,
    });
    await notifyTribe(tx, worldId, target.id, {
      kind: 'tribe',
      event: 'war_declared',
      tribeName: mine.name,
      tribeTag: mine.tag,
      by: me,
      detail: title,
    });
    return;
  }

  const war = await activeWar(tx, worldId, action.warId, mine.id);
  const otherId = war.declarerTribeId === mine.id ? war.targetTribeId : war.declarerTribeId;
  const other = await tribeRow(tx, otherId);
  const [offer] = await tx
    .select()
    .from(tribePeaceOffers)
    .where(eq(tribePeaceOffers.warId, war.id));
  const toThem = {
    kind: 'tribe' as const,
    tribeName: mine.name,
    tribeTag: mine.tag,
    by: me,
    detail: war.title,
  };
  const toUs = { ...toThem, tribeName: other.name, tribeTag: other.tag };

  if (action.type === 'offer_peace') {
    if (offer) throw new GameError('Já existe um pedido de paz em aberto para esta guerra.');
    await tx.insert(tribePeaceOffers).values({ warId: war.id, offeredByTribeId: mine.id });
    await logEvent(tx, worldId, mine.id, `[player]${me}[/player] pediu paz a ${label(other)}.`);
    await logEvent(tx, worldId, other.id, `${label(mine)} pediu paz.`);
    await notifyTribe(tx, worldId, other.id, { ...toThem, event: 'peace_offered' }, diplomats);
    return;
  }
  if (!offer) throw new GameError('Não há pedido de paz em aberto para esta guerra.');
  if (action.type === 'withdraw_peace') {
    if (offer.offeredByTribeId !== mine.id)
      throw new GameError('Só quem fez o pedido de paz pode retirá-lo.');
    await tx.delete(tribePeaceOffers).where(eq(tribePeaceOffers.warId, war.id));
    await logEvent(tx, worldId, mine.id, `[player]${me}[/player] retirou o pedido de paz.`);
    return;
  }
  if (offer.offeredByTribeId === mine.id)
    throw new GameError(
      'O pedido de paz foi feito pela sua tribo; a outra tribo precisa responder.',
    );
  if (action.type === 'reject_peace') {
    await tx.delete(tribePeaceOffers).where(eq(tribePeaceOffers.warId, war.id));
    await logEvent(
      tx,
      worldId,
      mine.id,
      `[player]${me}[/player] recusou o pedido de paz de ${label(other)}.`,
    );
    await logEvent(tx, worldId, other.id, `${label(mine)} recusou o pedido de paz.`);
    await notifyTribe(tx, worldId, other.id, { ...toThem, event: 'peace_rejected' }, diplomats);
    return;
  }
  // accept_peace: a guerra termina e os dois lados são avisados.
  await tx.update(tribeWars).set({ endedAt: new Date() }).where(eq(tribeWars.id, war.id));
  await tx.delete(tribePeaceOffers).where(eq(tribePeaceOffers.warId, war.id));
  await logEvent(
    tx,
    worldId,
    mine.id,
    `[player]${me}[/player] aceitou a paz com ${label(other)}. A guerra terminou.`,
  );
  await logEvent(tx, worldId, other.id, `${label(mine)} aceitou a paz. A guerra terminou.`);
  await notifyTribe(tx, worldId, mine.id, { ...toUs, event: 'peace_accepted' });
  await notifyTribe(tx, worldId, other.id, { ...toThem, event: 'peace_accepted' });
}
