import { sql } from 'drizzle-orm';
import type { Transaction } from '@dwar/database';
import { militaryRank } from '@dwar/game-core';
import type { PlayerStanding } from '@dwar/api-client';

/**
 * Total de pontos (soma de todas as aldeias), posição no ranking e quantidade de jogadores do
 * mundo. Usa o mesmo critério do ranking (mais pontos primeiro; empate vai para o mais antigo) e
 * compara tudo dentro do banco, sem carregar a lista inteira, porque o snapshot da aldeia é lido o
 * tempo todo.
 */
export async function playerStanding(
  tx: Transaction,
  worldId: number,
  playerId: number,
): Promise<PlayerStanding> {
  const result = await tx.execute(sql`
    WITH totals AS (
      SELECT p.id, p.created_at, coalesce(sum(v.points), 0)::integer AS points,
        count(v.id)::integer AS villages
      FROM players p LEFT JOIN villages v ON v.player_id = p.id
      WHERE p.world_id = ${worldId}
      GROUP BY p.id, p.created_at
    )
    SELECT me.points, me.villages,
      (SELECT count(*) FROM totals o
        WHERE o.points > me.points
          OR (o.points = me.points AND (o.created_at, o.id) < (me.created_at, me.id)))::integer + 1 AS rank,
      (SELECT count(*) FROM totals)::integer AS players
    FROM totals me WHERE me.id = ${playerId}`);
  const [row] = (result as unknown as { rows: Omit<PlayerStanding, 'rankTitle'>[] }).rows;
  const standing = row ?? { points: 0, villages: 0, rank: 1, players: 1 };
  return { ...standing, rankTitle: militaryRank(standing.points).title };
}
