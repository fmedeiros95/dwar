import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { mutateMarket, previewMarketTrade, readMarket } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey, resourceName, tradeResources } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const marketActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('send'), targetId: id, resources: tradeResources }),
  z.object({
    type: z.literal('create_offer'),
    sellResource: resourceName,
    buyResource: resourceName,
    sellAmount: z.number().int().min(1).max(235000),
    buyAmount: z.number().int().min(1).max(235000),
  }),
  z.object({ type: z.enum(['cancel_offer', 'accept_offer', 'cancel_shipment']), id }),
]);

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId/market')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class MarketController {
  @Get()
  async market(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
  ) {
    return readMarket(account.id, id.parse(worldId), id.parse(villageId));
  }

  @Post('preview')
  async previewTrade(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
  ) {
    const data = z
      .object({
        x: z.number().int().min(-2147483648).max(2147483647),
        y: z.number().int().min(-2147483648).max(2147483647),
        resources: tradeResources,
      })
      .parse(body);
    return previewMarketTrade(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      data.x,
      data.y,
      data.resources,
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Enviar recursos, criar/aceitar/cancelar ofertas ou cancelar um transporte',
  })
  async marketAction(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    return mutateMarket(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      marketActionSchema.parse(body),
      operationKey.parse(requestId),
    );
  }
}
