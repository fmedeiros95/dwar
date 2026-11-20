import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ResearchController } from './research.controller.js';

@Module({ imports: [AuthModule], controllers: [ResearchController] })
export class ResearchModule {}
