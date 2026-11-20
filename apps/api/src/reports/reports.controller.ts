import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { readReport, readReports } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

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
      })
      .parse(query);
    return readReports(account.id, id.parse(worldId), data.page, data.villageId);
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
