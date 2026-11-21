import { eq } from 'drizzle-orm';
import {
  accounts,
  noticeReports,
  players,
  tribeEvents,
  tribeMembers,
  type Transaction,
} from '@dwar/database';
import type { NoticePayload } from '@dwar/game-config';
import type { TribeRightsView } from '@dwar/api-client';

export type MemberRow = typeof tribeMembers.$inferSelect;
export type TribeNotice = Extract<NoticePayload, { kind: 'tribe' }>;

export const rightsOf = (member: MemberRow): TribeRightsView => ({
  isFounder: member.isFounder,
  canLead: member.canLead,
  canInvite: member.canInvite,
  canDiplomacy: member.canDiplomacy,
  canMassMail: member.canMassMail,
  canModerate: member.canModerate,
  canHiddenForum: member.canHiddenForum,
});

/** Nomes entram em textos com BBCode; colchetes quebrariam a leitura. */
export const safe = (name: string) => name.replaceAll('[', '(').replaceAll(']', ')');
export const plain = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export async function membership(tx: Transaction, playerId: number) {
  const [row] = await tx.select().from(tribeMembers).where(eq(tribeMembers.playerId, playerId));
  return row;
}

export async function logEvent(tx: Transaction, worldId: number, tribeId: number, message: string) {
  await tx.insert(tribeEvents).values({ worldId, tribeId, message });
}

export async function notify(
  tx: Transaction,
  worldId: number,
  playerId: number,
  payload: TribeNotice,
) {
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

export async function usernameOf(tx: Transaction, playerId: number) {
  const [row] = await tx
    .select({ username: accounts.username })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(players.id, playerId));
  return safe(row?.username ?? 'jogador');
}

/** Avisa os membros de uma tribo; `only` restringe a quem tem uma permissão. */
export async function notifyTribe(
  tx: Transaction,
  worldId: number,
  tribeId: number,
  payload: TribeNotice,
  only?: (member: MemberRow) => boolean,
) {
  const members = await tx.select().from(tribeMembers).where(eq(tribeMembers.tribeId, tribeId));
  for (const member of members)
    if (!only || only(member)) await notify(tx, worldId, member.playerId, payload);
}
