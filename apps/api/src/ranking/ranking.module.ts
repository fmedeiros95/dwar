import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RankingController } from './ranking.controller.js';

@Module({ imports: [AuthModule], controllers: [RankingController] })
export class RankingModule {}
