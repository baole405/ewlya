import { Interaction } from 'discord.js';
import { prisma } from '../../database/prisma';

export class MemberService {
  /**
   * Automatically registers or updates a member in the database when they interact.
   */
  static async autoRegister(interaction: Interaction) {
    if (!interaction.user) return;

    try {
      await prisma.member.upsert({
        where: { discordId: interaction.user.id },
        update: {
          nickname: interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL(),
        },
        create: {
          discordId: interaction.user.id,
          nickname: interaction.user.username,
          ign: interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL(),
          status: 'OFFICIAL',
        },
      });
    } catch (err) {
      console.error('❌ Failed to auto-register member:', err);
    }
  }
}
