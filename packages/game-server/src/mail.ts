import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  db,
  accounts,
  players,
  villages,
  mailThreads,
  mailPosts,
  mailBlocks,
  mailOperations,
  type Transaction,
} from '@dwar/database';
import { messageTokens, messageHttpUrl, type MessageToken } from '@dwar/game-core';
import type {
  MailboxSnapshot,
  MailThreadView,
  MailSummary,
  MailPerson,
  MailAction,
  MessageNode,
} from '@dwar/api-client';
import { GameError } from './errors.js';
import { lockWorld, ownedVillage } from './village-engine.js';
type Thread = typeof mailThreads.$inferSelect;
const active = (playerId: number) =>
  or(
    and(eq(mailThreads.senderPlayerId, playerId), eq(mailThreads.senderDeleted, false)),
    and(eq(mailThreads.recipientPlayerId, playerId), eq(mailThreads.recipientDeleted, false)),
  );
function validText(value: string, title = false) {
  if (
    typeof value !== 'string' ||
    value.replaceAll('&nbsp;', '').trim().length < 3 ||
    [...value].length > (title ? 120 : 16000)
  )
    throw new GameError(
      title
        ? 'O assunto deve ter entre 3 e 120 caracteres.'
        : 'A mensagem deve ter entre 3 e 16.000 caracteres.',
    );
  return value;
}
export function previewMessage(text: string) {
  return { text: validText(text) };
}
async function person(tx: Transaction, worldId: number, name: string): Promise<MailPerson> {
  const [row] = await tx
    .select({ id: players.id, username: accounts.username })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(
      and(eq(players.worldId, worldId), sql`lower(${accounts.username})=lower(${name.trim()})`),
    );
  if (!row) throw new GameError('Jogador não encontrado neste mundo.', 404);
  return row;
}
async function people(tx: Transaction, ids: number[]) {
  const rows = await tx
    .select({ id: players.id, username: accounts.username })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(inArray(players.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, row]));
}
async function ownedThread(
  tx: Transaction,
  worldId: number,
  playerId: number,
  id: number,
): Promise<Thread> {
  const [thread] = await tx
    .select()
    .from(mailThreads)
    .where(and(eq(mailThreads.worldId, worldId), eq(mailThreads.id, id), active(playerId)));
  if (!thread) throw new GameError('Mensagem não encontrada.', 404);
  return thread;
}
async function canSend(tx: Transaction, worldId: number, sender: number, recipient: number) {
  if (sender === recipient) throw new GameError('Não é possível enviar mensagens para si mesmo.');
  const [blocked] = await tx
    .select()
    .from(mailBlocks)
    .where(
      and(
        eq(mailBlocks.worldId, worldId),
        eq(mailBlocks.blockerPlayerId, recipient),
        eq(mailBlocks.blockedPlayerId, sender),
      ),
    );
  if (blocked) throw new GameError('Este jogador bloqueou suas mensagens.', 403);
}
function summary(
  thread: Thread,
  playerId: number,
  known: Map<number, MailPerson>,
  postCount: number,
): MailSummary {
  const sender = thread.senderPlayerId === playerId;
  return {
    id: thread.id,
    title: thread.title,
    partner: known.get(sender ? thread.recipientPlayerId : thread.senderPlayerId)!,
    status: sender ? thread.senderStatus : thread.recipientStatus,
    partnerStatus: sender ? thread.recipientStatus : thread.senderStatus,
    postCount,
    lastPostAt: thread.lastPostAt.toISOString(),
  };
}
export async function mailboxView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  page: number,
): Promise<MailboxSnapshot> {
  const [total] = await tx
    .select({ count: count() })
    .from(mailThreads)
    .where(and(eq(mailThreads.worldId, worldId), active(playerId)));
  const pageCount = Math.max(1, Math.ceil(total!.count / 25)),
    current = Math.max(1, Math.min(pageCount, page));
  const rows = await tx
    .select()
    .from(mailThreads)
    .where(and(eq(mailThreads.worldId, worldId), active(playerId)))
    .orderBy(desc(mailThreads.lastPostAt), desc(mailThreads.id))
    .limit(25)
    .offset((current - 1) * 25);
  const blocks = await tx
    .select()
    .from(mailBlocks)
    .where(and(eq(mailBlocks.worldId, worldId), eq(mailBlocks.blockerPlayerId, playerId)));
  const known = await people(tx, [
    playerId,
    ...rows.flatMap((row) => [row.senderPlayerId, row.recipientPlayerId]),
    ...blocks.map((row) => row.blockedPlayerId),
  ]);
  const counts = rows.length
    ? await tx
        .select({ id: mailPosts.threadId, count: count() })
        .from(mailPosts)
        .where(
          inArray(
            mailPosts.threadId,
            rows.map((row) => row.id),
          ),
        )
        .groupBy(mailPosts.threadId)
    : [];
  const [unread] = await tx
    .select({ count: count() })
    .from(mailThreads)
    .where(
      and(
        eq(mailThreads.worldId, worldId),
        active(playerId),
        or(
          and(eq(mailThreads.senderPlayerId, playerId), eq(mailThreads.senderStatus, 'new')),
          and(eq(mailThreads.recipientPlayerId, playerId), eq(mailThreads.recipientStatus, 'new')),
        ),
      ),
    );
  return {
    page: current,
    pageCount,
    total: total!.count,
    unread: unread!.count,
    threads: rows.map((row) =>
      summary(row, playerId, known, counts.find((c) => c.id === row.id)?.count ?? 0),
    ),
    blocked: blocks
      .map((row) => known.get(row.blockedPlayerId)!)
      .sort((a, b) => a.username.localeCompare(b.username)),
  };
}
async function content(
  tx: Transaction,
  worldId: number,
  tokens: MessageToken[],
): Promise<MessageNode[]> {
  const result: MessageNode[] = [];
  for (const token of tokens) {
    if (token.tag === 'text') {
      result.push({ type: 'text', text: token.text });
      continue;
    }
    if (token.tag === 'b' || token.tag === 'i' || token.tag === 'u' || token.tag === 's') {
      result.push({ type: token.tag, children: await content(tx, worldId, token.children) });
      continue;
    }
    if (token.tag === 'url') {
      const href = messageHttpUrl(token.argument ?? token.value);
      result.push(
        ...(href
          ? [{ type: 'link' as const, href, children: await content(tx, worldId, token.children) }]
          : [{ type: 'text' as const, text: token.value }]),
      );
      continue;
    }
    if (token.tag === 'img') {
      const src = messageHttpUrl(token.value);
      result.push(src ? { type: 'image', src } : { type: 'text', text: token.value });
      continue;
    }
    if (token.tag === 'player') {
      const [row] = await tx
        .select({ id: players.id, username: accounts.username })
        .from(players)
        .innerJoin(accounts, eq(accounts.id, players.accountId))
        .where(
          and(
            eq(players.worldId, worldId),
            sql`lower(${accounts.username})=lower(${token.value.trim()})`,
          ),
        );
      result.push(
        row
          ? { type: 'player', id: row.id, label: row.username }
          : { type: 'text', text: token.value },
      );
      continue;
    }
    if (token.tag === 'village') {
      const coordinates = /^\s*\(?\s*(\d{1,3})\s*\|\s*(\d{1,3})\s*\)?\s*$/.exec(token.value);
      if (coordinates) {
        const [row] = await tx
          .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y })
          .from(villages)
          .where(
            and(
              eq(villages.worldId, worldId),
              eq(villages.x, Number(coordinates[1])),
              eq(villages.y, Number(coordinates[2])),
            ),
          );
        if (row) {
          result.push({
            type: 'village',
            id: row.id,
            label: `${row.name} (${row.x}|${row.y}) K${Math.floor(row.y / 100)}${Math.floor(row.x / 100)}`,
          });
          continue;
        }
      }
    }
    result.push({ type: 'text', text: token.value });
  }
  return result;
}
export async function threadView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  id: number,
): Promise<MailThreadView> {
  const thread = await ownedThread(tx, worldId, playerId, id);
  const posts = await tx
    .select()
    .from(mailPosts)
    .where(and(eq(mailPosts.worldId, worldId), eq(mailPosts.threadId, id)))
    .orderBy(desc(mailPosts.createdAt), desc(mailPosts.id));
  const known = await people(tx, [thread.senderPlayerId, thread.recipientPlayerId]);
  const rendered = [];
  for (const post of posts)
    rendered.push({
      id: post.id,
      author: known.get(post.authorPlayerId)!,
      text: post.text,
      content: await content(tx, worldId, messageTokens(post.text)),
      createdAt: post.createdAt.toISOString(),
    });
  return { ...summary(thread, playerId, known, posts.length), posts: rendered };
}
export async function performMailAction(
  tx: Transaction,
  worldId: number,
  playerId: number,
  action: MailAction,
  requestId: string,
  now: Date,
): Promise<{ threadId: number | null }> {
  const normalized =
    action.type === 'delete'
      ? { ...action, threadIds: [...new Set(action.threadIds)].sort() }
      : action;
  const fingerprint = JSON.stringify(normalized);
  const [prior] = await tx
    .select()
    .from(mailOperations)
    .where(and(eq(mailOperations.playerId, playerId), eq(mailOperations.requestId, requestId)));
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      throw new GameError('Esta solicitação já foi usada para outra ação.', 409);
    return { threadId: prior.resultThreadId };
  }
  let threadId: number | null = null;
  if (action.type === 'send') {
    const to = await person(tx, worldId, action.recipient);
    await canSend(tx, worldId, playerId, to.id);
    const [thread] = await tx
      .insert(mailThreads)
      .values({
        worldId,
        senderPlayerId: playerId,
        recipientPlayerId: to.id,
        title: validText(action.title, true),
        lastPostAt: now,
      })
      .returning();
    threadId = thread!.id;
    await tx.insert(mailPosts).values({
      worldId,
      threadId,
      authorPlayerId: playerId,
      text: validText(action.text),
      createdAt: now,
    });
  } else if (action.type === 'reply' || action.type === 'read') {
    const thread = await ownedThread(tx, worldId, playerId, action.threadId),
      sender = thread.senderPlayerId === playerId;
    threadId = thread.id;
    if (action.type === 'read') {
      if ((sender ? thread.senderStatus : thread.recipientStatus) === 'new')
        await tx
          .update(mailThreads)
          .set(sender ? { senderStatus: 'read' } : { recipientStatus: 'read' })
          .where(eq(mailThreads.id, thread.id));
    } else {
      await canSend(
        tx,
        worldId,
        playerId,
        sender ? thread.recipientPlayerId : thread.senderPlayerId,
      );
      const postTime = new Date(Math.max(now.getTime(), thread.lastPostAt.getTime() + 1));
      await tx.insert(mailPosts).values({
        worldId,
        threadId: thread.id,
        authorPlayerId: playerId,
        text: validText(action.text),
        createdAt: postTime,
      });
      await tx
        .update(mailThreads)
        .set({
          lastPostAt: postTime,
          ...(sender
            ? { senderStatus: 'answered' as const, recipientStatus: 'new' as const }
            : { senderStatus: 'new' as const, recipientStatus: 'answered' as const }),
        })
        .where(eq(mailThreads.id, thread.id));
    }
  } else if (action.type === 'delete') {
    if (action.threadIds.length < 1 || action.threadIds.length > 25)
      throw new GameError('Selecione entre 1 e 25 mensagens.');
    for (const id of [...new Set(action.threadIds)]) {
      const [thread] = await tx
        .select()
        .from(mailThreads)
        .where(
          and(
            eq(mailThreads.worldId, worldId),
            eq(mailThreads.id, id),
            or(
              eq(mailThreads.senderPlayerId, playerId),
              eq(mailThreads.recipientPlayerId, playerId),
            ),
          ),
        );
      if (!thread) throw new GameError('Mensagem não encontrada.', 404);
      await tx
        .update(mailThreads)
        .set(
          thread.senderPlayerId === playerId ? { senderDeleted: true } : { recipientDeleted: true },
        )
        .where(eq(mailThreads.id, id));
    }
  } else if (action.type === 'block') {
    const target = await person(tx, worldId, action.username);
    if (target.id === playerId) throw new GameError('Não é possível bloquear a si mesmo.');
    const inserted = await tx
      .insert(mailBlocks)
      .values({ worldId, blockerPlayerId: playerId, blockedPlayerId: target.id })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) throw new GameError('Este jogador já está bloqueado.');
  } else {
    await tx
      .delete(mailBlocks)
      .where(
        and(
          eq(mailBlocks.worldId, worldId),
          eq(mailBlocks.blockerPlayerId, playerId),
          eq(mailBlocks.blockedPlayerId, action.playerId),
        ),
      );
  }
  await tx.insert(mailOperations).values({
    worldId,
    playerId,
    requestId,
    fingerprint,
    resultThreadId: threadId,
    createdAt: now,
  });
  return { threadId };
}

export async function readMailbox(accountId: number, worldId: number, page: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return mailboxView(tx, worldId, village.playerId, page);
  });
}

export async function readMailThread(accountId: number, worldId: number, threadId: number) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return threadView(tx, worldId, village.playerId, threadId);
  });
}

export async function previewMailMessage(accountId: number, worldId: number, text: string) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    await ownedVillage(tx, accountId, worldId);
    return previewMessage(text);
  });
}

export async function mutateMail(
  accountId: number,
  worldId: number,
  action: MailAction,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return performMailAction(tx, worldId, village.playerId, action, requestId, new Date());
  });
}
