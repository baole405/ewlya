import { Controller, Get } from '@nestjs/common';
import { FeatureMembersService } from './feature-members.service';

import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Members')
@Controller('members')
export class FeatureMembersController {
  constructor(private featureMembersService: FeatureMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả thành viên Clan' })
  @ApiResponse({ status: 200, description: 'Trả về list các Member.' })
  getAllMembers() {
    return [
      { id: '1', nickname: 'Grimex', points: 9999 },
      { id: '2', nickname: 'Bahan', points: 8888 }
    ];
  }
}

