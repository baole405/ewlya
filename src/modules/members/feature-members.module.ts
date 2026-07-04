import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureMembersController } from './feature-members.controller';
import { FeatureMembersService } from './feature-members.service';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';
import { DiscordBotModule } from '../../bot/discord-bot.module';

import { BirthdayService } from './birthday.service';
import { SyncReminderService } from './sync-reminder.service';

@Module({
  imports: [AuthModule, DiscordBotModule],
  controllers: [FeatureMembersController, ProgressionController],
  providers: [FeatureMembersService, ProgressionService, BirthdayService, SyncReminderService],
  exports: [FeatureMembersService, ProgressionService, BirthdayService, SyncReminderService],
})
export class FeatureMembersModule {}

