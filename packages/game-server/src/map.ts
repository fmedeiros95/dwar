import { db } from '@dwar/database';
import type { MapAction } from '@dwar/api-client';
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
