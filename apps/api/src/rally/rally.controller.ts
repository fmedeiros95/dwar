import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateRally, previewRallySupport, readRally } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { coordinate, id, operationKey, troopCounts } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const rallyActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('attack'),
    targetId: id,
    troops: troopCounts,
    targetBuilding: z.string().max(20).optional(),
  }),
  z.object({ type: z.literal('cancel'), movementId: id }),
  z.object({ type: z.literal('support'), targetId: id, troops: troopCounts }),
  z.object({ type: z.literal('recall'), locationId: id }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId/rally')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class RallyController {
  @Get()
  async rally(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
  ) {
    return readRally(account.id, id.parse(worldId), id.parse(villageId));
  }

  @Post('preview')
  async supportPreview(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
  ) {
    const data = z
      .object({
        x: coordinate,
        y: coordinate,
        troops: troopCounts,
        kind: z.enum(['support', 'attack']).default('support'),
        targetBuilding: z.string().max(20).optional(),
      })
      .parse(body);
    return previewRallySupport(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      data.x,
      data.y,
      data.troops,
      data.kind,
      data.targetBuilding,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Enviar apoio ou retirar o contingente próprio de outra aldeia' })
  async rallyAction(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    return mutateRally(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      rallyActionSchema.parse(body),
      operationKey.parse(requestId),
    );
  }
}
