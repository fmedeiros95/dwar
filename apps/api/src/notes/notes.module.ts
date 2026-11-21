import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotesController } from './notes.controller.js';

@Module({ imports: [AuthModule], controllers: [NotesController] })
export class NotesModule {}
