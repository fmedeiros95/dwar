import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateCaravan, readCaravans } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const amount = z.number().int().min(0).max(2147483647);
const action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('banner'), resource: z.enum(['wood', 'stone', 'iron']).nullable() }),
  z.object({
    type: z.literal('divide'),
    sun: z.object({ wood: amount, stone: amount, iron: amount }),
  }),
  z.object({ type: z.literal('choose'), lot: z.enum(['sun', 'moon']) }),
  z.object({ type: z.literal('unload') }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/caravans')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class CaravansController {
  @Get()
  overview(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return readCaravans(account.id, id.parse(worldId));
  }

  @Post(':caravanId')
  act(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('caravanId') caravanId: string,
    @Body() body: unknown,
  ) {
    return mutateCaravan(account.id, id.parse(worldId), id.parse(caravanId), action.parse(body));
  }
}
