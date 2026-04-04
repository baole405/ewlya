import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FeatureMembersModule } from '@ds/api/feature-members';
import { DiscordBotModule } from '@ds/bot/discord';

@Module({
  imports: [FeatureMembersModule, DiscordBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
