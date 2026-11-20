import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecruitmentController } from './recruitment.controller.js';

@Module({ imports: [AuthModule], controllers: [RecruitmentController] })
export class RecruitmentModule {}
