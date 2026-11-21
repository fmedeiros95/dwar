import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TribesController } from './tribes.controller.js';

@Module({ imports: [AuthModule], controllers: [TribesController] })
export class TribesModule {}
