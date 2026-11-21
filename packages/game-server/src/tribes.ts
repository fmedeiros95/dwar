import { and, desc, eq, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  noticeReports,
  players,
  tribeEvents,
  tribeInvites,
  tribeMembers,
  tribes,
  type Transaction,
} from '@dwar/database';
import { tribeLimits, tribeTagPattern, type NoticePayload } from '@dwar/game-config';
import { canManageMember, founderRights, normalizeRights } from '@dwar/game-core';
import type {
  MyTribeInvite,
  TribeAction,
  TribeHome,
  TribeMemberView,
  TribeOverview,
  TribeProfile,
  TribeRightsView,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { memberPlayer } from './member.js';
import { lockWorld } from './village-engine.js';
import { renderBBCode } from './bbcode.js';

type MemberRow = typeof tribeMembers.$inferSelect;
type Notice = Extract<NoticePayload, { kind: 'tribe' }>;

const rightsOf = (member: MemberRow): TribeRightsView => ({
  isFounder: member.isFounder,
  canLead: member.canLead,
  canInvite: member.canInvite,
  canDiplomacy: member.canDiplomacy,
  canMassMail: member.canMassMail,
  canModerate: member.canModerate,
  canHiddenForum: member.canHiddenForum,
});
const rightColumns = (rights: TribeRightsView) => ({ ...rights });

/** Nomes entram em textos com BBCode; colchetes quebrariam a leitura. */
const safe = (name: string) => name.replaceAll('[', '(').replaceAll(']', ')');
const plain = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

function checkName(name: string) {
  if (
    [...name].length < tribeLimits.name.min ||
    [...name].length > tribeLimits.name.max ||
    [...name].some((char) => {
      const code = char.codePointAt(0)!;
      return code < 32 || code === 127;
    })
  )
    throw new GameError(
      `O nome da tribo deve ter entre ${tribeLimits.name.min} e ${tribeLimits.name.max} caracteres.`,
    );
}
function checkTag(tag: string) {
  if (
    [...tag].length < tribeLimits.tag.min ||
    [...tag].length > tribeLimits.tag.max ||
    !tribeTagPattern.test(tag)
  )
    throw new GameError(
      `A tag deve ter de ${tribeLimits.tag.min} a ${tribeLimits.tag.max} letras, números ou os símbolos _ . - * ! +, sem espaços.`,
    );
}
function checkText(text: unknown, what: string): string {
  if (typeof text !== 'string' || [...text].length > tribeLimits.text)
    throw new GameError(
      `${what} pode ter no máximo ${tribeLimits.text.toLocaleString('pt-BR')} caracteres.`,
    );
  return text;
}

async function takenBy(tx: Transaction, worldId: number, name: string, tag: string) {
  const rows = await tx
    .select({ id: tribes.id, name: tribes.name, tag: tribes.tag })
    .from(tribes)
    .where(
      and(
        eq(tribes.worldId, worldId),
        sql`(lower(${tribes.name}) = lower(${name}) OR lower(${tribes.tag}) = lower(${tag}))`,
      ),
    );
  return rows;
}
async function requireFree(
  tx: Transaction,
  worldId: number,
  name: string,
  tag: string,
  ignoreTribe?: number,
) {
  for (const row of await takenBy(tx, worldId, name, tag)) {
    if (row.id === ignoreTribe) continue;
    if (row.name.toLowerCase() === name.toLowerCase())
      throw new GameError(`O nome "${name}" já está em uso.`);
    throw new GameError(`A tag "${tag}" já está em uso.`);
  }
}

async function membership(tx: Transaction, playerId: number) {
  const [row] = await tx.select().from(tribeMembers).where(eq(tribeMembers.playerId, playerId));
  return row;
}

async function logEvent(tx: Transaction, worldId: number, tribeId: number, message: string) {
  await tx.insert(tribeEvents).values({ worldId, tribeId, message });
}

async function notify(tx: Transaction, worldId: number, playerId: number, payload: Notice) {
  await tx.insert(noticeReports).values({
    worldId,
    playerId,
    kind: 'tribe',
    occurredAt: new Date(),
    fromVillageId: null,
    toVillageId: null,
    payload,
  });
}

/** Pontos, aldeias e posição de todos os jogadores do mundo (mesmo critério do ranking). */
async function playerRanks(tx: Transaction, worldId: number) {
  const rows = (
    await tx.execute(sql`
      SELECT p.id AS id, coalesce(sum(v.points), 0)::integer AS points, count(v.id)::integer AS villages
      FROM players p LEFT JOIN villages v ON v.player_id = p.id
      WHERE p.world_id = ${worldId}
      GROUP BY p.id, p.created_at
      ORDER BY points DESC, p.created_at ASC, p.id ASC`)
  ).rows as { id: number; points: number; villages: number }[];
  return new Map(rows.map((row, index) => [row.id, { ...row, rank: index + 1 }]));
}

/** Pontos (soma dos membros), aldeias e posição das tribos do mundo. */
export async function tribeStandings(tx: Transaction, worldId: number) {
  const rows = (
    await tx.execute(sql`
      SELECT t.id AS id, coalesce(sum(v.points), 0)::integer AS points, count(v.id)::integer AS villages
      FROM tribes t
      LEFT JOIN tribe_members m ON m.tribe_id = t.id
      LEFT JOIN villages v ON v.player_id = m.player_id
      WHERE t.world_id = ${worldId}
      GROUP BY t.id, t.created_at
      ORDER BY points DESC, t.created_at ASC, t.id ASC`)
  ).rows as { id: number; points: number; villages: number }[];
  return new Map(rows.map((row, index) => [row.id, { ...row, rank: index + 1 }]));
}

async function rosterOf(tx: Transaction, worldId: number, tribeId: number) {
  const ranks = await playerRanks(tx, worldId);
  const rows = await tx
    .select({ member: tribeMembers, username: accounts.username })
    .from(tribeMembers)
    .innerJoin(players, eq(players.id, tribeMembers.playerId))
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(tribeMembers.tribeId, tribeId));
  return rows
    .map(({ member, username }): TribeMemberView => {
      const standing = ranks.get(member.playerId);
      return {
        playerId: member.playerId,
        username,
        title: member.title,
        points: standing?.points ?? 0,
        villages: standing?.villages ?? 0,
        rank: standing?.rank ?? 0,
        joinedAt: member.joinedAt.toISOString(),
        rights: rightsOf(member),
      };
    })
    .sort(
      (a, b) =>
        Number(b.rights.isFounder) - Number(a.rights.isFounder) ||
        Number(b.rights.canLead) - Number(a.rights.canLead) ||
        b.points - a.points ||
        a.username.localeCompare(b.username),
    );
}

async function profileOf(
  tx: Transaction,
  worldId: number,
  tribeId: number,
  viewerPlayerId: number,
  roster?: TribeMemberView[],
): Promise<TribeProfile> {
  const [tribe] = await tx
    .select()
    .from(tribes)
    .where(and(eq(tribes.id, tribeId), eq(tribes.worldId, worldId)));
  if (!tribe) throw new GameError('Tribo não encontrada.', 404);
  const standing = (await tribeStandings(tx, worldId)).get(tribeId);
  const members = roster ?? (await rosterOf(tx, worldId, tribeId));
  return {
    id: tribe.id,
    name: tribe.name,
    tag: tribe.tag,
    points: standing?.points ?? 0,
    rank: standing?.rank ?? 0,
    villages: standing?.villages ?? 0,
    createdAt: tribe.createdAt.toISOString(),
    description: await renderBBCode(tx, worldId, tribe.description),
    members: members.map(({ playerId, username, title, points, rank }) => ({
      playerId,
      username,
      title,
      points,
      rank,
    })),
    isMember: members.some((member) => member.playerId === viewerPlayerId),
  };
}

async function overviewOf(
  tx: Transaction,
  worldId: number,
  member: MemberRow,
): Promise<TribeOverview> {
  const roster = await rosterOf(tx, worldId, member.tribeId);
  const [tribe] = await tx.select().from(tribes).where(eq(tribes.id, member.tribeId));
  const pending = await tx
    .select({ invite: tribeInvites, username: accounts.username })
    .from(tribeInvites)
    .innerJoin(players, eq(players.id, tribeInvites.playerId))
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(tribeInvites.tribeId, member.tribeId))
    .orderBy(desc(tribeInvites.createdAt));
  const inviters = new Map(roster.map((row) => [row.playerId, row.username]));
  const events = await tx
    .select()
    .from(tribeEvents)
    .where(eq(tribeEvents.tribeId, member.tribeId))
    .orderBy(desc(tribeEvents.createdAt), desc(tribeEvents.id))
    .limit(50);
  // As consultas de uma transação rodam uma de cada vez (a conexão é uma só).
  const eventViews = [];
  for (const event of events)
    eventViews.push({
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      content: await renderBBCode(tx, worldId, event.message),
    });
  return {
    profile: await profileOf(tx, worldId, member.tribeId, member.playerId, roster),
    descriptionText: tribe!.description,
    internalText: tribe!.internalText,
    internalContent: await renderBBCode(tx, worldId, tribe!.internalText),
    me: { playerId: member.playerId, rights: rightsOf(member) },
    members: roster,
    invites: pending.map(({ invite, username }) => ({
      id: invite.id,
      player: { id: invite.playerId, username },
      invitedBy: inviters.get(invite.invitedBy) ?? 'ex-membro',
      createdAt: invite.createdAt.toISOString(),
    })),
    events: eventViews,
    limits: { members: tribeLimits.members },
  };
}

async function homeOf(tx: Transaction, worldId: number, playerId: number): Promise<TribeHome> {
  const member = await membership(tx, playerId);
  const invites = await tx
    .select({
      id: tribeInvites.id,
      tribeId: tribes.id,
      name: tribes.name,
      tag: tribes.tag,
      by: accounts.username,
      createdAt: tribeInvites.createdAt,
    })
    .from(tribeInvites)
    .innerJoin(tribes, eq(tribes.id, tribeInvites.tribeId))
    .innerJoin(players, eq(players.id, tribeInvites.invitedBy))
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(tribeInvites.playerId, playerId))
    .orderBy(desc(tribeInvites.createdAt));
  return {
    tribe: member ? await overviewOf(tx, worldId, member) : null,
    invites: invites.map((row): MyTribeInvite => ({
      id: row.id,
      tribe: { id: row.tribeId, name: row.name, tag: row.tag },
      invitedBy: row.by,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

async function usernameOf(tx: Transaction, playerId: number) {
  const [row] = await tx
    .select({ username: accounts.username })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(players.id, playerId));
  return safe(row?.username ?? 'jogador');
}

export async function performTribeAction(
  tx: Transaction,
  worldId: number,
  playerId: number,
  action: TribeAction,
) {
  const mine = await membership(tx, playerId);
  const me = await usernameOf(tx, playerId);
  const requireMember = () => {
    if (!mine) throw new GameError('Você não pertence a uma tribo.', 403);
    return mine;
  };
  const requireRight = (right: keyof TribeRightsView, message: string) => {
    const member = requireMember();
    if (!member[right]) throw new GameError(message, 403);
    return member;
  };

  if (action.type === 'create') {
    if (mine) throw new GameError('Você já pertence a uma tribo. Saia dela antes de fundar outra.');
    const name = plain(action.name),
      tag = plain(action.tag);
    checkName(name);
    checkTag(tag);
    await requireFree(tx, worldId, name, tag);
    const [created] = await tx
      .insert(tribes)
      .values({
        worldId,
        name,
        tag,
        description: `[ally]${tag}[/ally] foi fundada por [player]${me}[/player].`,
        internalText: `Tribo fundada por [player]${me}[/player].\n\nEste texto só os membros veem e os líderes podem alterá-lo.`,
      })
      .returning();
    await tx.insert(tribeMembers).values({
      worldId,
      tribeId: created!.id,
      playerId,
      ...rightColumns(founderRights),
    });
    await tx.delete(tribeInvites).where(eq(tribeInvites.playerId, playerId));
    await logEvent(tx, worldId, created!.id, `Tribo fundada por [player]${me}[/player].`);
    return;
  }

  if (action.type === 'accept_invite' || action.type === 'decline_invite') {
    const [invite] = await tx
      .select()
      .from(tribeInvites)
      .where(and(eq(tribeInvites.id, action.inviteId), eq(tribeInvites.playerId, playerId)));
    if (!invite) throw new GameError('Convite não encontrado.', 404);
    if (action.type === 'decline_invite') {
      await tx.delete(tribeInvites).where(eq(tribeInvites.id, invite.id));
      return;
    }
    if (mine) throw new GameError('Você já pertence a uma tribo. Saia dela antes de aceitar.');
    const [{ count }] = (await tx
      .select({ count: sql<number>`count(*)::integer` })
      .from(tribeMembers)
      .where(eq(tribeMembers.tribeId, invite.tribeId))) as [{ count: number }];
    if (count >= tribeLimits.members)
      throw new GameError('Esta tribo já atingiu o limite de membros.');
    await tx.insert(tribeMembers).values({
      worldId,
      tribeId: invite.tribeId,
      playerId,
      ...rightColumns(normalizeRights({})),
    });
    await tx.delete(tribeInvites).where(eq(tribeInvites.playerId, playerId));
    await logEvent(tx, worldId, invite.tribeId, `[player]${me}[/player] entrou na tribo.`);
    return;
  }

  if (action.type === 'leave') {
    const member = requireMember();
    const roster = await tx
      .select()
      .from(tribeMembers)
      .where(eq(tribeMembers.tribeId, member.tribeId));
    if (roster.length === 1) {
      await tx.delete(tribes).where(eq(tribes.id, member.tribeId));
      return;
    }
    if (member.isFounder && roster.filter((row) => row.isFounder).length === 1)
      throw new GameError(
        'Você é o único fundador. Nomeie outro fundador ou dissolva a tribo antes de sair.',
      );
    await tx.delete(tribeMembers).where(eq(tribeMembers.playerId, playerId));
    await logEvent(tx, worldId, member.tribeId, `[player]${me}[/player] saiu da tribo.`);
    return;
  }

  if (action.type === 'disband') {
    const member = requireRight('isFounder', 'Só fundadores podem dissolver a tribo.');
    const [tribe] = await tx.select().from(tribes).where(eq(tribes.id, member.tribeId));
    const others = await tx
      .select({ playerId: tribeMembers.playerId })
      .from(tribeMembers)
      .where(eq(tribeMembers.tribeId, member.tribeId));
    for (const other of others)
      if (other.playerId !== playerId)
        await notify(tx, worldId, other.playerId, {
          kind: 'tribe',
          event: 'disbanded',
          tribeName: tribe!.name,
          tribeTag: tribe!.tag,
          by: me,
        });
    await tx.delete(tribes).where(eq(tribes.id, member.tribeId));
    return;
  }

  if (action.type === 'invite') {
    const member = requireRight('canInvite', 'Você não tem permissão para convidar.');
    const username = plain(action.username);
    if (username.length < 3) throw new GameError('Digite o nome do jogador.');
    const [target] = await tx
      .select({ id: players.id, username: accounts.username })
      .from(players)
      .innerJoin(accounts, eq(accounts.id, players.accountId))
      .where(
        and(eq(players.worldId, worldId), sql`lower(${accounts.username}) = lower(${username})`),
      );
    if (!target) throw new GameError('Jogador não encontrado neste mundo.', 404);
    if (target.id === playerId) throw new GameError('Você não pode convidar a si mesmo.');
    if (await membership(tx, target.id))
      throw new GameError(`${target.username} já pertence a uma tribo.`);
    const [existing] = await tx
      .select()
      .from(tribeInvites)
      .where(and(eq(tribeInvites.tribeId, member.tribeId), eq(tribeInvites.playerId, target.id)));
    if (existing) throw new GameError(`${target.username} já tem um convite pendente.`);
    const [{ count }] = (await tx
      .select({ count: sql<number>`count(*)::integer` })
      .from(tribeMembers)
      .where(eq(tribeMembers.tribeId, member.tribeId))) as [{ count: number }];
    if (count >= tribeLimits.members)
      throw new GameError('A tribo já atingiu o limite de membros.');
    const [tribe] = await tx.select().from(tribes).where(eq(tribes.id, member.tribeId));
    await tx
      .insert(tribeInvites)
      .values({ worldId, tribeId: member.tribeId, playerId: target.id, invitedBy: playerId });
    await notify(tx, worldId, target.id, {
      kind: 'tribe',
      event: 'invited',
      tribeName: tribe!.name,
      tribeTag: tribe!.tag,
      by: me,
    });
    await logEvent(
      tx,
      worldId,
      member.tribeId,
      `[player]${me}[/player] convidou [player]${safe(target.username)}[/player].`,
    );
    return;
  }

  if (action.type === 'cancel_invite') {
    const member = requireRight('canInvite', 'Você não tem permissão para cancelar convites.');
    const removed = await tx
      .delete(tribeInvites)
      .where(and(eq(tribeInvites.id, action.inviteId), eq(tribeInvites.tribeId, member.tribeId)))
      .returning({ id: tribeInvites.id });
    if (!removed.length) throw new GameError('Convite não encontrado.', 404);
    return;
  }

  if (action.type === 'kick' || action.type === 'rights') {
    const actor = requireRight('canLead', 'Você não tem permissão para administrar os membros.');
    const [target] = await tx
      .select()
      .from(tribeMembers)
      .where(
        and(eq(tribeMembers.playerId, action.playerId), eq(tribeMembers.tribeId, actor.tribeId)),
      );
    if (!target) throw new GameError('Este jogador não pertence à sua tribo.', 404);
    if (!canManageMember(rightsOf(actor), rightsOf(target)))
      throw new GameError('Só fundadores podem alterar ou expulsar um fundador.', 403);
    const targetName = await usernameOf(tx, target.playerId);
    if (action.type === 'kick') {
      if (target.playerId === playerId)
        throw new GameError('Para sair da tribo, use a opção "Sair da tribo".');
      const [tribe] = await tx.select().from(tribes).where(eq(tribes.id, actor.tribeId));
      await tx.delete(tribeMembers).where(eq(tribeMembers.playerId, target.playerId));
      await notify(tx, worldId, target.playerId, {
        kind: 'tribe',
        event: 'kicked',
        tribeName: tribe!.name,
        tribeTag: tribe!.tag,
        by: me,
      });
      await logEvent(
        tx,
        worldId,
        actor.tribeId,
        `[player]${me}[/player] expulsou [player]${targetName}[/player] da tribo.`,
      );
      return;
    }
    const title = plain(action.title);
    if ([...title].length > tribeLimits.title)
      throw new GameError(`O cargo pode ter no máximo ${tribeLimits.title} caracteres.`);
    const next = normalizeRights({ ...rightsOf(target), ...action.rights });
    if (next.isFounder && !target.isFounder && !actor.isFounder)
      throw new GameError('Só fundadores podem nomear fundadores.', 403);
    if (target.isFounder && !next.isFounder) {
      const founders = await tx
        .select({ id: tribeMembers.playerId })
        .from(tribeMembers)
        .where(and(eq(tribeMembers.tribeId, actor.tribeId), eq(tribeMembers.isFounder, true)));
      if (founders.length <= 1) throw new GameError('A tribo precisa de pelo menos um fundador.');
    }
    await tx
      .update(tribeMembers)
      .set({ title, ...rightColumns(next) })
      .where(eq(tribeMembers.playerId, target.playerId));
    await logEvent(
      tx,
      worldId,
      actor.tribeId,
      `[player]${me}[/player] alterou o cargo e as permissões de [player]${targetName}[/player].`,
    );
    return;
  }

  if (action.type === 'edit') {
    const member = requireMember();
    const [tribe] = await tx.select().from(tribes).where(eq(tribes.id, member.tribeId));
    const changes: Partial<typeof tribes.$inferInsert> = {};
    if (action.name !== undefined || action.tag !== undefined) {
      if (!member.isFounder) throw new GameError('Só fundadores podem mudar o nome e a tag.', 403);
      const name = action.name === undefined ? tribe!.name : plain(action.name),
        tag = action.tag === undefined ? tribe!.tag : plain(action.tag);
      checkName(name);
      checkTag(tag);
      await requireFree(tx, worldId, name, tag, member.tribeId);
      changes.name = name;
      changes.tag = tag;
    }
    if (action.description !== undefined) {
      if (!member.canDiplomacy)
        throw new GameError('Você não tem permissão para editar o perfil público.', 403);
      changes.description = checkText(action.description, 'O perfil público');
    }
    if (action.internalText !== undefined) {
      if (!member.canLead)
        throw new GameError('Você não tem permissão para editar o texto interno.', 403);
      changes.internalText = checkText(action.internalText, 'O texto interno');
    }
    if (!Object.keys(changes).length) throw new GameError('Nada para alterar.');
    await tx.update(tribes).set(changes).where(eq(tribes.id, member.tribeId));
    const parts = [
      changes.name !== undefined && changes.name !== tribe!.name ? 'o nome' : null,
      changes.tag !== undefined && changes.tag !== tribe!.tag ? 'a tag' : null,
      changes.description !== undefined ? 'o perfil público' : null,
      changes.internalText !== undefined ? 'o texto interno' : null,
    ].filter(Boolean);
    if (parts.length)
      await logEvent(
        tx,
        worldId,
        member.tribeId,
        `[player]${me}[/player] alterou ${parts.join(', ')}.`,
      );
    return;
  }
}

export async function readTribes(accountId: number, worldId: number): Promise<TribeHome> {
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    return homeOf(tx, worldId, player.id);
  });
}

export async function readTribe(
  accountId: number,
  worldId: number,
  tribeId: number,
): Promise<TribeProfile> {
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    return profileOf(tx, worldId, tribeId, player.id);
  });
}

export async function mutateTribes(
  accountId: number,
  worldId: number,
  action: TribeAction,
): Promise<TribeHome> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const player = await memberPlayer(tx, accountId, worldId);
    await performTribeAction(tx, worldId, player.id, action);
    return homeOf(tx, worldId, player.id);
  });
}
