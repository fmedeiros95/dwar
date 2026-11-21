import { db, villages, pool } from '../packages/database/dist/index.js';
import { villagePoints } from '../packages/game-core/dist/index.js';

// Recalcula os pontos de todas as aldeias a partir dos níveis das construções (como o
// reload_all_village_points do Speed Wars). Os pontos dos jogadores são a soma das aldeias, então
// o ranking se corrige junto. Pode rodar quantas vezes quiser: o resultado é sempre o mesmo.
try {
  const all = await db.select().from(villages);
  let changed = 0;
  let delta = 0;
  for (const village of all) {
    const points = villagePoints(village.buildings);
    if (points === village.points) continue;
    await pool.query('UPDATE villages SET points = $1 WHERE id = $2', [points, village.id]);
    changed += 1;
    delta += points - village.points;
  }
  console.log(
    JSON.stringify({ aldeias: all.length, corrigidas: changed, variacaoTotalDePontos: delta }, null, 2),
  );
} finally {
  await pool.end();
}
