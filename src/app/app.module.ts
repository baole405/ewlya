import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FeatureMembersModule } from '../modules/members/feature-members.module';
import { DiscordBotModule } from '../bot/discord-bot.module';
import { AuthModule } from '../modules/auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), FeatureMembersModule, DiscordBotModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

