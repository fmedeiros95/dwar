import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { VillagesController } from './villages.controller.js';

@Module({ imports: [AuthModule], controllers: [VillagesController] })
export class VillagesModule {}
