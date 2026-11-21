import { and, eq } from 'drizzle-orm';
import { players, type Transaction } from '@dwar/database';
import { GameError } from './errors.js';

/** O jogador da conta neste mundo; quem ainda não entrou não consulta relatórios, notas nem medalhas. */
export async function memberPlayer(tx: Transaction, accountId: number, worldId: number) {
  const [player] = await tx
    .select()
    .from(players)
    .where(and(eq(players.accountId, accountId), eq(players.worldId, worldId)));
  if (!player) throw new GameError('Entre neste mundo antes de continuar.', 403);
  return player;
}
