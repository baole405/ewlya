import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';

export class PointService {
  /**
   * Core logic to award points to a member
   */
  static async awardPoints(
    client: Client,
    adminId: string,
    adminUsername: string,
    targetMemberId: string,
    points: number,
    reason: string,
    missionText: string,
    targetSeasonId?: string
  ) {
    // Find member
    const member = await prisma.member.findUnique({ where: { id: targetMemberId } });
    if (!member) throw new Error('Member not found in DB.');

    // Find target or active season
    let targetSeason;
    if (targetSeasonId) {
      targetSeason = await prisma.season.findUnique({ where: { id: targetSeasonId } });
      if (!targetSeason) throw new Error('Target season not found.');
    } else {
      targetSeason = await prisma.season.findFirst({ where: { isActive: true } });
      if (!targetSeason) throw new Error('No active season found to log points against.');
    }

    // Transaction: Add points + Create Submission Log
    await prisma.$transaction([
      prisma.member.update({
        where: { id: member.id },
        data: { points: { increment: points } }
      }),
      prisma.submission.create({
        data: {
          memberId: member.id,
          points: points,
          mission: missionText,
          reason: reason,
          verifiedBy: adminId,
          seasonId: targetSeason.id
        }
      })
    ]);

    // Audit Log
    await LoggerService.logAction(
      client,
      '🏆 Points Awarded',
      `Admin **${adminUsername}** awarded **${points}** points to **${member.nickname}**.`,
      0x22c55e,
      [{ name: 'Reason', value: reason }]
    );

    return { member, activeSeason: targetSeason };
  }

  /**
   * Specifically for the manual /season add point command with Admin Alert
   */
  static async grantPointsManual(
    client: Client,
    adminId: string,
    adminUsername: string,
    targetMemberId: string,
    points: number,
    reason: string,
    targetSeasonId?: string
  ) {
    const { member, activeSeason } = await this.awardPoints(
      client,
      adminId,
      adminUsername,
      targetMemberId,
      points,
      reason,
      'Manual Grant',
      targetSeasonId
    );

    // Notify Admin Channel with ALERT style
    const adminChannelId = process.env['ANNOUCEMENTS_ADMIN_CHANNELS_ID'];
    if (adminChannelId) {
      try {
        const channel = await client.channels.fetch(adminChannelId).catch(() => null);
        
        if (channel && channel.isTextBased()) {
          const guild = (channel as any).guild;
          let roleMention = '@mod';
          
          if (guild) {
            // Try to find role by name 'mod' or just use the string
            const modRole = guild.roles.cache.find((r: any) => r.name.toLowerCase() === 'mod');
            if (modRole) roleMention = `<@&${modRole.id}>`;
          }

          const alertEmbed = new EmbedBuilder()
            .setColor(0xef4444) // Red alert color
            .setTitle('🚨 MANUAL POINT GRANT ALERT')
            .setDescription(`Admin **${adminUsername}** manually added **${points}** points for **${member.nickname}** ${member.discordId ? `(<@${member.discordId}>)` : ''} with reason: \`${reason}\`.`)
            .setTimestamp();

          await (channel as any).send({ 
            content: `🔔 ALERT ${roleMention}`,
            embeds: [alertEmbed] 
          }).catch((e: any) => {
            console.error(`❌ Failed to send message to admin channel ${adminChannelId}:`, e);
          });
        } else {
          console.warn(`⚠️ Admin channel ${adminChannelId} not found or not text-based.`);
        }
      } catch (err) {
        console.error('❌ Failed to process admin alert notification:', err);
      }
    }

    return member;
  }
}
