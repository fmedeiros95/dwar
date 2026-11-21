import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { db, playerNotes, villages, type Transaction } from '@dwar/database';
import type { PlayerNote, NotesOverview } from '@dwar/api-client';
import { GameError } from './errors.js';
import { memberPlayer } from './reports.js';
import { renderBBCode } from './bbcode.js';

const maxLength = 10000;

async function villageInfo(tx: Transaction, worldId: number, villageId: number) {
  const [row] = await tx
    .select({ id: villages.id, name: villages.name, x: villages.x, y: villages.y })
    .from(villages)
    .where(and(eq(villages.id, villageId), eq(villages.worldId, worldId)));
  if (!row) throw new GameError('Aldeia não encontrada.', 404);
  return { name: row.name, x: row.x, y: row.y };
}

async function noteView(
  tx: Transaction,
  worldId: number,
  playerId: number,
  villageId: number | null,
): Promise<PlayerNote> {
  const village = villageId === null ? null : await villageInfo(tx, worldId, villageId);
  const [row] = await tx
    .select()
    .from(playerNotes)
    .where(
      and(
        eq(playerNotes.worldId, worldId),
        eq(playerNotes.playerId, playerId),
        villageId === null ? isNull(playerNotes.villageId) : eq(playerNotes.villageId, villageId),
      ),
    );
  const text = row?.body ?? '';
  return {
    villageId,
    village,
    text,
    content: text ? await renderBBCode(tx, worldId, text) : [],
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

/** A nota geral e a lista das aldeias que têm nota (mais recentes primeiro). */
export async function notesOverview(accountId: number, worldId: number): Promise<NotesOverview> {
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    const rows = await tx
      .select({
        villageId: playerNotes.villageId,
        name: villages.name,
        x: villages.x,
        y: villages.y,
        updatedAt: playerNotes.updatedAt,
        excerpt: sql<string>`left(${playerNotes.body}, 140)`,
      })
      .from(playerNotes)
      .innerJoin(villages, eq(villages.id, playerNotes.villageId))
      .where(
        and(
          eq(playerNotes.worldId, worldId),
          eq(playerNotes.playerId, player.id),
          isNotNull(playerNotes.villageId),
        ),
      )
      .orderBy(desc(playerNotes.updatedAt), desc(playerNotes.id));
    return {
      general: await noteView(tx, worldId, player.id, null),
      villages: rows.map((row) => ({
        villageId: row.villageId!,
        name: row.name,
        x: row.x,
        y: row.y,
        excerpt: row.excerpt,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  });
}

export async function readPlayerNote(
  accountId: number,
  worldId: number,
  villageId: number | null,
): Promise<PlayerNote> {
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    return noteView(tx, worldId, player.id, villageId);
  });
}

/** Grava a nota; texto vazio apaga. Regravar o mesmo texto não muda nada além da data. */
export async function savePlayerNote(
  accountId: number,
  worldId: number,
  villageId: number | null,
  text: string,
): Promise<PlayerNote> {
  if (typeof text !== 'string' || [...text].length > maxLength)
    throw new GameError(
      `A nota pode ter no máximo ${maxLength.toLocaleString('pt-BR')} caracteres.`,
    );
  return db.transaction(async (tx) => {
    const player = await memberPlayer(tx, accountId, worldId);
    if (villageId !== null) await villageInfo(tx, worldId, villageId);
    const scope = and(
      eq(playerNotes.worldId, worldId),
      eq(playerNotes.playerId, player.id),
      villageId === null ? isNull(playerNotes.villageId) : eq(playerNotes.villageId, villageId),
    );
    if (!text.trim()) await tx.delete(playerNotes).where(scope);
    else if (villageId === null)
      await tx
        .insert(playerNotes)
        .values({ worldId, playerId: player.id, villageId: null, body: text })
        .onConflictDoUpdate({
          target: playerNotes.playerId,
          targetWhere: sql`${playerNotes.villageId} IS NULL`,
          set: { body: text, updatedAt: new Date() },
        });
    else
      await tx
        .insert(playerNotes)
        .values({ worldId, playerId: player.id, villageId, body: text })
        .onConflictDoUpdate({
          target: [playerNotes.playerId, playerNotes.villageId],
          targetWhere: sql`${playerNotes.villageId} IS NOT NULL`,
          set: { body: text, updatedAt: new Date() },
        });
    return noteView(tx, worldId, player.id, villageId);
  });
}
