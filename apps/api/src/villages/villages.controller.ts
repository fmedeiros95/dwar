import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { createVillage, readIncomings, readVillage, renameVillage } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class VillagesController {
  @Get('incomings')
  async incomings(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return readIncomings(account.id, id.parse(worldId));
  }

  @Post('villages')
  async create(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return createVillage(account.id, account.username, id.parse(worldId));
  }

  @Get('village')
  async read(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Query('id') villageId?: string,
  ) {
    return readVillage(
      account.id,
      id.parse(worldId),
      villageId === undefined ? undefined : id.parse(villageId),
    );
  }

  @Post('villages/:villageId/name')
  async rename(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
  ) {
    const data = z
      .object({
        name: z
          .string()
          .transform((value) =>
            value
              .replace(/[<>"']/g, '')
              .replaceAll('&nbsp;', '')
              .trim(),
          )
          .pipe(z.string().min(3).max(25)),
      })
      .parse(body);
    return renameVillage(account.id, id.parse(worldId), id.parse(villageId), data.name);
  }
}
