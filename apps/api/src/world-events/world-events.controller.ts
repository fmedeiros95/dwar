import { Controller, Get, Inject, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { GameError } from '@dwar/game-server';
import type { Response } from 'express';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard, type SessionRequest } from '../common/session.guard.js';
import { WorldEventsService } from './world-events.service.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/events')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class WorldEventsController {
  constructor(@Inject(WorldEventsService) private readonly events: WorldEventsService) {}

  @Get()
  async stream(
    @Param('worldId') worldId: string,
    @Req() request: SessionRequest,
    @Res() response: Response,
  ): Promise<void> {
    const fetchSite = request.get('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none')
      throw new GameError('Origem da solicitação inválida. Recarregue o jogo.', 403);

    return this.events.open(
      id.parse(worldId),
      request.account.id,
      request.sessionTokenHash,
      response,
    );
  }
}
