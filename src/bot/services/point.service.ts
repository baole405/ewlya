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
    const isNegative = points < 0;
    const absPoints = Math.abs(points);
    await LoggerService.logAction(
      client,
      isNegative ? '📉 Points Deducted' : '🏆 Points Awarded',
      isNegative
        ? `Admin **${adminUsername}** deducted **${absPoints}** points from **${member.nickname}**.`
        : `Admin **${adminUsername}** awarded **${points}** points to **${member.nickname}**.`,
      isNegative ? 0xef4444 : 0x22c55e,
      [{ name: 'Reason', value: reason }]
    );

    // Points tracking log
    await LoggerService.logPoints(client, {
      memberNickname: member.nickname,
      memberDiscordId: member.discordId || undefined,
      missionText: missionText,
      points: points,
      seasonName: targetSeason.name,
      adminUsername: adminUsername
    }).catch((err) => console.error('Failed to log points:', err));

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

          const isNegative = points < 0;
          const absPoints = Math.abs(points);
          const alertEmbed = new EmbedBuilder()
            .setColor(0xef4444) // Red alert color
            .setTitle(isNegative ? '🚨 MANUAL POINT DEDUCTION ALERT' : '🚨 MANUAL POINT GRANT ALERT')
            .setDescription(
              isNegative
                ? `Admin **${adminUsername}** manually deducted **${absPoints}** points from **${member.nickname}** ${member.discordId ? `(<@${member.discordId}>)` : ''} with reason: \`${reason}\`.`
                : `Admin **${adminUsername}** manually added **${points}** points for **${member.nickname}** ${member.discordId ? `(<@${member.discordId}>)` : ''} with reason: \`${reason}\`.`
            )
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
