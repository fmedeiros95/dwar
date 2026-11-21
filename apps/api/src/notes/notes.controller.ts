import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { notesOverview, readPlayerNote, savePlayerNote } from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';

const saveNote = z.object({
  villageId: id.nullish(),
  // O servidor confere o limite em caracteres (e não em bytes); aqui só barra abusos grosseiros.
  text: z.string().max(40000),
});

@ApiTags('DWar')
@Controller('worlds/:worldId/notes')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class NotesController {
  @Get()
  async overview(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return notesOverview(account.id, id.parse(worldId));
  }

  @Get('villages/:villageId')
  async village(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Param('villageId') villageId: string,
  ) {
    return readPlayerNote(account.id, id.parse(worldId), id.parse(villageId));
  }

  @Put()
  async save(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
  ) {
    const data = saveNote.parse(body);
    return savePlayerNote(account.id, id.parse(worldId), data.villageId ?? null, data.text);
  }
}
