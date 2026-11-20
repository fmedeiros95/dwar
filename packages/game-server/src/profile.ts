import { eq } from 'drizzle-orm';
import { db, accounts, players, type Transaction } from '@dwar/database';
import { avatarLimits } from '@dwar/game-config';
import type { ProfileSettings, ProfilePatch } from '@dwar/api-client';
import { lockWorld, ownedVillage } from './village-engine.js';
import { GameError } from './errors.js';

export async function profileView(
  tx: Transaction,
  worldId: number,
  playerId: number,
): Promise<ProfileSettings> {
  const [row] = await tx
    .select({
      gender: accounts.gender,
      age: accounts.age,
      location: accounts.locationText,
      personalText: players.personalText,
      avatarPath: players.avatarPath,
    })
    .from(players)
    .innerJoin(accounts, eq(accounts.id, players.accountId))
    .where(eq(players.id, playerId));
  if (!row) throw new GameError('Jogador não encontrado.', 404);
  return {
    gender: row.gender ?? null,
    age: row.age ?? null,
    location: row.location ?? null,
    personalText: row.personalText ?? null,
    avatarUrl: row.avatarPath ? `/avatars/${row.avatarPath}` : null,
  };
}

// settings_profile.php: location aceita só letras, números, ponto e espaço (demais caracteres
// são removidos silenciosamente, sem rejeitar o envio).
function sanitizeLocation(value: string): string | null {
  const cleaned = value.replace(/[^a-zA-Z0-9.\s]/g, '').trim();
  return cleaned || null;
}

export async function updateProfile(
  tx: Transaction,
  accountId: number,
  worldId: number,
  playerId: number,
  patch: ProfilePatch,
): Promise<ProfileSettings> {
  if (patch.personalText !== undefined) {
    const text = patch.personalText?.trim() ?? '';
    if (text.length > 4000) throw new GameError('O texto pessoal deve ter até 4.000 caracteres.');
    await tx
      .update(players)
      .set({ personalText: text || null })
      .where(eq(players.id, playerId));
  }
  const accountPatch: Partial<typeof accounts.$inferInsert> = {};
  if (patch.gender !== undefined) accountPatch.gender = patch.gender;
  if (patch.age !== undefined) accountPatch.age = patch.age;
  if (patch.location !== undefined)
    accountPatch.locationText = patch.location ? sanitizeLocation(patch.location) : null;
  if (Object.keys(accountPatch).length)
    await tx.update(accounts).set(accountPatch).where(eq(accounts.id, accountId));
  return profileView(tx, worldId, playerId);
}

export async function readProfile(accountId: number, worldId: number): Promise<ProfileSettings> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return profileView(tx, worldId, village.playerId);
  });
}

export async function mutateProfile(
  accountId: number,
  worldId: number,
  patch: ProfilePatch,
): Promise<ProfileSettings> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    return updateProfile(tx, accountId, worldId, village.playerId, patch);
  });
}

// PNG/JPEG são redimensionados para 320x220; GIF é aceito como está, mas só se já couber
// em 320x220 (não há redimensionamento de GIF). Limite de 1,2 MB para todos.
export function checkAvatarUpload(
  mimetype: string,
  size: number,
  width: number,
  height: number,
): 'resize' | 'store' {
  if (size > avatarLimits.maxBytes) throw new GameError('O avatar deve ter até 1,2 MB.');
  if (mimetype === 'image/gif') {
    if (width > avatarLimits.width || height > avatarLimits.height)
      throw new GameError(
        `Imagens GIF devem ter até ${avatarLimits.width}x${avatarLimits.height} pixels.`,
      );
    return 'store';
  }
  if (mimetype === 'image/png' || mimetype === 'image/jpeg') return 'resize';
  throw new GameError('Envie um arquivo PNG, JPEG ou GIF.');
}

export async function saveAvatar(
  accountId: number,
  worldId: number,
  relativePath: string,
): Promise<{ profile: ProfileSettings; previousPath: string | null }> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    const [current] = await tx
      .select({ avatarPath: players.avatarPath })
      .from(players)
      .where(eq(players.id, village.playerId));
    await tx
      .update(players)
      .set({ avatarPath: relativePath })
      .where(eq(players.id, village.playerId));
    return {
      profile: await profileView(tx, worldId, village.playerId),
      previousPath: current?.avatarPath ?? null,
    };
  });
}

export async function removeAvatar(
  accountId: number,
  worldId: number,
): Promise<{ profile: ProfileSettings; previousPath: string | null }> {
  return db.transaction(async (tx) => {
    await lockWorld(tx, worldId);
    const village = await ownedVillage(tx, accountId, worldId);
    const [current] = await tx
      .select({ avatarPath: players.avatarPath })
      .from(players)
      .where(eq(players.id, village.playerId));
    await tx.update(players).set({ avatarPath: null }).where(eq(players.id, village.playerId));
    return {
      profile: await profileView(tx, worldId, village.playerId),
      previousPath: current?.avatarPath ?? null,
    };
  });
}
