import { and, eq } from 'drizzle-orm';
import { villages, worldPlacement, type Transaction } from '@dwar/database';
import {
  initialPlacement,
  placeVillage,
  quadrantOf,
  quadrants,
  worldCenter,
  type Placement,
  type PlacementStream,
} from '@dwar/game-core';
import { randomInt } from 'node:crypto';
import { GameError } from './errors.js';

/**
 * Lê o estado do posicionamento. Mundos que já tinham aldeias antes desta regra começam com o
 * raio-base de cada quadrante igual ao raio médio das aldeias que ele já tem.
 */
async function loadPlacement(
  tx: Transaction,
  worldId: number,
  stream: PlacementStream,
): Promise<Placement> {
  const rows = await tx
    .select()
    .from(worldPlacement)
    .where(and(eq(worldPlacement.worldId, worldId), eq(worldPlacement.stream, stream)));
  const state = initialPlacement();
  if (rows.length) {
    for (const row of rows)
      state[row.quadrant] = { count: row.count, ring: row.ring, alpha: row.alpha };
    return state;
  }
  const existing = await tx
    .select({ x: villages.x, y: villages.y, barbarian: villages.foundedAsBarbarian })
    .from(villages)
    .where(eq(villages.worldId, worldId));
  const sums = Object.fromEntries(quadrants.map((item) => [item, 0])) as Record<
    (typeof quadrants)[number],
    number
  >;
  for (const row of existing) {
    if ((stream === 'barbarian') !== row.barbarian) continue;
    const quadrant = quadrantOf(row);
    state[quadrant].count += 1;
    sums[quadrant] += Math.hypot(row.x - worldCenter, row.y - worldCenter);
  }
  for (const quadrant of quadrants)
    if (state[quadrant].count)
      state[quadrant].ring = Math.max(1, Math.floor(sums[quadrant] / state[quadrant].count));
  return state;
}

/** Escolhe e reserva a posição de uma aldeia nova (de jogador ou bárbara). */
export async function nextVillagePosition(
  tx: Transaction,
  worldId: number,
  stream: PlacementStream,
): Promise<{ x: number; y: number }> {
  const occupied = new Set(
    (
      await tx
        .select({ x: villages.x, y: villages.y })
        .from(villages)
        .where(eq(villages.worldId, worldId))
    ).map((row) => `${row.x},${row.y}`),
  );
  const state = await loadPlacement(tx, worldId, stream);
  let result;
  try {
    result = placeVillage(state, occupied, stream, (minimum, maximum) =>
      randomInt(minimum, maximum + 1),
    );
  } catch {
    throw new GameError('Não há espaço livre no mapa para uma nova aldeia.', 409);
  }
  for (const quadrant of quadrants)
    await tx
      .insert(worldPlacement)
      .values({ worldId, stream, quadrant, ...result.state[quadrant] })
      .onConflictDoUpdate({
        target: [worldPlacement.worldId, worldPlacement.stream, worldPlacement.quadrant],
        set: result.state[quadrant],
      });
  return result.point;
}
