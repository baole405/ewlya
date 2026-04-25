import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { ProgressionService } from './progression.service';

@ApiTags('Progression')
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Lấy danh sách các đợt progression check' })
  @ApiQuery({ name: 'status', enum: ['active', 'ended', 'trash'], required: false })
  async getAllChecks(@Query('status') status?: 'active' | 'ended' | 'trash') {
    return this.progressionService.getAllChecks(status || 'active');
  }

  @Get('titles')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Lấy danh sách các tên đợt check đã lưu' })
  async getSavedTitles() {
    return this.progressionService.getSavedTitles();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Lấy chi tiết một đợt check kèm trạng thái members' })
  async getCheckById(@Param('id') id: string) {
    return this.progressionService.getCheckById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Tạo một đợt progression check mới' })
  async createCheck(
    @Body()
    data: {
      title: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      requirements?: { title: string; targetValue?: string }[];
    },
  ) {
    return this.progressionService.createCheck({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Khôi phục một đợt progression check từ thùng rác' })
  async restoreCheck(@Param('id') id: string) {
    return this.progressionService.restoreCheck(id);
  }

  @Post(':id/end')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Kết thúc sớm một đợt progression check' })
  async endCheck(@Param('id') id: string) {
    return this.progressionService.forceEndCheck(id);
  }

  @Patch('member-status/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái (Boolean/Note) cho một member' })
  async updateMemberStatus(
    @Param('id') id: string,
    @Body() data: { isCompleted?: boolean; note?: string },
  ) {
    return this.progressionService.updateMemberStatus(id, data);
  }

  @Patch('requirement-status/:id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Cập nhật trạng thái một điều kiện (Requirement) cho một member' })
  async updateMemberRequirementStatus(@Param('id') id: string, @Body() data: { isMet: boolean }) {
    return this.progressionService.updateMemberRequirementStatus(id, data.isMet);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @ApiOperation({ summary: 'Xóa một đợt progression check' })
  async deleteCheck(@Param('id') id: string) {
    return this.progressionService.deleteCheck(id);
  }
}

