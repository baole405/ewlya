import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@ds/db';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscordBotService } from '@ds/bot/discord';

@Injectable()
export class ProgressionService {
  constructor(private readonly discordBot: DiscordBotService) {}

  async getAllChecks(status: 'active' | 'ended' | 'trash' = 'active') {
    const now = new Date();

    const where: Prisma.ProgressionCheckWhereInput = {};
    if (status === 'trash') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
      if (status === 'active') {
        // active: not ended OR ended but still in future?
        // Logic: if endDate is null or endDate >= now
        where.OR = [{ endDate: null }, { endDate: { gte: now } }];
      } else if (status === 'ended') {
        where.endDate = { lt: now };
      }
    }

    return prisma.progressionCheck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requirements: true,
        _count: {
          select: { memberStatuses: true },
        },
      },
    });
  }

  async getCheckById(id: string) {
    const check = await prisma.progressionCheck.findUnique({
      where: { id },
      include: {
        requirements: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
        memberStatuses: {
          include: {
            member: {
              include: {
                requirementStatuses: {
                  include: { requirement: true },
                },
              },
            },
          },
          orderBy: {
            member: {
              nickname: 'asc',
            },
          },
        },
      },
    });

    if (!check) throw new NotFoundException('Không tìm thấy đợt check');

    // Filter requirement statuses to only those belonging to this check
    const requirementIds = check.requirements.map((r) => r.id);
    check.memberStatuses.forEach((ms) => {
      const member = ms.member as { requirementStatuses: { requirementId: string }[] };
      member.requirementStatuses = member.requirementStatuses.filter((rs) =>
        requirementIds.includes(rs.requirementId),
      );
    });

    return check;
  }

  async getSavedTitles() {
    const titles = await prisma.progressionTitle.findMany({
      orderBy: { title: 'asc' },
    });
    return titles.map((t) => t.title);
  }

  async createCheck(data: {
    title: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
    requirements?: { title: string; targetValue?: string }[];
  }) {
    const officialMembers = await prisma.member.findMany({
      where: { status: 'OFFICIAL' },
    });

    return prisma.$transaction(async (tx) => {
      // Save title for suggestion
      await tx.progressionTitle.upsert({
        where: { title: data.title },
        update: {},
        create: { title: data.title },
      });

      // Create Check
      const check = await tx.progressionCheck.create({
        data: {
          title: data.title,
          description: data.description,
          startDate: data.startDate || new Date(),
          endDate: data.endDate,
        },
      });

      // Create Requirements
      if (data.requirements && data.requirements.length > 0) {
        for (const req of data.requirements) {
          const requirement = await tx.progressionRequirement.create({
            data: {
              progressionCheckId: check.id,
              title: req.title,
              targetValue: req.targetValue,
            },
          });

          // Create Statuses for each requirement per member
          if (officialMembers.length > 0) {
            await tx.memberRequirementStatus.createMany({
              data: officialMembers.map((m) => ({
                memberId: m.id,
                requirementId: requirement.id,
                isMet: false,
              })),
            });
          }
        }
      }

      // Overall status
      if (officialMembers.length > 0) {
        await tx.memberProgressionStatus.createMany({
          data: officialMembers.map((m) => ({
            progressionCheckId: check.id,
            memberId: m.id,
            isCompleted: false,
            note: '',
          })),
        });
      }

      return check;
    });
  }

  async updateMemberRequirementStatus(statusId: string, isMet: boolean) {
    return prisma.memberRequirementStatus.update({
      where: { id: statusId },
      data: { isMet },
    });
  }

  async updateMemberStatus(statusId: string, data: { isCompleted?: boolean; note?: string }) {
    const updateData: Prisma.MemberProgressionStatusUpdateInput = { ...data };

    if (data.isCompleted !== undefined) {
      updateData.completedAt = data.isCompleted ? new Date() : null;
    }

    return prisma.memberProgressionStatus.update({
      where: { id: statusId },
      data: updateData,
    });
  }

  async deleteCheck(id: string) {
    // Soft delete
    return prisma.progressionCheck.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async forceEndCheck(id: string) {
    return prisma.progressionCheck.update({
      where: { id },
      data: { endDate: new Date() },
    });
  }

  async restoreCheck(id: string) {
    return prisma.progressionCheck.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrashCleanup() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.progressionCheck.deleteMany({
      where: {
        deletedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    if (deleted.count > 0) {
      console.log(
        `🗑️ Đã xóa vĩnh viễn ${deleted.count} đợt check quá hạn 30 ngày trong thùng rác.`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async reportEndedChecks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Tìm các đợt check đã kết thúc vào hôm qua (hoặc vừa kết thúc)
    const endedChecks = await prisma.progressionCheck.findMany({
      where: {
        endDate: {
          gte: yesterday,
          lt: today,
        },
        deletedAt: null,
      },
      include: {
        memberStatuses: {
          where: { isCompleted: false },
          include: { member: true },
        },
      },
    });

    for (const check of endedChecks) {
      if (check.memberStatuses.length > 0) {
        const incompleteList = check.memberStatuses
          .map((s) => `- **${s.member.nickname}** (${s.member.ign})`)
          .join('\n');

        const report =
          `🚨 **Báo cáo kết thúc đợt kiểm tra: ${check.title}**\n` +
          `Hạn chót đã qua, hiện còn **${check.memberStatuses.length}** thành viên chưa hoàn thành (🔴 Flag Đỏ):\n` +
          `${incompleteList}\n\n` +
          `*Admin/Mod vui lòng kiểm tra và cập nhật trạng thái trễ (🟡 Flag Vàng) nếu cần.*`;

        await this.discordBot.sendMessage(process.env['TEST_CHANNEL_ID'] || '', report);
      }
    }
  }
}
