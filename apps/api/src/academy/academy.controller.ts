import { Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { academyAction } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class AcademyController {
  @Post('academy/:action')
  @ApiOperation({ summary: 'Cunhar uma moeda ou recrutar um nobre na academia' })
  async academy(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('action') action: string,
    @Headers('idempotency-key') requestId: string,
  ) {
    return academyAction(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      z.enum(['mint', 'recruit']).parse(action),
      operationKey.parse(requestId),
    );
  }
}
