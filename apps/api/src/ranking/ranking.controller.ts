import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { readRanking } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/ranking')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class RankingController {
  @Get()
  async ranking(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return readRanking(account.id, id.parse(worldId), {
      page: page ? z.coerce.number().int().min(1).max(1000000).parse(page) : undefined,
      search: search ? z.string().trim().max(24).parse(search) : undefined,
    });
  }
}
