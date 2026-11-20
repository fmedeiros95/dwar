import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorldsController } from './worlds.controller.js';

@Module({ imports: [AuthModule], controllers: [WorldsController] })
export class WorldsModule {}
