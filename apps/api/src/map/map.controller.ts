import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateMap, readMap, readMapPlayer, readMapPopup, readMapVillage } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId/map')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class MapController {
  @Post()
  async mapAction(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
  ) {
    const action = z
      .discriminatedUnion('type', [
        z.object({
          type: z.literal('settings'),
          settings: z.object({
            width: z.number().int().min(4).max(30),
            height: z.number().int().min(4).max(30),
            minimapSize: z.number().int().min(20).max(120).multipleOf(5),
            contextMenu: z.boolean(),
            popup: z.boolean(),
            popupUnits: z.boolean(),
            popupTimes: z.boolean(),
            reportDots: z.boolean(),
          }),
        }),
        z.object({
          type: z.literal('mark'),
          username: z.string().trim().min(3).max(24),
          color: z.string().regex(/^#[0-9a-f]{6}$/i),
        }),
        z.object({ type: z.literal('unmark'), playerId: id }),
      ])
      .parse(body);
    await mutateMap(account.id, id.parse(worldId), id.parse(villageId), action);
    return { ok: true };
  }

  @Get()
  async map(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Query() query: unknown,
  ) {
    const data = z
      .object({
        x: z.coerce.number().int().min(0).max(999),
        y: z.coerce.number().int().min(0).max(999),
        // Quantos tiles o cliente quer ver (mapa em tela cheia); amplia o raio de busca.
        span: z.coerce.number().int().min(1).max(120).optional(),
      })
      .parse(query);
    return readMap(account.id, id.parse(worldId), id.parse(villageId), data.x, data.y, data.span);
  }

  @Get('villages/:targetId')
  async mapVillage(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('targetId') targetId: string,
  ) {
    return readMapVillage(account.id, id.parse(worldId), id.parse(villageId), id.parse(targetId));
  }

  @Get('villages/:targetId/popup')
  async mapPopup(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('targetId') targetId: string,
  ) {
    return readMapPopup(account.id, id.parse(worldId), id.parse(villageId), id.parse(targetId));
  }

  @Get('players/:playerId')
  async mapPlayer(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('playerId') playerId: string,
  ) {
    return readMapPlayer(account.id, id.parse(worldId), id.parse(villageId), id.parse(playerId));
  }
}
