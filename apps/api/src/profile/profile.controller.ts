import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { avatarLimits } from '@dwar/game-config';
import {
  checkAvatarUpload,
  GameError,
  mutateProfile,
  readProfile,
  removeAvatar,
  saveAvatar,
} from '@dwar/game-server';
import type { Account } from '@dwar/api-client';
import { CurrentAccount } from '../common/current-account.decorator.js';
import { cookieName } from '../common/cookies.js';
import { id } from '../common/schemas.js';
import { SessionGuard } from '../common/session.guard.js';
import { avatarDir } from '../common/avatar-storage.js';

// Gênero restrito a m/f/x, idade entre 0 e 79, localização livre (sanitizada no
// game-server) e texto pessoal sem limite rígido, com um teto de segurança de
// armazenamento (ver profile.ts).
const profilePatch = z.object({
  personalText: z.string().max(4000).nullable().optional(),
  gender: z.enum(['m', 'f', 'x']).nullable().optional(),
  age: z.number().int().min(0).max(79).nullable().optional(),
  location: z.string().max(60).nullable().optional(),
});

async function deleteIfPresent(filename: string | null) {
  if (filename) await unlink(path.join(avatarDir, filename)).catch(() => {});
}

@ApiTags('DWar')
@Controller('worlds/:worldId/profile')
@ApiCookieAuth(cookieName)
@UseGuards(SessionGuard)
export class ProfileController {
  @Get()
  async profile(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    return readProfile(account.id, id.parse(worldId));
  }

  @Post()
  async updateProfile(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @Body() body: unknown,
  ) {
    return mutateProfile(account.id, id.parse(worldId), profilePatch.parse(body));
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }),
  )
  async uploadAvatar(
    @CurrentAccount() account: Account,
    @Param('worldId') worldId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new GameError('Selecione um arquivo PNG, JPEG ou GIF.');
    const metadata = await sharp(file.buffer).metadata();
    const action = checkAvatarUpload(
      file.mimetype,
      file.size,
      metadata.width ?? 0,
      metadata.height ?? 0,
    );
    const buffer =
      action === 'resize'
        ? await sharp(file.buffer)
            .resize(avatarLimits.width, avatarLimits.height, { fit: 'cover' })
            .toFormat(file.mimetype === 'image/png' ? 'png' : 'jpeg')
            .toBuffer()
        : file.buffer;
    const extension =
      file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/jpeg' ? 'jpg' : 'gif';
    const filename = `${account.id}_${Date.now()}.${extension}`;
    await mkdir(avatarDir, { recursive: true });
    await writeFile(path.join(avatarDir, filename), buffer);
    const { profile, previousPath } = await saveAvatar(account.id, id.parse(worldId), filename);
    await deleteIfPresent(previousPath);
    return profile;
  }

  @Delete('avatar')
  async deleteAvatar(@CurrentAccount() account: Account, @Param('worldId') worldId: string) {
    const { profile, previousPath } = await removeAvatar(account.id, id.parse(worldId));
    await deleteIfPresent(previousPath);
    return profile;
  }
}
