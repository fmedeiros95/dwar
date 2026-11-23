import { Module } from '@nestjs/common';
import { AcademyModule } from './academy/academy.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConstructionModule } from './construction/construction.module.js';
import { HealthModule } from './health/health.module.js';
import { MailModule } from './mail/mail.module.js';
import { MapModule } from './map/map.module.js';
import { MarketModule } from './market/market.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { RallyModule } from './rally/rally.module.js';
import { RankingModule } from './ranking/ranking.module.js';
import { RecruitmentModule } from './recruitment/recruitment.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { CaravansModule } from './caravans/caravans.module.js';
import { NotesModule } from './notes/notes.module.js';
import { MedalsModule } from './medals/medals.module.js';
import { TribesModule } from './tribes/tribes.module.js';
import { ResearchModule } from './research/research.module.js';
import { VillagesModule } from './villages/villages.module.js';
import { WorldsModule } from './worlds/worlds.module.js';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    WorldsModule,
    VillagesModule,
    ConstructionModule,
    ResearchModule,
    RecruitmentModule,
    AcademyModule,
    MarketModule,
    MapModule,
    RallyModule,
    MailModule,
    ReportsModule,
    CaravansModule,
    NotesModule,
    MedalsModule,
    TribesModule,
    RankingModule,
    ProfileModule,
  ],
})
export class AppModule {}
