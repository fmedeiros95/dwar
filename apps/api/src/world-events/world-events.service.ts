import {
  Injectable,
  Logger,
  type BeforeApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { and, eq, gt } from 'drizzle-orm';
import type { Response } from 'express';
import { createNotificationClient, db, players, sessions } from '@dwar/database';
import { GameError } from '@dwar/game-server';
import { z } from 'zod';

const changeChannel = 'dwar_world_changes';
const revocationChannel = 'dwar_session_revoked';
const migrationId = '0027_world_changes';
const positiveId = z.number().int().positive().max(2147483647);
const changeSchema = z
  .object({
    scope: z.enum(['village', 'incomings', 'reports', 'mail']),
    worldId: positiveId,
    playerId: positiveId.optional(),
    villageId: positiveId.optional(),
  })
  .refine(({ scope, playerId }) => playerId !== undefined || scope === 'village');

type DatabaseListener = ReturnType<typeof createNotificationClient>;
type WorldStream = {
  playerId: number;
  write: (event: string) => void;
  close: () => void;
};

@Injectable()
export class WorldEventsService implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger(WorldEventsService.name);
  private readonly streams = new Map<number, Set<WorldStream>>();
  private readonly revocations = new Map<string, Set<() => void>>();
  private listener?: DatabaseListener;
  private ready = false;
  private stopping = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private retryDelay = 1000;

  onModuleInit() {
    void this.listen();
    this.heartbeat = setInterval(() => {
      for (const world of this.streams.values()) {
        for (const stream of world) stream.write(': heartbeat\n\n');
      }
    }, 20_000).unref();
  }

  async beforeApplicationShutdown() {
    this.stopping = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeat);
    this.closeStreams();
    const listener = this.listener;
    this.listener = undefined;
    await listener?.end();
  }

  async open(worldId: number, accountId: number, tokenHash: string, response: Response) {
    const listener = this.ready ? this.listener : undefined;
    let revoked = false;
    let stream: WorldStream | undefined;
    const onRevoke = () => {
      revoked = true;
      stream?.close();
    };
    const watches = this.revocations.get(tokenHash) ?? new Set<() => void>();
    this.revocations.set(tokenHash, watches);
    watches.add(onRevoke);
    const unwatch = () => {
      watches.delete(onRevoke);
      if (!watches.size) this.revocations.delete(tokenHash);
    };

    try {
      // Observe revocations before checking membership so logout cannot race the handshake.
      const [membership] = await db
        .select({ playerId: players.id, expiresAt: sessions.expiresAt })
        .from(sessions)
        .leftJoin(
          players,
          and(eq(players.accountId, sessions.accountId), eq(players.worldId, worldId)),
        )
        .where(
          and(
            eq(sessions.tokenHash, tokenHash),
            eq(sessions.accountId, accountId),
            gt(sessions.expiresAt, new Date()),
          ),
        );
      if (response.destroyed) return;
      if (!membership || revoked) throw new GameError('Sua sessão expirou. Entre novamente.', 401);
      if (membership.playerId === null)
        throw new GameError('Entre neste mundo antes de continuar.', 403);

      response.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      });
      if (!listener || listener !== this.listener || this.stopping) {
        response.end('retry: 10000\nevent: unavailable\ndata: {}\n\n');
        return;
      }

      const world = this.streams.get(worldId) ?? new Set<WorldStream>();
      this.streams.set(worldId, world);
      const expiresAt = membership.expiresAt.getTime();
      const close = () => {
        if (!stream || !world.delete(stream)) return;
        if (!world.size) this.streams.delete(worldId);
        unwatch();
        if (!response.destroyed && !response.writableEnded) response.end();
      };
      stream = {
        playerId: membership.playerId,
        write(event) {
          if (response.destroyed || response.writableEnded || Date.now() >= expiresAt) {
            close();
          } else if (!response.write(event)) {
            // Reconnecting can recover the current state without queueing updates for a slow tab.
            response.destroy();
            close();
          }
        },
        close,
      };
      world.add(stream);
      response.once('close', close);
      response.flushHeaders();
      stream.write('retry: 3000\nevent: ready\ndata: {}\n\n');
    } finally {
      if (!stream) unwatch();
    }
  }

  private async listen() {
    if (this.stopping) return;
    const listener = createNotificationClient();
    this.listener = listener;
    listener.on('error', () => this.disconnected(listener));
    listener.on('end', () => this.disconnected(listener));
    listener.on('notification', ({ channel, payload }) => {
      if (listener !== this.listener || !this.ready || payload === undefined) return;
      if (channel === changeChannel) this.publish(payload);
      else if (channel === revocationChannel) {
        for (const revoke of this.revocations.get(payload) ?? []) revoke();
      }
    });

    try {
      await listener.connect();
      const migration = await listener.query('SELECT 1 FROM schema_migrations WHERE id = $1', [
        migrationId,
      ]);
      if (!migration.rowCount) {
        this.disconnected(listener);
        return;
      }
      await listener.query(`LISTEN ${changeChannel}`);
      await listener.query(`LISTEN ${revocationChannel}`);
      if (listener !== this.listener) return;
      this.ready = true;
      this.retryDelay = 1000;
    } catch {
      this.disconnected(listener);
    }
  }

  private disconnected(listener: DatabaseListener) {
    if (this.listener !== listener) return;
    this.listener = undefined;
    this.ready = false;
    this.closeStreams();
    void listener.end().catch(() => undefined);
    if (this.retryDelay === 1000)
      this.logger.warn('Atualizações em tempo real indisponíveis. Tentando reconectar.');
    this.reconnectTimer = setTimeout(() => void this.listen(), this.retryDelay).unref();
    this.retryDelay = Math.min(30_000, this.retryDelay * 2);
  }

  private closeStreams() {
    for (const world of this.streams.values()) for (const stream of world) stream.close();
  }

  private publish(payload: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return;
    }
    const change = changeSchema.safeParse(parsed);
    if (!change.success) return;
    const { worldId, playerId, scope, villageId } = change.data;
    const event = `event: change\ndata: ${JSON.stringify({ scope, villageId })}\n\n`;
    for (const stream of this.streams.get(worldId) ?? []) {
      if (playerId === undefined || stream.playerId === playerId) stream.write(event);
    }
  }
}
