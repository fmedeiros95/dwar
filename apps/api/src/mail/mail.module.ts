import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailController } from './mail.controller.js';

@Module({ imports: [AuthModule], controllers: [MailController] })
export class MailModule {}
