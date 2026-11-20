import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MapController } from './map.controller.js';

@Module({ imports: [AuthModule], controllers: [MapController] })
export class MapModule {}
