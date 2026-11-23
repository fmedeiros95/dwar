import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CaravansController } from './caravans.controller.js';

@Module({ imports: [AuthModule], controllers: [CaravansController] })
export class CaravansModule {}
