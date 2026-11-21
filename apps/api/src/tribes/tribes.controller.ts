import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateTribes, readTribe, readTribes } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const rights = z
  .object({
    isFounder: z.boolean(),
    canLead: z.boolean(),
    canInvite: z.boolean(),
    canDiplomacy: z.boolean(),
    canMassMail: z.boolean(),
    canModerate: z.boolean(),
    canHiddenForum: z.boolean(),
  })
  .partial();

// Os limites de tamanho e de conteúdo são conferidos pelo serviço, com mensagens em português;
// aqui só se barram corpos absurdos.
const text = z.string().max(40000);
const tribeAction = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create'), name: text, tag: text }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('disband') }),
  z.object({ type: z.literal('invite'), username: text }),
  z.object({ type: z.literal('cancel_invite'), inviteId: id }),
  z.object({ type: z.literal('accept_invite'), inviteId: id }),
  z.object({ type: z.literal('decline_invite'), inviteId: id }),
  z.object({ type: z.literal('set_relation'), tag: text, kind: z.enum(['ally', 'nap', 'enemy']) }),
  z.object({ type: z.literal('cancel_relation'), relationId: id }),
  z.object({ type: z.literal('declare_war'), tag: text, title: text, declaration: text }),
  z.object({ type: z.literal('offer_peace'), warId: id }),
  z.object({ type: z.literal('withdraw_peace'), warId: id }),
  z.object({ type: z.literal('accept_peace'), warId: id }),
  z.object({ type: z.literal('reject_peace'), warId: id }),
  z.object({ type: z.literal('kick'), playerId: id }),
  z.object({ type: z.literal('rights'), playerId: id, title: text, rights }),
  z.object({
    type: z.literal('edit'),
    name: text.optional(),
    tag: text.optional(),
    description: text.optional(),
    internalText: text.optional(),
  }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/tribes')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class TribesController {
  @Get()
  async home(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return readTribes(account.id, id.parse(worldId));
  }

  @Get(':tribeId')
  async profile(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('tribeId') tribeId: string,
  ) {
    return readTribe(account.id, id.parse(worldId), id.parse(tribeId));
  }

  @Post('actions')
  async action(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
  ) {
    return mutateTribes(account.id, id.parse(worldId), tribeAction.parse(body));
  }
}
