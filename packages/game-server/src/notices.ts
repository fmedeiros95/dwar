import { eq } from 'drizzle-orm';
import { noticeReports, villages, type Transaction } from '@dwar/database';
import type { NoticePayload, Resources, Troops } from '@dwar/game-config';
import { side } from './combat.js';

type Village = typeof villages.$inferSelect;
type Content =
  | { kind: 'trade'; mode: 'normal' | 'offer'; resources: Resources }
  | { kind: 'support'; troops: Troops };

/**
 * Registra o relatório de comércio ou de chegada de apoio para quem enviou e para quem recebeu.
 * Aldeias abandonadas não têm jogador e não recebem aviso; se as duas pontas são do mesmo jogador,
 * ele recebe um só.
 */
export async function addNotices(
  tx: Transaction,
  worldId: number,
  fromVillageId: number,
  toVillageId: number,
  content: Content,
  at: Date,
) {
  const [origin] = await tx.select().from(villages).where(eq(villages.id, fromVillageId));
  const [target] = await tx.select().from(villages).where(eq(villages.id, toVillageId));
  if (!origin || !target) return;
  const [from, to] = [await side(tx, origin as Village), await side(tx, target as Village)];
  const recipients: { playerId: number; role: 'sender' | 'receiver' }[] = [];
  if (from.playerId) recipients.push({ playerId: from.playerId, role: 'sender' });
  if (to.playerId && to.playerId !== from.playerId)
    recipients.push({ playerId: to.playerId, role: 'receiver' });
  if (!recipients.length) return;
  await tx.insert(noticeReports).values(
    recipients.map(({ playerId, role }) => ({
      worldId,
      playerId,
      kind: content.kind,
      occurredAt: at,
      fromVillageId,
      toVillageId,
      payload: { ...content, role, from, to } as NoticePayload,
    })),
  );
}
