import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateReports, readNotice, readReport, readReports } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const group = z.enum(['all', 'attack', 'defense', 'support', 'trade', 'other']);
const reportRefs = z
  .array(z.object({ source: z.enum(['battle', 'notice']), id }))
  .min(1)
  .max(100);
const reportAction = z.union([
  z.object({ type: z.literal('delete'), items: reportRefs }),
  z.object({ type: z.literal('delete'), group }),
  z.object({ type: z.literal('read'), items: reportRefs.optional(), group: group.optional() }),
  z.object({ type: z.literal('unread'), items: reportRefs }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/reports')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class ReportsController {
  @Get()
  async reports(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Query() query: unknown,
  ) {
    const data = z
      .object({
        page: z.coerce.number().int().min(1).max(1000000).default(1),
        villageId: id.optional(),
        group: group.default('all'),
      })
      .parse(query);
    return readReports(account.id, id.parse(worldId), data.page, data.villageId, data.group);
  }

  @Post()
  async action(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
  ) {
    return mutateReports(account.id, id.parse(worldId), reportAction.parse(body));
  }

  @Get('notices/:noticeId')
  async notice(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('noticeId') noticeId: string,
  ) {
    return readNotice(account.id, id.parse(worldId), id.parse(noticeId));
  }

  @Get(':reportId')
  async report(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('reportId') reportId: string,
  ) {
    return readReport(account.id, id.parse(worldId), id.parse(reportId));
  }
}
