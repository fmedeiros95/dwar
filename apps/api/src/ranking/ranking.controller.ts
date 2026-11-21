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
    @Query('board') board?: string,
    @Query('type') type?: string,
    @Query('continent') continent?: string,
  ) {
    return readRanking(account.id, id.parse(worldId), {
      board: board ? z.enum(['player', 'continent', 'kills']).parse(board) : undefined,
      type: type ? z.enum(['att', 'def', 'all']).parse(type) : undefined,
      continent: continent ? z.coerce.number().int().min(0).max(99).parse(continent) : undefined,
      page: page ? z.coerce.number().int().min(1).max(1000000).parse(page) : undefined,
      search: search ? z.string().trim().max(24).parse(search) : undefined,
    });
  }
}
