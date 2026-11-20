import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RallyController } from './rally.controller.js';

@Module({ imports: [AuthModule], controllers: [RallyController] })
export class RallyModule {}
