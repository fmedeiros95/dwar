import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { buildingCodes, type BuildingCode } from '@dwar/game-core';
import { cancelConstruction, enqueueConstruction } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class ConstructionController {
  @Post('buildings')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { buildingCode: { type: 'string', enum: buildingCodes } },
      required: ['buildingCode'],
    },
  })
  async build(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    const data = z
      .object({ buildingCode: z.enum(buildingCodes as [BuildingCode, ...BuildingCode[]]) })
      .parse(body);
    return enqueueConstruction(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      data.buildingCode,
      operationKey.parse(requestId),
    );
  }

  @Post('constructions/:eventId/cancel')
  async cancel(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('eventId') eventId: string,
  ) {
    return cancelConstruction(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      id.parse(eventId),
    );
  }
}
