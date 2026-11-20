import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateMail, previewMailMessage, readMailbox, readMailThread } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const messageText = z.string().min(3).max(16000);
const mailActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send'),
    recipient: z.string().trim().min(3).max(24),
    title: z.string().min(3).max(120),
    text: messageText,
  }),
  z.object({ type: z.literal('reply'), threadId: id, text: messageText }),
  z.object({ type: z.literal('read'), threadId: id }),
  z.object({ type: z.literal('delete'), threadIds: z.array(id).min(1).max(25) }),
  z.object({ type: z.literal('block'), username: z.string().trim().min(3).max(24) }),
  z.object({ type: z.literal('unblock'), playerId: id }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/mail')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class MailController {
  @Get()
  async mailbox(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Query('page') page?: string,
  ) {
    return readMailbox(
      account.id,
      id.parse(worldId),
      z.coerce.number().int().min(1).max(1000000).default(1).parse(page),
    );
  }

  @Get(':threadId')
  async mailThread(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('threadId') threadId: string,
  ) {
    return readMailThread(account.id, id.parse(worldId), id.parse(threadId));
  }

  @Post('preview')
  async mailPreview(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
  ) {
    const data = z.object({ text: messageText }).parse(body);
    return previewMailMessage(account.id, id.parse(worldId), data.text);
  }

  @Post()
  async mailAction(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    return mutateMail(
      account.id,
      id.parse(worldId),
      mailActionSchema.parse(body),
      operationKey.parse(requestId),
    );
  }
}
