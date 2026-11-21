import { and, eq } from 'drizzle-orm';
import { db, unitPlacements, villages } from '@dwar/database';
import { units, unitCodes } from '@dwar/game-config';
import { troopDuration, emptyTroops } from '@dwar/game-core';
import type { MapAction, VillagePopupInfo } from '@dwar/api-client';
import { assessTarget } from './combat.js';
import { GameError } from './errors.js';
import { performMapAction } from './map-options.js';
import { mapView, publicPlayerView, publicVillageView } from './rally.js';
import { lockWorld, ownedVillage } from './village-engine.js';

export async function mutateMap(
  accountId: number,
  worldId: number,
  villageId: number,
  action: MapAction,
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId, villageId);
    if (!village.playerId) throw new GameError('Aldeia sem proprietário.', 403);
    await performMapAction(tx, worldId, village.playerId, action);
  });
}

export async function readMap(
  accountId: number,
  worldId: number,
  villageId: number,
  x: number,
  y: number,
  span?: number,
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId, villageId);
    return mapView(tx, village, x, y, span);
  });
}

export async function readMapVillage(
  accountId: number,
  worldId: number,
  villageId: number,
  targetId: number,
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    return publicVillageView(tx, await ownedVillage(tx, accountId, worldId, villageId), targetId);
  });
}

export async function readMapPlayer(
  accountId: number,
  worldId: number,
  villageId: number,
  playerId: number,
) {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    return publicPlayerView(tx, await ownedVillage(tx, accountId, worldId, villageId), playerId);
  });
}

export async function readMapPopup(
  accountId: number,
  worldId: number,
  villageId: number,
  targetId: number,
): Promise<VillagePopupInfo> {
  return db.transaction(async (tx) => {
    const world = await lockWorld(tx, worldId);
    const from = await ownedVillage(tx, accountId, worldId, villageId);
    const target = await publicVillageView(tx, from, targetId);
    const [row] = await tx
      .select()
      .from(villages)
      .where(and(eq(villages.id, targetId), eq(villages.worldId, worldId)));
    const own = target.own;
    const current = target.id === from.id;
    const assessment = !own && row ? await assessTarget(tx, from, row, new Date()) : null;
    const placed = own
      ? await tx.select().from(unitPlacements).where(eq(unitPlacements.locationVillageId, targetId))
      : [];
    return {
      id: target.id,
      continent: Math.floor(target.y / 100) * 10 + Math.floor(target.x / 100),
      distance: current
        ? 0
        : Math.round(Math.hypot(target.x - from.x, target.y - from.y) * 10) / 10,
      abandoned: target.playerId === null,
      own,
      current,
      protectedUntil: assessment?.protectedUntil?.toISOString() ?? null,
      morale: assessment?.morale ?? null,
      pointRatioBlocked: assessment?.pointRatioBlocked ?? false,
      units: unitCodes.map((code) => {
        const single = { ...emptyTroops(), [code]: 1 };
        const here = placed.filter((item) => item.unitCode === code);
        return {
          code,
          name: units[code].name,
          home: own
            ? here
                .filter((item) => item.originVillageId === targetId)
                .reduce((sum, item) => sum + item.quantity, 0)
            : null,
          foreign: own
            ? here
                .filter((item) => item.originVillageId !== targetId)
                .reduce((sum, item) => sum + item.quantity, 0)
            : null,
          seconds: current
            ? null
            : troopDuration(from, target, single, world.buildSpeed, world.unitSpeed),
        };
      }),
    };
  });
}
