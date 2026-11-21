import { eq, inArray } from 'drizzle-orm';
import { tribeMembers, tribes, type Transaction } from '@dwar/database';
import type { TribeRef } from '@dwar/api-client';

/** Tribo de cada jogador da lista (quem não tem tribo não aparece no mapa de resultados). */
export async function tribesOf(
  tx: Transaction,
  playerIds: number[],
): Promise<Map<number, TribeRef>> {
  const unique = [...new Set(playerIds)];
  if (!unique.length) return new Map();
  const rows = await tx
    .select({ playerId: tribeMembers.playerId, id: tribes.id, name: tribes.name, tag: tribes.tag })
    .from(tribeMembers)
    .innerJoin(tribes, eq(tribes.id, tribeMembers.tribeId))
    .where(inArray(tribeMembers.playerId, unique));
  return new Map(rows.map((row) => [row.playerId, { id: row.id, name: row.name, tag: row.tag }]));
}
