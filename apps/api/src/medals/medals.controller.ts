import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { readMedals, readPlayerMedals } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/medals')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class MedalsController {
  @Get()
  async mine(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return readMedals(account.id, id.parse(worldId));
  }

  @Get('players/:playerId')
  async player(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('playerId') playerId: string,
  ) {
    return readPlayerMedals(account.id, id.parse(worldId), id.parse(playerId));
  }
}
