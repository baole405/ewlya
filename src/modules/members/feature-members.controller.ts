import { Controller, Get, Patch, Param, Body, Delete, UseGuards, Request } from '@nestjs/common';
import { FeatureMembersService } from './feature-members.service';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { Member } from '../../shared/models';

@ApiTags('Members')
@Controller('members')
export class FeatureMembersController {
  constructor(private featureMembersService: FeatureMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả thành viên Clan' })
  getAllMembers() {
    return this.featureMembersService.getAllMembers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một thành viên' })
  getMemberById(@Param('id') id: string) {
    return this.featureMembersService.getMemberById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin thành viên (Admin only)' })
  updateMember(@Param('id') id: string, @Body() data: Partial<Member>) {
    return this.featureMembersService.updateMember(id, data);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id/points')
  @ApiOperation({ summary: 'Cập nhật điểm kèm lý do (Admin only)' })
  updatePoints(
    @Param('id') id: string, 
    @Body() payload: { points: number; reason: string }, 
    @Request() req: { user: { discordId: string } }
  ) {
    return this.featureMembersService.updatePoints(id, {
      ...payload,
      adminId: req.user.discordId,
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Lưu trữ (Archive) thành viên' })
  deleteMember(@Param('id') id: string) {
    return this.featureMembersService.deleteMember(id);
  }
}

