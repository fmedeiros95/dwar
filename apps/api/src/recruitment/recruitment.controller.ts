import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { recruitmentBuildings, unitCodes, type UnitCode } from '@dwar/game-core';
import {
  cancelRecruitment as cancelRecruitmentUseCase,
  enqueueRecruitment,
} from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id, operationKey } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

@ApiTags('DWar')
@Controller('worlds/:worldId/villages/:villageId')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class RecruitmentController {
  @Post('recruitment')
  @ApiOperation({ summary: 'Recrutar unidades no quartel, estábulo ou oficina' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['buildingCode', 'orders'],
      properties: {
        buildingCode: { type: 'string', enum: [...recruitmentBuildings] },
        orders: {
          type: 'array',
          minItems: 1,
          maxItems: 9,
          items: {
            type: 'object',
            required: ['unitCode', 'quantity'],
            properties: {
              unitCode: { type: 'string', enum: unitCodes },
              quantity: { type: 'integer', minimum: 1, maximum: 99999 },
            },
          },
        },
      },
    },
  })
  async recruit(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Body() body: unknown,
    @Headers('idempotency-key') requestId: string,
  ) {
    const data = z
      .object({
        buildingCode: z.enum(recruitmentBuildings),
        orders: z
          .array(
            z.object({
              unitCode: z.enum(unitCodes as [UnitCode, ...UnitCode[]]),
              quantity: z.number().int().min(1).max(99999),
            }),
          )
          .min(1)
          .max(9),
      })
      .parse(body);
    return enqueueRecruitment(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      data.buildingCode,
      data.orders,
      operationKey.parse(requestId),
    );
  }

  @Post('recruitment/:eventId/cancel')
  async cancel(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
    @Param('eventId') eventId: string,
  ) {
    return cancelRecruitmentUseCase(
      account.id,
      id.parse(worldId),
      id.parse(villageId),
      id.parse(eventId),
    );
  }
}
