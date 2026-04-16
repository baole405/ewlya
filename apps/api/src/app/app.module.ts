import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FeatureMembersModule } from '@ds/api/feature-members';
import { DiscordBotModule } from '@ds/bot/discord';
import { AuthModule } from '@ds/api/auth';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), FeatureMembersModule, DiscordBotModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
