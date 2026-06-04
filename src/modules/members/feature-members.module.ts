import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeatureMembersController } from './feature-members.controller';
import { FeatureMembersService } from './feature-members.service';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';
import { DiscordBotModule } from '../../bot/discord-bot.module';

import { BirthdayService } from './birthday.service';

@Module({
  imports: [AuthModule, DiscordBotModule],
  controllers: [FeatureMembersController, ProgressionController],
  providers: [FeatureMembersService, ProgressionService, BirthdayService],
  exports: [FeatureMembersService, ProgressionService, BirthdayService],
})
export class FeatureMembersModule {}

