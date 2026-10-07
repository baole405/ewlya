import { Interaction } from 'discord.js';
import { prisma } from '../../database/prisma';

export class MemberService {
  /**
   * Ensures a member exists in the database. If not, creates one safely.
   */
  static async ensureMemberExists(user: { id: string; username: string; displayAvatarURL?: () => string }, guild?: any) {
    const existing = await prisma.member.findUnique({
      where: { discordId: user.id },
    });

    if (existing) {
      const avatar = user.displayAvatarURL ? user.displayAvatarURL() : undefined;
      if (avatar && existing.avatarUrl !== avatar) {
        await prisma.member.update({
          where: { discordId: user.id },
          data: { avatarUrl: avatar },
        }).catch(() => {});
      }
      return existing;
    }

    // Determine status and role
    let status = 'TRIAL';
    let dbRole: 'ADMIN' | 'MEMBER' = 'MEMBER';

    if (guild) {
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member) {
        const hasRole = member.roles?.cache?.some((r: any) => r.name === 'Dark Stars');
        if (hasRole) {
          status = 'OFFICIAL';
        }
      }
    }

    const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim());
    if (adminIds.includes(user.id)) {
      status = 'OFFICIAL';
      dbRole = 'ADMIN';
    }

    // Ensure nickname is unique
    let nickname = user.username;
    const nicknameCollision = await prisma.member.findUnique({
      where: { nickname },
    });
    if (nicknameCollision) {
      nickname = `${user.username}_${user.id.slice(-4)}`;
    }

    const avatarUrl = user.displayAvatarURL ? user.displayAvatarURL() : null;

    return await prisma.member.create({
      data: {
        discordId: user.id,
        nickname,
        ign: user.username,
        avatarUrl,
        status,
        role: dbRole,
      },
    });
  }

  /**
   * Automatically registers or updates a member in the database when they interact.
   */
  static async autoRegister(interaction: Interaction) {
    if (!interaction.user) return;

    try {
      await this.ensureMemberExists(interaction.user, interaction.guild);
    } catch (err) {
      console.error('❌ Failed to auto-register member:', err);
    }
  }
}
