import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MedalsController } from './medals.controller.js';

@Module({ imports: [AuthModule], controllers: [MedalsController] })
export class MedalsModule {}
