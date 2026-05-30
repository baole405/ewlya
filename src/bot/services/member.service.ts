import { Interaction } from 'discord.js';
import { prisma } from '../../database/prisma';

export class MemberService {
  /**
   * Automatically registers or updates a member in the database when they interact.
   */
  static async autoRegister(interaction: Interaction) {
    if (!interaction.user) return;

    try {
      // Check if member already exists
      const existing = await prisma.member.findUnique({
        where: { discordId: interaction.user.id },
      });

      if (existing) {
        // Just update basic profile info, preserve status/role
        await prisma.member.update({
          where: { discordId: interaction.user.id },
          data: {
            nickname: interaction.user.username,
            avatarUrl: interaction.user.displayAvatarURL(),
          },
        });
        return;
      }

      // If new, determine status and role based on guild roles and admin list
      let status = 'TRIAL';
      let dbRole: 'ADMIN' | 'MEMBER' = 'MEMBER';

      const guild = interaction.guild;
      if (guild) {
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
          const hasRole = member.roles.cache.some(r => r.name === 'Dark Stars');
          if (hasRole) {
            status = 'OFFICIAL';
          }
        }
      }

      const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
      if (adminIds.includes(interaction.user.id)) {
        status = 'OFFICIAL';
        dbRole = 'ADMIN';
      }

      await prisma.member.create({
        data: {
          discordId: interaction.user.id,
          nickname: interaction.user.username,
          ign: interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL(),
          status,
          role: dbRole,
        },
      });
    } catch (err) {
      console.error('❌ Failed to auto-register member:', err);
    }
  }
}
