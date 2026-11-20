import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MarketController } from './market.controller.js';

@Module({ imports: [AuthModule], controllers: [MarketController] })
export class MarketModule {}
