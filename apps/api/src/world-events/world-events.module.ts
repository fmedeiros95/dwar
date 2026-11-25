import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WorldEventsController } from './world-events.controller.js';
import { WorldEventsService } from './world-events.service.js';

@Module({
  imports: [AuthModule],
  controllers: [WorldEventsController],
  providers: [WorldEventsService],
})
export class WorldEventsModule {}
