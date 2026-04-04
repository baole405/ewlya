import { Module } from '@nestjs/common';
import { FeatureMembersController } from './feature-members.controller';
import { FeatureMembersService } from './feature-members.service';

@Module({
  controllers: [FeatureMembersController],
  providers: [FeatureMembersService],
  exports: [FeatureMembersService],
})
export class FeatureMembersModule {}
