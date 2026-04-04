import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FeatureMembersModule } from '@ds/api/feature-members';

@Module({
  imports: [FeatureMembersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
