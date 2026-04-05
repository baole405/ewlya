import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ds/db';
import { Member, Role, Prisma } from '@prisma/client';

@Injectable()
export class FeatureMembersService {
  /**
   * Lấy danh sách tất cả thành viên (không bao gồm các trường nhạy cảm nếu cần)
   */
  async getAllMembers() {
    return prisma.member.findMany({
      orderBy: { points: 'desc' },
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });
  }

  /**
   * Lấy chi tiết một thành viên và lịch sử điểm
   */
  async getMemberById(id: string) {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { season: true }
        }
      }
    });

    if (!member) throw new NotFoundException('Không tìm thấy thành viên');
    return member;
  }

  /**
   * Cập nhật thông tin cơ bản (IGN, Nickname, Country, v.v.)
   */
  async updateMember(id: string, data: Partial<Member>) {
    return prisma.member.update({
      where: { id },
      data,
    });
  }

  /**
   * Cập nhật điểm số (Bắt buộc kèm lý do - Audit Log)
   */
  async updatePoints(id: string, payload: { points: number; reason: string; adminId: string; seasonId?: string }) {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Thành viên không tồn tại');

    // Tìm season đang active nếu không truyền
    let seasonId = payload.seasonId;
    if (!seasonId) {
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
      seasonId = activeSeason?.id;
    }

    if (!seasonId) throw new NotFoundException('Không tìm thấy Season đang hoạt động');

    // Dùng Transaction để đảm bảo tính nhất quán: Cập nhật Point + Ghi Log Submission
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Cập nhật tổng điểm Member
      const updatedMember = await tx.member.update({
        where: { id },
        data: { points: { increment: payload.points } },
      });

      // 2. Tạo bản ghi Submission làm bằng chứng (Audit Log)
      await tx.submission.create({
        data: {
          memberId: id,
          points: payload.points,
          mission: 'ADMIN_ADJUSTMENT', // Phân loại thay đổi từ Admin
          reason: payload.reason,
          verifiedBy: payload.adminId, // Discord ID của Admin thực hiện
          seasonId: seasonId,
        },
      });

      return updatedMember;
    });
  }

  /**
   * Xóa hoặc Archive thành viên
   */
  async deleteMember(id: string) {
    return prisma.member.update({
      where: { id },
      data: { status: 'FORMER' },
    });
  }
}
