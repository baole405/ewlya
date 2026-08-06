import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
import { LoggerService } from './logger.service';

export class SeasonService {
  /**
   * Starts a new monthly season
   */
  static async startSeason(interaction: ChatInputCommandInteraction) {
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    if (activeSeason) {
      return interaction.editReply(
        `❌ **Cannot start a new season.** \`${activeSeason.name}\` is currently active. Please use \`/season close\` first.`,
      );
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const seasonName = `Season ${month}/${year}`;

    try {
      const newSeason = await prisma.season.create({
        data: {
          name: seasonName,
          startDate: now,
          isActive: true,
        },
      });

      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🌱 New Season Started!')
        .setDescription(
          `**${newSeason.name}** is now active. All new points will be logged to this season.`,
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      await LoggerService.logAction(
        interaction.client,
        '🌱 Season Started',
        `Admin **${interaction.user.username}** started **${newSeason.name}**.`,
        0x22c55e,
      );
    } catch (error: any) {
      console.error('Error starting season:', error);
      if (error.code === 'P2002') {
        await interaction.editReply(`❌ A season named **${seasonName}** already exists.`);
      } else {
        await interaction.editReply(`❌ Error: ${error.message}`);
      }
    }
  }

  /**
   * Gets the active season leaderboard and returns an Embed
   */
  static async generateLeaderboard(interaction: ChatInputCommandInteraction) {
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) {
      return interaction.editReply('❌ There is no active season right now.');
    }

    try {
      const embed = await this.getSeasonScoreEmbed(interaction, activeSeason.id, activeSeason.name);
      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Views a specific past season
   */
  static async viewPastSeason(interaction: ChatInputCommandInteraction) {
    const seasonId = interaction.options.getString('name', true);

    try {
      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) {
        return interaction.editReply('❌ Could not find that season in the database.');
      }

      const embed = await this.getSeasonScoreEmbed(interaction, season.id, season.name, true);
      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Error viewing past season:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Helper to generate a score embed for any season
   */
  private static async getSeasonScoreEmbed(
    interaction: ChatInputCommandInteraction,
    seasonId: string,
    seasonName: string,
    isPast: boolean = false,
  ) {
    const submissions = await prisma.submission.groupBy({
      by: ['memberId'],
      where: { seasonId: seasonId },
      _sum: { points: true },
    });

    if (submissions.length === 0) {
      return new EmbedBuilder()
        .setColor(0x38bdf8)
        .setTitle(`${isPast ? '📁' : '🏆'} Scoreboard: ${seasonName}`)
        .setDescription('No points were recorded for this season yet.')
        .setTimestamp();
    }

    const memberIds = submissions.map((s) => s.memberId);
    const members = await prisma.member.findMany({ where: { id: { in: memberIds } } });

    const discordIds = members.map((m) => m.discordId).filter(Boolean) as string[];
    const guildMembers = new Map();
    if (interaction.guild && discordIds.length > 0) {
      try {
        const fetched = await interaction.guild.members.fetch({ user: discordIds });
        fetched.forEach((gm, id) => guildMembers.set(id, gm));
      } catch (e) {
        console.error('Could not fetch some guild members for scoreboard');
      }
    }

    const leaderboardData = submissions
      .map((sub) => {
        const dbMember = members.find((m) => m.id === sub.memberId);
        const gm = dbMember?.discordId ? guildMembers.get(dbMember.discordId) : null;
        const displayName = gm ? gm.displayName : dbMember?.nickname || 'Unknown';

        return {
          nickname: displayName,
          points: sub._sum.points || 0,
        };
      })
      .sort((a, b) => b.points - a.points);

    const totalParticipants = leaderboardData.length;
    const totalPointsSum = leaderboardData.reduce((sum, d) => sum + d.points, 0);
    const topLeader = leaderboardData[0];

    // Top 3 Podium Card Highlight
    let podiumText = '';
    if (topLeader) {
      podiumText += `🥇 **1st Place**: 👑 **${topLeader.nickname}** — \`${topLeader.points} pts\`\n`;
    }
    if (leaderboardData[1]) {
      podiumText += `🥈 **2nd Place**: ⚡ **${leaderboardData[1].nickname}** — \`${leaderboardData[1].points} pts\`\n`;
    }
    if (leaderboardData[2]) {
      podiumText += `🥉 **3rd Place**: 🔥 **${leaderboardData[2].nickname}** — \`${leaderboardData[2].points} pts\`\n`;
    }

    // Contenders Rankings (#4+)
    const remainingList = leaderboardData
      .slice(3)
      .map((data, index) => {
        const rank = index + 4;
        const badge = rank <= 10 ? '🎖️' : '🏅';
        return `\`#${String(rank).padStart(2, '0')}\` ${badge} **${data.nickname}** — \`${data.points} pts\``;
      })
      .join('\n');

    const truncatedRemaining = remainingList.length > 3000
      ? remainingList.substring(0, 3000) + '\n... (and more)'
      : remainingList;

    const descriptionText =
      `✨ **${seasonName.toUpperCase()} ${isPast ? '(ARCHIVED)' : '(LIVE)'}** ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `👑 **TOP WARRIORS PODIUM**\n${podiumText}\n` +
      (truncatedRemaining ? `📊 **RANKINGS & STANDINGS**\n${truncatedRemaining}` : '');

    return new EmbedBuilder()
      .setColor(isPast ? 0x64748b : 0x00f0ff) // Sleek Neon Cyan / Slate
      .setTitle(`🏆 DARKSTAR CLAN — OFFICIAL LEADERBOARD`)
      .setDescription(descriptionText)
      .addFields(
        { name: '👥 Participants', value: `\`${totalParticipants} members\``, inline: true },
        { name: '💎 Total Points', value: `\`${totalPointsSum} pts\``, inline: true },
        { name: '👑 Leader', value: topLeader ? `**${topLeader.nickname}**` : 'N/A', inline: true },
      )
      .setFooter({ text: `⚡ DarkStar Clan Leaderboards • Season Scoreboard` })
      .setTimestamp();
  }

  /**
   * Edits the name of a closed season
   */
  static async editSeasonName(interaction: ChatInputCommandInteraction) {
    const seasonId = interaction.options.getString('target_season', true);
    const newName = interaction.options.getString('new_name', true);

    try {
      const season = await prisma.season.findUnique({ where: { id: seasonId } });
      if (!season) {
        return interaction.editReply('❌ Could not find that season in the database.');
      }

      if (season.isActive) {
        return interaction.editReply(
          '❌ You cannot rename an active season. Please close it first.',
        );
      }

      // Check for name collision
      const existing = await prisma.season.findUnique({ where: { name: newName } });
      if (existing) {
        return interaction.editReply(`❌ A season with the name **${newName}** already exists.`);
      }

      await prisma.season.update({
        where: { id: season.id },
        data: { name: newName },
      });

      await interaction.editReply(
        `✅ Successfully renamed season from **${season.name}** to **${newName}**.`,
      );

      await LoggerService.logAction(
        interaction.client,
        '📝 Season Renamed',
        `Admin **${interaction.user.username}** renamed a closed season from \`${season.name}\` to \`${newName}\`.`,
        0xf59e0b,
      );
    } catch (error: any) {
      console.error('Error editing season name:', error);
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Closes the active season, calculates final points, and posts the results
   */
  static async closeSeason(interaction: ChatInputCommandInteraction) {
    const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
    if (!activeSeason) {
      return interaction.editReply('❌ There is no active season to close.');
    }

    try {
      const embed = await this.getSeasonScoreEmbed(interaction, activeSeason.id, activeSeason.name, false);

      const targetChannelId = process.env['HOF_CHANNEL_ID'] || process.env['TEST_CHANNEL_ID'];
      let postedToHOF = false;

      if (targetChannelId) {
        try {
          const channel = await interaction.client.channels.fetch(targetChannelId);
          if (channel && channel.isTextBased()) {
            await (channel as any).send({
              content: `🎉 The results for **${activeSeason.name}** are in!`,
              embeds: [embed],
            });
            postedToHOF = true;
          }
        } catch (err) {
          console.error(`Failed to post results to channel ${targetChannelId}:`, err);
        }
      }

      await prisma.season.update({
        where: { id: activeSeason.id },
        data: {
          isActive: false,
          endDate: new Date(),
        },
      });

      const adminAnnounceId = process.env['ANNOUCEMENTS_ADMIN_CHANNELS_ID'];
      if (adminAnnounceId) {
        const adminChannel = await interaction.client.channels.fetch(adminAnnounceId);
        if (adminChannel && adminChannel.isTextBased()) {
          const adminRole =
            interaction.guild?.roles.cache.find((r) => r.name === 'Admin') || '@here';
          await (adminChannel as any).send(
            `⚠️ **ATTENTION ADMINS** ${adminRole}\nSeason **${activeSeason.name}** has just been closed. Please remember to manually start the next season using \`/season start\`!`,
          );
        }
      }

      await interaction.editReply(
        `✅ Successfully closed **${activeSeason.name}**!${postedToHOF ? ` Results posted to <#${targetChannelId}>.` : ' (Could not find TEST_CHANNEL_ID to post results).'} Reminder sent to admins.`,
      );

      await LoggerService.logAction(
        interaction.client,
        '🛑 Season Closed',
        `Admin **${interaction.user.username}** closed **${activeSeason.name}**.`,
        0xfacc15,
      );
    } catch (error: any) {
      console.error('Error closing season:', error);
      await interaction.editReply(`❌ Error closing season: ${error.message}`);
    }
  }
}
