import { Events, GuildMember } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from '../services/logger.service';

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember: GuildMember, newMember: GuildMember) {
  // Bỏ qua Bot
  if (newMember.user.bot) return;

  const roleName = 'Dark Stars';
  const hasRoleBefore = oldMember.roles.cache.some(r => r.name === roleName);
  const hasRoleAfter = newMember.roles.cache.some(r => r.name === roleName);

  // Chỉ xử lý nếu có sự thay đổi về Role "Dark Stars"
  if (hasRoleBefore !== hasRoleAfter) {
    console.log(`🔄 Auto-sync: ${newMember.displayName} role changed.`);
    
    const roleNames = newMember.roles.cache.map(r => r.name).filter(n => n !== '@everyone');

    try {
      const updated = await prisma.member.upsert({
        where: { discordId: newMember.id },
        update: {
          nickname: newMember.displayName,
          status: hasRoleAfter ? 'OFFICIAL' : 'TRIAL',
          roles: roleNames,
        },
        create: {
          discordId: newMember.id,
          nickname: newMember.displayName,
          ign: newMember.displayName,
          status: hasRoleAfter ? 'OFFICIAL' : 'TRIAL',
          roles: roleNames,
        },
      });

      // Log hành động này vào channel log
      await LoggerService.logAction(
        newMember.client,
        '👤 Member Auto-Updated',
        `Member **${newMember.displayName}** status changed to **${updated.status}** due to role update.`,
        hasRoleAfter ? 0x22c55e : 0xf1f5f9
      );
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  }
}
