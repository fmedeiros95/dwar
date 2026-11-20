import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { enterWorld, listWorlds, readWorldBySlug } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds')
export class WorldsController {
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Consultar o mundo pelo identificador público' })
  worldBySlug(@Param('slug') slug: string) {
    const code = z
      .string()
      .regex(/^[a-z][a-z0-9-]{1,31}$/)
      .parse(slug);
    return readWorldBySlug(code);
  }

  @Get()
  worlds() {
    return listWorlds();
  }

  @Post(':worldId/join')
  @ApiCookieAuth(cookieName)
  @UseGuards(SessionGuard)
  async join(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return enterWorld(account.id, id.parse(worldId));
  }
}
