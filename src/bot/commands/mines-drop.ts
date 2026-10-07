import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MinesDropService } from '../services/mines-drop.service';
import { MemberService } from '../services/member.service';
import { prisma } from '../../database/prisma';

export const data = new SlashCommandBuilder()
  .setName('mines-drop')
  .setDescription('Track and manage the Mines Equip Drops event')
  .addSubcommand(sub =>
    sub
      .setName('leaderboard')
      .setDescription('View the live Mines Equip Drops leaderboard and projected prizes')
  )
  .addSubcommand(sub =>
    sub
      .setName('add')
      .setDescription('Add or adjust drop counts for a member (Admin Only)')
      .addUserOption(opt =>
        opt.setName('member').setDescription('Clan member').setRequired(true)
      )
      .addIntegerOption(opt =>
        opt.setName('count').setDescription('Number of drops to add (use negative to deduct)').setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('reason').setDescription('Optional reason / note').setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('set-points')
      .setDescription('Configure reward points for 1st, 2nd, and 3rd place (Admin Only)')
      .addIntegerOption(opt =>
        opt.setName('first').setDescription('Points for 1st place').setRequired(true).setMinValue(0)
      )
      .addIntegerOption(opt =>
        opt.setName('second').setDescription('Points for 2nd place').setRequired(true).setMinValue(0)
      )
      .addIntegerOption(opt =>
        opt.setName('third').setDescription('Points for 3rd place').setRequired(true).setMinValue(0)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('award')
      .setDescription('Finalize event and award points to the active season (Admin Only)')
  )
  .addSubcommand(sub =>
    sub
      .setName('start')
      .setDescription('Start a new Mines Equip Drops event round & deploy announcement (Admin Only)')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Name for the event').setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('reset')
      .setDescription('Close current round and start a new Mines Drops event (Admin Only)')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Name for the new event round').setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const adminIds = (process.env['ADMIN_IDS'] || '').split(',').map(id => id.trim()).filter(Boolean);
  const isAdmin = adminIds.includes(interaction.user.id);

  // Admin guards for management subcommands
  if (['start', 'add', 'set-points', 'award', 'reset'].includes(subcommand) && !isAdmin) {
    return interaction.reply({
      content: '❌ This subcommand is restricted to Administrators only.',
      ephemeral: true,
    });
  }

  // 1. LEADERBOARD
  if (subcommand === 'leaderboard') {
    await interaction.deferReply({ ephemeral: false });
    try {
      const { event, standings, totalDrops, totalParticipants } = await MinesDropService.getLeaderboard();

      const embed = new EmbedBuilder()
        .setTitle(`⛏️ ${event.name} - Leaderboard`)
        .setDescription(
          `**Event Status:** \`${event.status}\`\n` +
          `**Prizes:** 🥇 1st: **${event.firstPoints}** pts | 🥈 2nd: **${event.secondPoints}** pts | 🥉 3rd: **${event.thirdPoints}** pts\n` +
          `**Total Drops Recorded:** \`${totalDrops}\` 💎 | **Participants:** \`${totalParticipants}\`\n\n` +
          `*Admins verify drop screenshots in <#${process.env['MINES_DROPS_CHANNEL_ID'] || '1265850153517060096'}> with ✅ or ⛏️ to count!*`
        )
        .setColor(0xf59e0b)
        .setThumbnail(interaction.guild?.iconURL() || null)
        .setTimestamp();

      if (standings.length === 0) {
        embed.addFields({
          name: '📊 Standings',
          value: 'No equip drops recorded yet. Head into the Mines and post your drops!',
        });
      } else {
        const lines = standings.slice(0, 15).map(entry => {
          let badge = `\`#${entry.rank}\``;
          if (entry.rank === 1) badge = '🥇';
          else if (entry.rank === 2) badge = '🥈';
          else if (entry.rank === 3) badge = '🥉';

          const prizeInfo = entry.projectedPoints > 0 ? ` ➔ **+${entry.projectedPoints} pts**` : '';
          const userTag = entry.discordId ? `<@${entry.discordId}>` : `**${entry.nickname}**`;
          return `${badge} ${userTag} — **${entry.dropCount}** drops${prizeInfo}`;
        });

        embed.addFields({
          name: '🏆 Top Miners',
          value: lines.join('\n'),
        });

        if (standings.length > 15) {
          embed.setFooter({ text: `Showing top 15 of ${standings.length} participants` });
        }
      }

      return await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error fetching mines drop leaderboard:', err);
      return await interaction.editReply('❌ Failed to retrieve the leaderboard.');
    }
  }

  // 2. ADD / ADJUST DROPS
  if (subcommand === 'add') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const targetUser = interaction.options.getUser('member', true);
      const count = interaction.options.getInteger('count', true);
      const reason = interaction.options.getString('reason') || 'Manual adjustment by admin';

      const member = await MemberService.ensureMemberExists(targetUser, interaction.guild);

      const result = await MinesDropService.addManualDrops(member.id, count, interaction.user.id, reason);

      if (!result.success) {
        if (result.reason === 'CANNOT_BE_NEGATIVE') {
          return await interaction.editReply(
            `❌ Cannot deduct drops: Member only has **${result.currentDrops}** drops recorded.`
          );
        }
        return await interaction.editReply('❌ Failed to update drops.');
      }

      const sign = count >= 0 ? `+${count}` : `${count}`;
      return await interaction.editReply(
        `✅ Successfully adjusted drops for <@${targetUser.id}>!\n- Adjustment: **${sign}**\n- New Total: **${result.totalDrops}** drops\n- Note: *${reason}*`
      );
    } catch (err) {
      console.error('Error adding drops manually:', err);
      return await interaction.editReply('❌ An error occurred while adjusting drops.');
    }
  }

  // 3. SET POINTS
  if (subcommand === 'set-points') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const first = interaction.options.getInteger('first', true);
      const second = interaction.options.getInteger('second', true);
      const third = interaction.options.getInteger('third', true);

      const updated = await MinesDropService.setPoints(first, second, third);

      return await interaction.editReply(
        `✅ Updated reward points for **${updated.name}**!\n- 🥇 1st: **${first}** pts\n- 🥈 2nd: **${second}** pts\n- 🥉 3rd: **${third}** pts`
      );
    } catch (err: any) {
      console.error('Error updating points config:', err);
      return await interaction.editReply(`❌ Error: ${err.message || 'Failed to update points.'}`);
    }
  }

  // 4. AWARD (Interactive Confirmation)
  if (subcommand === 'award') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const { event, standings } = await MinesDropService.getLeaderboard();

      if (event.status === 'AWARDED') {
        return await interaction.editReply(
          '⚠️ **This event has already been awarded.** Use `/mines-drop reset` if you wish to start a new round.'
        );
      }

      if (standings.length === 0) {
        return await interaction.editReply('❌ No participants with recorded drops to award.');
      }

      const winners = standings.filter(s => s.rank <= 3 && s.projectedPoints > 0);
      const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

      const seasonNotice = activeSeason
        ? `🏆 **Active Season:** \`${activeSeason.name}\` (Points will be added to this season's scoreboard AND Member total points)`
        : `ℹ️ **Active Season:** None (Points will be added directly to Member total points)`;

      const previewEmbed = new EmbedBuilder()
        .setTitle(`🏆 Confirm Awarding: ${event.name}`)
        .setDescription(
          `Please review the winners and confirm below to officially award points:\n\n` +
          `${seasonNotice}\n\n` +
          `### 🎁 Prizes to be distributed:\n` +
          winners
            .map(w => {
              const medal = w.rank === 1 ? '🥇 1st' : w.rank === 2 ? '🥈 2nd' : '🥉 3rd';
              const userMention = w.discordId ? `<@${w.discordId}>` : `**${w.nickname}**`;
              return `> ${medal}: ${userMention} (${w.dropCount} drops) ➔ **+${w.projectedPoints} pts**`;
            })
            .join('\n') +
          `\n\n*Click **Confirm & Award Points** below to finalize and announce the winners.*`
        )
        .setColor(0xf59e0b)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('mines_award_confirm')
          .setLabel('Confirm & Award Points')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mines_award_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Danger)
      );

      return await interaction.editReply({ embeds: [previewEmbed], components: [row] });
    } catch (err: any) {
      console.error('Error in /mines-drop award preview:', err);
      return await interaction.editReply(`❌ Error: ${err.message || 'Failed to prepare award preview.'}`);
    }
  }

  // 5. START (Start round & deploy announcement)
  if (subcommand === 'start') {
    const minesChannelId = process.env['MINES_DROPS_CHANNEL_ID'] || '1265850153517060096';
    const isMinesChannel = interaction.channelId === minesChannelId;

    await interaction.deferReply({ ephemeral: !isMinesChannel });
    try {
      const name = interaction.options.getString('name') || 'Mines Return Celebration Event';
      const newEvent = await MinesDropService.resetEvent(name);

      const bannerEmbed = new EmbedBuilder()
        .setTitle(`⛏️ ${newEvent.name} — Event Now Active!`)
        .setDescription(
          `**To celebrate the return of mines, the drop event is officially live!**\n\n` +
          `**🎁 Event Prizes:**\n` +
          `🥇 **1st Place:** \`${newEvent.firstPoints} points\`\n` +
          `🥈 **2nd Place:** \`${newEvent.secondPoints} points\`\n` +
          `🥉 **3rd Place:** \`${newEvent.thirdPoints} points\`\n\n` +
          `**📜 Rules:**\n` +
          `• Post your equip drop screenshots in <#${minesChannelId}>!\n` +
          `• Admins will verify your screenshots by reacting with **✅** or **⛏️**.\n` +
          `• Each verified drop adds +1 to your event total!\n\n` +
          `*Well what are you waiting for? Get to mining!*`
        )
        .setColor(0xf59e0b)
        .setThumbnail(interaction.guild?.iconURL() || null)
        .setFooter({ text: 'DarkStar Clan Mines Event' })
        .setTimestamp();

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('mines_view_ldb')
          .setLabel('📊 View Mines Leaderboard')
          .setStyle(ButtonStyle.Primary)
      );

      // If run directly inside the mines-drops channel, reply publicly with the banner
      if (isMinesChannel) {
        return await interaction.editReply({
          embeds: [bannerEmbed],
          components: [buttonRow],
        });
      }

      // If run from another channel, post banner to mines-drops and reply with a clean confirmation
      const minesChan = await interaction.client.channels.fetch(minesChannelId).catch(() => null);
      if (minesChan && minesChan.isTextBased()) {
        await (minesChan as any).send({ embeds: [bannerEmbed], components: [buttonRow] }).catch(() => null);
      }

      return await interaction.editReply({
        content: `✅ Successfully started **${newEvent.name}** and deployed event banner to <#${minesChannelId}>!`,
      });
    } catch (err: any) {
      console.error('Error starting mines drop event:', err);
      return await interaction.editReply(`❌ Failed to start event: ${err.message || 'Unknown error'}`);
    }
  }

  // 6. RESET
  if (subcommand === 'reset') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const name = interaction.options.getString('name') || undefined;
      const newEvent = await MinesDropService.resetEvent(name);

      return await interaction.editReply(
        `🔄 Successfully reset Mines Drops counter! Opened new event: **${newEvent.name}** (Active).\nDefault points: 150 / 100 / 50.`
      );
    } catch (err) {
      console.error('Error resetting event:', err);
      return await interaction.editReply('❌ Failed to reset event.');
    }
  }
}
