import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConstructionController } from './construction.controller.js';

@Module({ imports: [AuthModule], controllers: [ConstructionController] })
export class ConstructionModule {}
