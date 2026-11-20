import { and, eq, sql } from 'drizzle-orm';
import { accounts, players, mapPreferences, mapMarks, type Transaction } from '@dwar/database';
import { defaultMapSettings } from '@dwar/game-config';
import type { MapAction, MapMark } from '@dwar/api-client';
import { GameError } from './errors.js';

export async function mapOptions(tx: Transaction, playerId: number) {
  const [saved] = await tx
    .select()
    .from(mapPreferences)
    .where(eq(mapPreferences.playerId, playerId));
  const marks: MapMark[] = await tx
    .select({
      playerId: mapMarks.targetPlayerId,
      color: mapMarks.color,
      username: accounts.username,
    })
    .from(mapMarks)
    .innerJoin(players, eq(players.id, mapMarks.targetPlayerId))
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(mapMarks.playerId, playerId));
  return { settings: saved?.settings ?? { ...defaultMapSettings }, marks };
}
export async function performMapAction(
  tx: Transaction,
  worldId: number,
  playerId: number,
  action: MapAction,
) {
  if (action.type === 'settings') {
    const { width, height, minimapSize, contextMenu, popup } = action.settings;
    if (
      ![width, height].every((n) => Number.isInteger(n) && n >= 4 && n <= 30) ||
      !Number.isInteger(minimapSize) ||
      minimapSize < 20 ||
      minimapSize > 120 ||
      minimapSize % 5 !== 0 ||
      typeof contextMenu !== 'boolean' ||
      typeof popup !== 'boolean'
    )
      throw new GameError('Opções de mapa inválidas.');
    if (minimapSize * 5 > Math.min(width, height) * 60)
      throw new GameError('Reduza o minimapa para caber no tamanho escolhido para o mapa.');
    const settings = { width, height, minimapSize, contextMenu, popup };
    await tx
      .insert(mapPreferences)
      .values({ playerId, settings })
      .onConflictDoUpdate({ target: mapPreferences.playerId, set: { settings } });
  } else if (action.type === 'unmark') {
    await tx
      .delete(mapMarks)
      .where(and(eq(mapMarks.playerId, playerId), eq(mapMarks.targetPlayerId, action.playerId)));
  } else {
    if (!/^#[0-9a-f]{6}$/i.test(action.color))
      throw new GameError('Use uma cor hexadecimal com seis dígitos.');
    const [target] = await tx
      .select({ id: players.id })
      .from(players)
      .innerJoin(accounts, eq(accounts.id, players.accountId))
      .where(
        and(
          eq(players.worldId, worldId),
          sql`lower(${accounts.username}) = lower(${action.username.trim()})`,
        ),
      );
    if (!target) throw new GameError('Jogador não encontrado neste mundo.', 404);
    if (target.id === playerId)
      throw new GameError('Você não pode marcar suas próprias aldeias no mapa.');
    const color = action.color.toLowerCase();
    await tx
      .insert(mapMarks)
      .values({ worldId, playerId, targetPlayerId: target.id, color })
      .onConflictDoUpdate({ target: [mapMarks.playerId, mapMarks.targetPlayerId], set: { color } });
  }
}
