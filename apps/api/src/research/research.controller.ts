import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { technologyCodes, type TechnologyCode } from '@dwar/game-core';
import { enqueueResearch } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class ResearchController {
  @Post('research')
  @ApiOperation({ summary: 'Pesquisar uma unidade na ferraria' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { technologyCode: { type: 'string', enum: technologyCodes } },
      required: ['technologyCode'],
    },
  })
  async research(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    const data = z
      .object({ technologyCode: z.enum(technologyCodes as [TechnologyCode, ...TechnologyCode[]]) })
      .parse(body);
    return enqueueResearch(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      data.technologyCode,
      operationKey.parse(requestId),
    );
  }
}
