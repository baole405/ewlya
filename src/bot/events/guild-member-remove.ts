import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from '../services/logger.service';

export const name = Events.GuildMemberRemove;

export async function execute(member: GuildMember | PartialGuildMember) {
  if (member.user.bot) return;

  console.log(`👋 Member left: ${member.displayName}`);

  try {
    // Chuyển trạng thái thành FORMER (Cựu thành viên) thay vì xóa hẳn để giữ lịch sử
    await prisma.member.updateMany({
      where: { discordId: member.id },
      data: { status: 'FORMER' }
    });

    await LoggerService.logAction(
      member.client,
      '👋 Member Left Clan',
      `Member **${member.displayName}** has left the server and is now marked as **FORMER**.`,
      0xef4444
    );
  } catch (error) {
    console.error('Member remove error:', error);
  }
}
